import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as { upToMessageId: string; title?: string };
  const source = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cut = source.messages.findIndex((m) => m.id === body.upToMessageId);
  if (cut < 0) return NextResponse.json({ error: "Message not in conversation" }, { status: 400 });
  const keep = source.messages.slice(0, cut + 1);

  const branch = await prisma.conversation.create({
    data: {
      title: body.title ?? `${source.title} (branch)`,
      model: source.model,
      systemPrompt: source.systemPrompt,
      temperature: source.temperature,
      parentId: source.id,
      messages: {
        create: keep.map((m) => ({
          role: m.role,
          content: m.content,
          model: m.model,
          promptTokens: m.promptTokens,
          completionTokens: m.completionTokens,
          totalTokens: m.totalTokens,
          tokensPerSecond: m.tokensPerSecond,
          timeToFirstToken: m.timeToFirstToken,
          generationTime: m.generationTime,
          stopReason: m.stopReason,
        })),
      },
    },
    include: { messages: true },
  });
  return NextResponse.json({ conversation: branch });
}
