import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ conversation });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as Partial<{
    title: string;
    model: string;
    systemPrompt: string | null;
    temperature: number;
    topP: number | null;
    topK: number | null;
    repeatPenalty: number | null;
    maxTokens: number | null;
    stopSequences: string[];
    pinned: boolean;
  }>;
  const c = await prisma.conversation.update({ where: { id }, data: body });
  return NextResponse.json({ conversation: c });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
