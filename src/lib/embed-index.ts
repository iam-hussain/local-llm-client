import { prisma } from "@/lib/prisma";
import { embed, listModels, packVector } from "@/lib/lm-studio";

let cachedEmbedModel: { id: string; expires: number } | null = null;

async function getEmbedModel(): Promise<string | null> {
  const now = Date.now();
  if (cachedEmbedModel && cachedEmbedModel.expires > now) return cachedEmbedModel.id;
  try {
    const models = await listModels();
    const match = models.find((m) => m.type === "embeddings");
    if (!match) return null;
    cachedEmbedModel = { id: match.id, expires: now + 60_000 };
    return match.id;
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget embedding index for a single message.
 * Silently no-ops if no embeddings model is loaded or indexing fails —
 * indexing is a best-effort enrichment, never a blocker for chat.
 */
export function indexMessageInBackground(messageId: string, conversationId: string, content: string) {
  queueMicrotask(async () => {
    try {
      if (!content.trim()) return;
      const existing = await prisma.embedding.findUnique({ where: { messageId } });
      if (existing) return;
      const model = await getEmbedModel();
      if (!model) return;
      const v = await embed(content.slice(0, 4000), model);
      await prisma.embedding.create({
        data: {
          messageId,
          conversationId,
          text: content.slice(0, 400),
          vector: packVector(v),
          model,
        },
      });
    } catch {
      /* swallow */
    }
  });
}
