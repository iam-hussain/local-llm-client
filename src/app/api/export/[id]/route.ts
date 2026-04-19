import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!c) return new Response("Not found", { status: 404 });

  const lines: string[] = [];
  lines.push(`# ${c.title}`, "");
  lines.push(`_Model: ${c.model ?? "—"} · Temperature: ${c.temperature} · Created: ${c.createdAt.toISOString()}_`, "");
  if (c.systemPrompt) lines.push(`> **System:** ${c.systemPrompt}`, "");
  for (const m of c.messages) {
    lines.push(`## ${m.role === "user" ? "🧑 User" : "🤖 Assistant"}`);
    if (m.role === "assistant" && m.tokensPerSecond != null) {
      lines.push(
        `_${m.tokensPerSecond.toFixed(1)} tok/s · TTFT ${m.timeToFirstToken?.toFixed(2) ?? "?"}s · ${m.totalTokens ?? "?"} tokens · ${m.stopReason ?? "—"}_`,
      );
    }
    lines.push("", m.content, "");
  }
  const md = lines.join("\n");
  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${c.title.replace(/[^a-z0-9-_]+/gi, "_")}.md"`,
    },
  });
}
