import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embed, cosine, packVector, unpackVector, listModels } from "@/lib/lm-studio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function pickEmbedModel(): Promise<string | null> {
  try {
    const models = await listModels();
    const emb = models.find((m) => m.type === "embeddings");
    return emb?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const { query, limit = 10 } = (await req.json()) as { query: string; limit?: number };
  if (!query?.trim()) return NextResponse.json({ results: [] });

  const embedModel = await pickEmbedModel();
  if (!embedModel) {
    return NextResponse.json(
      { error: "No embedding model loaded. Load a text-embedding-* model in LM Studio." },
      { status: 400 },
    );
  }

  const qVec = await embed(query, embedModel);

  const indexed = await prisma.embedding.findMany({ take: 5000 });
  const ranked = indexed
    .map((e) => ({ e, score: cosine(qVec, unpackVector(e.vector)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const messages = await prisma.message.findMany({
    where: { id: { in: ranked.map((r) => r.e.messageId!).filter(Boolean) } },
    include: { conversation: { select: { id: true, title: true } } },
  });
  const byId = new Map(messages.map((m) => [m.id, m]));
  const results = ranked
    .map((r) => {
      const m = r.e.messageId ? byId.get(r.e.messageId) : null;
      if (!m) return null;
      return {
        score: r.score,
        messageId: m.id,
        role: m.role,
        snippet: m.content.slice(0, 400),
        conversation: m.conversation,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ results });
}

export async function PUT() {
  // Index every message that doesn't have an embedding yet.
  const embedModel = await pickEmbedModel();
  if (!embedModel) {
    return NextResponse.json(
      { error: "No embedding model loaded. Load a text-embedding-* model in LM Studio." },
      { status: 400 },
    );
  }
  const existing = await prisma.embedding.findMany({ select: { messageId: true } });
  const have = new Set(existing.map((e) => e.messageId).filter(Boolean) as string[]);
  const todo = await prisma.message.findMany({
    where: { id: { notIn: Array.from(have) }, content: { not: "" } },
    take: 200,
    orderBy: { createdAt: "desc" },
  });
  let indexed = 0;
  for (const m of todo) {
    try {
      const v = await embed(m.content.slice(0, 4000), embedModel);
      await prisma.embedding.create({
        data: {
          messageId: m.id,
          conversationId: m.conversationId,
          text: m.content.slice(0, 400),
          vector: packVector(v),
          model: embedModel,
        },
      });
      indexed++;
    } catch {
      /* skip */
    }
  }
  return NextResponse.json({ indexed, pending: Math.max(0, todo.length - indexed) });
}
