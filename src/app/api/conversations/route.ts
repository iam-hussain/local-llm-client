import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const conversations = await prisma.conversation.findMany({
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      model: true,
      pinned: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    parentId?: string;
  };
  const c = await prisma.conversation.create({
    data: {
      title: body.title ?? "New chat",
      model: body.model ?? null,
      systemPrompt: body.systemPrompt ?? null,
      temperature: body.temperature ?? 0.7,
      parentId: body.parentId ?? null,
    },
  });
  return NextResponse.json({ conversation: c });
}
