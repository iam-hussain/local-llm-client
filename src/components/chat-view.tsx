"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChatComposer } from "@/components/chat-composer";
import { ContextMeter } from "@/components/context-meter";
import { LiveStats } from "@/components/live-stats";
import { MessageBubble, type MessageView } from "@/components/message-bubble";
import { ModelPicker, useModels } from "@/components/model-picker";
import { PresetPicker } from "@/components/preset-picker";
import { SettingsSheet } from "@/components/settings-sheet";
import { useChatStream, type SavedMessage } from "@/hooks/use-chat-stream";
import { formatNumber } from "@/lib/utils";

export type Conversation = {
  id: string;
  title: string;
  model: string | null;
  systemPrompt: string | null;
  temperature: number;
  topP: number | null;
  topK: number | null;
  repeatPenalty: number | null;
  maxTokens: number | null;
  stopSequences: string[];
  messages: MessageView[];
};

function savedToView(m: SavedMessage): MessageView {
  return {
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
    parentMessageId: m.parentMessageId ?? null,
    activeVersion: true,
    createdAt: m.createdAt ?? new Date().toISOString(),
  };
}

export function ChatView({ initial }: { initial: Conversation }) {
  const router = useRouter();
  const [conv, setConv] = useState(initial);
  const [model, setModel] = useState<string | undefined>(initial.model ?? undefined);
  const { streaming, awaitingAssistant, streamText, stats, error, send, stop } = useChatStream();
  const { models } = useModels();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (model) return;
    const first =
      models.find((m) => m.state === "loaded" && (m.type === "llm" || m.type === "vlm")) ??
      models.find((m) => m.type === "llm" || m.type === "vlm");
    if (first) setModel(first.id);
  }, [model, models]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conv.messages.length, streamText]);

  const refreshConv = useCallback(async () => {
    const r = await fetch(`/api/conversations/${conv.id}`, { cache: "no-store" });
    const d = await r.json();
    if (d.conversation) {
      setConv((c) => ({
        ...c,
        ...d.conversation,
        messages: d.conversation.messages.map((m: MessageView & { createdAt: string }) => ({
          ...m,
          createdAt: typeof m.createdAt === "string" ? m.createdAt : new Date(m.createdAt).toISOString(),
        })),
      }));
    }
  }, [conv.id]);

  // Group assistant siblings (same parentMessageId) to render only active one with arrows.
  const visibleMessages = useMemo(() => {
    const grouped = new Map<string, MessageView[]>();
    const userMessages: MessageView[] = [];
    const assistantsByParent = new Map<string, MessageView[]>();
    for (const m of conv.messages) {
      if (m.role === "user" || !m.parentMessageId) {
        if (m.role === "user") userMessages.push(m);
      }
      if (m.role === "assistant") {
        const key = m.parentMessageId ?? `__orphan_${m.id}`;
        const arr = assistantsByParent.get(key) ?? [];
        arr.push(m);
        assistantsByParent.set(key, arr);
      }
    }
    for (const arr of assistantsByParent.values()) {
      arr.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
    }

    const result: Array<MessageView & { versionIndex?: number; versionCount?: number; siblings?: MessageView[] }> = [];
    const seenAssistantParents = new Set<string>();
    for (const m of conv.messages) {
      if (m.role === "user") {
        result.push(m);
        continue;
      }
      if (m.role === "assistant") {
        const key = m.parentMessageId ?? `__orphan_${m.id}`;
        if (seenAssistantParents.has(key)) continue;
        seenAssistantParents.add(key);
        const siblings = assistantsByParent.get(key) ?? [m];
        const active = siblings.find((s) => s.activeVersion) ?? siblings[siblings.length - 1];
        const idx = siblings.findIndex((s) => s.id === active.id);
        result.push({
          ...active,
          versionIndex: idx + 1,
          versionCount: siblings.length,
          siblings,
        });
      }
    }
    void userMessages;
    void grouped;
    return result;
  }, [conv.messages]);

  const appendUser = useCallback((content: string, tempId: string) => {
    setConv((c) => ({
      ...c,
      messages: [
        ...c.messages,
        {
          id: tempId,
          role: "user",
          content,
          activeVersion: true,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  }, []);

  const replaceUserId = useCallback((tempId: string, realId: string) => {
    setConv((c) => ({
      ...c,
      messages: c.messages.map((m) => (m.id === tempId ? { ...m, id: realId } : m)),
    }));
  }, []);

  const appendAssistant = useCallback((msg: SavedMessage) => {
    setConv((c) => ({ ...c, messages: [...c.messages, savedToView(msg)] }));
  }, []);

  const handleSend = async (content: string) => {
    if (!model) {
      toast.error("Load a model first (Models page).");
      return;
    }
    const tempId = `temp-${Date.now()}`;
    appendUser(content, tempId);
    await send({
      conversationId: conv.id,
      content,
      model,
      temperature: conv.temperature,
      topP: conv.topP,
      topK: conv.topK,
      repeatPenalty: conv.repeatPenalty,
      maxTokens: conv.maxTokens,
      stop: conv.stopSequences,
      systemPrompt: conv.systemPrompt,
      onUserSaved: (realId) => replaceUserId(tempId, realId),
      onAssistantSaved: appendAssistant,
    });
    // Reconcile any server-side version bookkeeping.
    refreshConv();
  };

  const regenerate = async (assistantId: string) => {
    if (!model) return;
    // Optimistically drop everything AFTER the regenerated message so the UI
    // stays in sync with the server (server marks old as inactive, deletes trailing).
    setConv((c) => {
      const idx = c.messages.findIndex((m) => m.id === assistantId);
      if (idx < 0) return c;
      const keep = c.messages.slice(0, idx + 1).map((m) =>
        m.id === assistantId ? { ...m, activeVersion: false } : m,
      );
      return { ...c, messages: keep };
    });
    await send({
      conversationId: conv.id,
      content: "",
      model,
      temperature: conv.temperature,
      topP: conv.topP,
      topK: conv.topK,
      repeatPenalty: conv.repeatPenalty,
      maxTokens: conv.maxTokens,
      stop: conv.stopSequences,
      systemPrompt: conv.systemPrompt,
      regenerateAssistantId: assistantId,
      onAssistantSaved: appendAssistant,
    });
    refreshConv();
  };

  const switchVersion = async (versionId: string) => {
    await fetch(`/api/messages/${versionId}/activate`, { method: "POST" });
    await refreshConv();
  };

  const star = async (id: string, starred: boolean) => {
    setConv((c) => ({
      ...c,
      messages: c.messages.map((m) => (m.id === id ? { ...m, starred: !starred } : m)),
    }));
    await fetch(`/api/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starred: !starred }),
    });
  };

  const remove = async (id: string) => {
    await fetch(`/api/messages/${id}`, { method: "DELETE" });
    toast.success("Message deleted");
    refreshConv();
  };

  const branch = async (messageId: string) => {
    const r = await fetch(`/api/conversations/${conv.id}/branch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upToMessageId: messageId }),
    });
    const d = await r.json();
    if (d.conversation?.id) {
      toast.success("Branched");
      router.push(`/c/${d.conversation.id}`);
    }
  };

  const exportMd = () => {
    window.open(`/api/export/${conv.id}`, "_blank");
  };

  const totals = useMemo(() => {
    const prompt = conv.messages.reduce((a, m) => a + (m.promptTokens ?? 0), 0);
    const out = conv.messages.reduce((a, m) => a + (m.completionTokens ?? 0), 0);
    // Best estimate of current in-flight context: last assistant's totalTokens.
    const lastAssistant = [...conv.messages].reverse().find((m) => m.role === "assistant" && m.totalTokens != null);
    const currentContext = lastAssistant?.totalTokens ?? prompt + out;
    return { prompt, out, total: prompt + out, currentContext };
  }, [conv.messages]);

  const activeModelInfo = model ? models.find((m) => m.id === model) : undefined;
  const maxContext = activeModelInfo?.max_context_length ?? null;

  return (
    <div className="flex h-full flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{conv.title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground font-mono">
            <span>{formatNumber(totals.total, 0)} tokens</span>
            <span>·</span>
            <span>{conv.messages.filter((m) => m.activeVersion !== false).length} messages</span>
            <span>·</span>
            <span>T={conv.temperature.toFixed(2)}</span>
            {maxContext && (
              <>
                <span>·</span>
                <ContextMeter used={totals.currentContext} max={maxContext} />
              </>
            )}
          </div>
        </div>
        <ModelPicker value={model} onChange={setModel} />
        <SettingsSheet
          conversationId={conv.id}
          initial={{
            systemPrompt: conv.systemPrompt,
            temperature: conv.temperature,
            topP: conv.topP,
            topK: conv.topK,
            repeatPenalty: conv.repeatPenalty,
            maxTokens: conv.maxTokens,
            stopSequences: conv.stopSequences,
          }}
          onSaved={(patch) => setConv((c) => ({ ...c, ...patch }))}
        />
        <Button variant="outline" size="sm" onClick={exportMd} className="gap-1.5">
          <Download className="size-3.5" />
          Export
        </Button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {visibleMessages.length === 0 && !awaitingAssistant && (
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Sparkles className="size-6 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Start chatting with your local model</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Pick a preset to seed a system prompt, or just start typing. Nothing leaves your machine.
            </p>
            <div className="pt-2">
              <PresetPicker
                value={conv.systemPrompt}
                onChange={async (p) => {
                  setConv((c) => ({ ...c, systemPrompt: p }));
                  await fetch(`/api/conversations/${conv.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ systemPrompt: p }),
                  });
                }}
              />
            </div>
            <div className="flex flex-col gap-1 text-[11px] text-muted-foreground font-mono">
              <span>⌘K semantic search · ⌘⇧J new chat · ⌘⇧L focus input · ⌘/ theme</span>
            </div>
          </div>
        )}

        <div className="divide-y divide-border/60">
          {visibleMessages.map((m) => {
            const siblings = (m as MessageView & { siblings?: MessageView[] }).siblings;
            const idx = (m as { versionIndex?: number }).versionIndex ?? 1;
            const count = (m as { versionCount?: number }).versionCount ?? 1;
            const prevId = siblings?.[idx - 2]?.id;
            const nextId = siblings?.[idx]?.id;
            return (
              <MessageBubble
                key={m.id}
                message={m}
                versionIndex={count > 1 ? idx : undefined}
                versionCount={count > 1 ? count : undefined}
                onPrevVersion={prevId ? () => switchVersion(prevId) : undefined}
                onNextVersion={nextId ? () => switchVersion(nextId) : undefined}
                onStar={() => star(m.id, !!m.starred)}
                onDelete={() => remove(m.id)}
                onRegenerate={m.role === "assistant" ? () => regenerate(m.id) : undefined}
                onBranch={() => branch(m.id)}
              />
            );
          })}
          {awaitingAssistant && (
            <MessageBubble
              message={{
                id: "__streaming__",
                role: "assistant",
                content: streamText,
                streaming: true,
                model: model ?? null,
              }}
            />
          )}
        </div>

        {error && (
          <div className="mx-auto my-4 max-w-2xl rounded-md border border-destructive/40 bg-destructive/5 px-4 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pt-2">
        <LiveStats stats={stats} streaming={streaming} />
      </div>
      <ChatComposer onSend={handleSend} onStop={stop} streaming={streaming} />
    </div>
  );
}
