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
  await prisma.message.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
