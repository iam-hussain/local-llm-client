import { prisma } from "@/lib/prisma";
import { streamChat, type ChatMessage } from "@/lib/lm-studio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = {
  conversationId: string;
  content: string;
  model: string;
  temperature?: number;
  systemPrompt?: string | null;
  regenerateAssistantId?: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const conv = await prisma.conversation.findUnique({
    where: { id: body.conversationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conv) return new Response("Conversation not found", { status: 404 });

  let userMessage = null as null | { id: string };
  if (body.regenerateAssistantId) {
    // Drop the old assistant message (and any messages after it) before regenerating.
    const target = conv.messages.find((m) => m.id === body.regenerateAssistantId);
    if (target) {
      await prisma.message.deleteMany({
        where: { conversationId: conv.id, createdAt: { gte: target.createdAt } },
      });
    }
  } else {
    userMessage = await prisma.message.create({
      data: { conversationId: conv.id, role: "user", content: body.content },
      select: { id: true },
    });
  }

  const fresh = await prisma.message.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: "asc" },
  });

  const systemPrompt = body.systemPrompt ?? conv.systemPrompt ?? null;
  const messages: ChatMessage[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  for (const m of fresh) messages.push({ role: m.role as ChatMessage["role"], content: m.content });

  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, obj: unknown) =>
    controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));

  const stream = new ReadableStream({
    async start(controller) {
      const started = Date.now();
      let firstTokenAt: number | null = null;
      let content = "";
      let completionTokens = 0;
      let finalUsage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined;
      let finalStats: { tokens_per_second: number; time_to_first_token: number; generation_time: number; stop_reason: string } | undefined;
      let modelId = body.model;

      if (userMessage) send(controller, { type: "user-saved", id: userMessage.id });

      try {
        for await (const chunk of streamChat({
          model: body.model,
          messages,
          temperature: body.temperature ?? conv.temperature,
        })) {
          if (chunk.type === "delta") {
            if (firstTokenAt == null) {
              firstTokenAt = Date.now();
              send(controller, { type: "first-token", ttft: (firstTokenAt - started) / 1000 });
            }
            content += chunk.content;
            completionTokens += 1; // rough live counter; final count arrives with usage
            const elapsed = (Date.now() - (firstTokenAt ?? started)) / 1000;
            const liveTps = elapsed > 0 ? completionTokens / elapsed : 0;
            send(controller, { type: "delta", content: chunk.content, liveTps });
          } else if (chunk.type === "done") {
            finalUsage = chunk.usage;
            finalStats = chunk.stats;
            if (chunk.model) modelId = chunk.model;
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "stream error";
        send(controller, { type: "error", message: msg });
        controller.close();
        return;
      }

      const saved = await prisma.message.create({
        data: {
          conversationId: conv.id,
          role: "assistant",
          content,
          model: modelId,
          promptTokens: finalUsage?.prompt_tokens ?? null,
          completionTokens: finalUsage?.completion_tokens ?? null,
          totalTokens: finalUsage?.total_tokens ?? null,
          tokensPerSecond: finalStats?.tokens_per_second ?? null,
          timeToFirstToken: finalStats?.time_to_first_token ?? null,
          generationTime: finalStats?.generation_time ?? null,
          stopReason: finalStats?.stop_reason ?? null,
        },
      });

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

      send(controller, {
        type: "done",
        message: saved,
        usage: finalUsage,
        stats: finalStats,
      });
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
