import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as Partial<{ starred: boolean; content: string }>;
  const m = await prisma.message.update({ where: { id }, data: body });
  return NextResponse.json({ message: m });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const target = await prisma.message.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ ok: true });

  // If deleting a user message, cascade to its immediate assistant reply(ies)
  // so we never leave an answer floating without the question it answered.
  if (target.role === "user") {
    const nextAssistant = await prisma.message.findFirst({
      where: {
        conversationId: target.conversationId,
        role: "assistant",
        createdAt: { gt: target.createdAt },
      },
      orderBy: { createdAt: "asc" },
    });
    if (nextAssistant) {
      await prisma.message.deleteMany({
        where: { conversationId: target.conversationId, parentMessageId: target.id },
      });
      await prisma.message.delete({ where: { id: nextAssistant.id } }).catch(() => null);
    }
  }
  await prisma.message.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
