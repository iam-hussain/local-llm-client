import { prisma } from "@/lib/prisma";
import { streamChat, type ChatMessage } from "@/lib/lm-studio";
import { indexMessageInBackground } from "@/lib/embed-index";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = {
  conversationId: string;
  content: string;
  model: string;
  temperature?: number;
  topP?: number | null;
  topK?: number | null;
  repeatPenalty?: number | null;
  maxTokens?: number | null;
  stop?: string[];
  systemPrompt?: string | null;
  regenerateAssistantId?: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const conv = await prisma.conversation.findUnique({
    where: { id: body.conversationId },
    include: { messages: { where: { activeVersion: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!conv) return new Response("Conversation not found", { status: 404 });

  let userMessage: { id: string } | null = null;
  let regenParent: string | null = null;

  if (body.regenerateAssistantId) {
    const target = conv.messages.find((m) => m.id === body.regenerateAssistantId);
    if (target) {
      // Drop anything AFTER this assistant (those are stale continuations).
      await prisma.message.deleteMany({
        where: { conversationId: conv.id, createdAt: { gt: target.createdAt } },
      });
      // Mark this assistant + its active siblings inactive so the new one becomes the chosen version.
      await prisma.message.updateMany({
        where: {
          conversationId: conv.id,
          role: "assistant",
          parentMessageId: target.parentMessageId,
          activeVersion: true,
        },
        data: { activeVersion: false },
      });
      regenParent = target.parentMessageId ?? null;
    }
  } else {
    userMessage = await prisma.message.create({
      data: { conversationId: conv.id, role: "user", content: body.content },
      select: { id: true },
    });
    indexMessageInBackground(userMessage.id, conv.id, body.content);
  }

  const fresh = await prisma.message.findMany({
    where: { conversationId: conv.id, activeVersion: true },
    orderBy: { createdAt: "asc" },
  });

  const systemPrompt = body.systemPrompt ?? conv.systemPrompt ?? null;
  const messages: ChatMessage[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  for (const m of fresh) messages.push({ role: m.role as ChatMessage["role"], content: m.content });

  // The parent user message this assistant reply belongs to.
  const parentUserId =
    regenParent ??
    [...fresh].reverse().find((m) => m.role === "user")?.id ??
    null;

  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, obj: unknown) => {
    try {
      controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
    } catch {
      /* stream already closed */
    }
  };

  const abortController = new AbortController();
  req.signal.addEventListener("abort", () => abortController.abort(), { once: true });

  const stream = new ReadableStream({
    async start(controller) {
      const started = Date.now();
      let firstTokenAt: number | null = null;
      let content = "";
      let liveCompletionTokens = 0;
      let finalUsage:
        | { prompt_tokens: number; completion_tokens: number; total_tokens: number }
        | undefined;
      let finalStats:
        | { tokens_per_second: number; time_to_first_token: number; generation_time: number; stop_reason: string }
        | undefined;
      let modelId = body.model;
      let aborted = false;
      let errorMsg: string | null = null;

      if (userMessage) send(controller, { type: "user-saved", id: userMessage.id });

      try {
        for await (const chunk of streamChat({
          model: body.model,
          messages,
          temperature: body.temperature ?? conv.temperature,
          top_p: body.topP ?? conv.topP,
          top_k: body.topK ?? conv.topK,
          repeat_penalty: body.repeatPenalty ?? conv.repeatPenalty,
          max_tokens: body.maxTokens ?? conv.maxTokens ?? -1,
          stop: body.stop ?? conv.stopSequences,
          signal: abortController.signal,
        })) {
          if (chunk.type === "delta") {
            if (firstTokenAt == null) {
              firstTokenAt = Date.now();
              send(controller, { type: "first-token", ttft: (firstTokenAt - started) / 1000 });
            }
            content += chunk.content;
            liveCompletionTokens += 1;
            const elapsed = (Date.now() - (firstTokenAt ?? started)) / 1000;
            const liveTps = elapsed > 0 ? liveCompletionTokens / elapsed : 0;
            send(controller, { type: "delta", content: chunk.content, liveTps });
          } else if (chunk.type === "done") {
            finalUsage = chunk.usage;
            finalStats = chunk.stats;
            if (chunk.model) modelId = chunk.model;
          }
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          aborted = true;
        } else {
          errorMsg = e instanceof Error ? e.message : "stream error";
        }
      }

      // Save whatever we have — including partial content on abort.
      let saved: { id: string } | null = null;
      if (content.length > 0 || finalStats) {
        const stopReasonValue = aborted ? "aborted" : (finalStats?.stop_reason ?? (errorMsg ? "error" : null));
        const m = await prisma.message.create({
          data: {
            conversationId: conv.id,
            role: "assistant",
            content,
            model: modelId,
            parentMessageId: parentUserId,
            promptTokens: finalUsage?.prompt_tokens ?? null,
            completionTokens: finalUsage?.completion_tokens ?? liveCompletionTokens,
            totalTokens: finalUsage?.total_tokens ?? null,
            tokensPerSecond: finalStats?.tokens_per_second ?? null,
            timeToFirstToken: finalStats?.time_to_first_token ?? null,
            generationTime: finalStats?.generation_time ?? null,
            stopReason: stopReasonValue,
          },
        });
        saved = { id: m.id };
        indexMessageInBackground(m.id, conv.id, content);

        await prisma.conversation.update({
          where: { id: conv.id },
          data: {
            model: modelId,
            updatedAt: new Date(),
            title:
              conv.title === "New chat" && body.content
                ? body.content.slice(0, 60).replace(/\s+/g, " ").trim()
                : conv.title,
          },
        });

        send(controller, { type: "done", message: { ...m }, usage: finalUsage, stats: finalStats });
      } else if (errorMsg) {
        send(controller, { type: "error", message: errorMsg });
      }
      void saved;

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
