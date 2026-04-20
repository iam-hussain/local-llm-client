import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const target = await prisma.message.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.role !== "assistant") return NextResponse.json({ error: "Only assistant versions" }, { status: 400 });

  // Mark all siblings inactive, then this one active. Also drop any messages
  // after the previously-active sibling — they were a continuation of that version.
  const prevActive = await prisma.message.findFirst({
    where: {
      conversationId: target.conversationId,
      role: "assistant",
      parentMessageId: target.parentMessageId,
      activeVersion: true,
    },
  });
  if (prevActive && prevActive.id !== target.id) {
    await prisma.message.deleteMany({
      where: { conversationId: target.conversationId, createdAt: { gt: prevActive.createdAt } },
    });
  }

  await prisma.message.updateMany({
    where: {
      conversationId: target.conversationId,
      role: "assistant",
      parentMessageId: target.parentMessageId,
    },
    data: { activeVersion: false },
  });
  await prisma.message.update({ where: { id }, data: { activeVersion: true } });

  return NextResponse.json({ ok: true });
}
