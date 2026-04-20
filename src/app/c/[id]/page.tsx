import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ChatView, type Conversation } from "@/components/chat-view";
import type { MessageView } from "@/components/message-bubble";

export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!c) notFound();

  const initial: Conversation = {
    id: c.id,
    title: c.title,
    model: c.model,
    systemPrompt: c.systemPrompt,
    temperature: c.temperature,
    topP: c.topP,
    topK: c.topK,
    repeatPenalty: c.repeatPenalty,
    maxTokens: c.maxTokens,
    stopSequences: c.stopSequences,
    messages: c.messages.map<MessageView>((m) => ({
      id: m.id,
      role: m.role as MessageView["role"],
      content: m.content,
      model: m.model,
      promptTokens: m.promptTokens,
      completionTokens: m.completionTokens,
      totalTokens: m.totalTokens,
      tokensPerSecond: m.tokensPerSecond,
      timeToFirstToken: m.timeToFirstToken,
      generationTime: m.generationTime,
      stopReason: m.stopReason,
      starred: m.starred,
      parentMessageId: m.parentMessageId,
      activeVersion: m.activeVersion,
      createdAt: m.createdAt.toISOString(),
    })),
  };
  return <ChatView initial={initial} />;
}
