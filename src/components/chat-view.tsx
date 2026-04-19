"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatComposer } from "@/components/chat-composer";
import { LiveStats } from "@/components/live-stats";
import { MessageBubble, type MessageView } from "@/components/message-bubble";
import { ModelPicker } from "@/components/model-picker";
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
  };
}

export function ChatView({ initial }: { initial: Conversation }) {
  const router = useRouter();
  const [conv, setConv] = useState(initial);
  const [model, setModel] = useState<string | undefined>(initial.model ?? undefined);
  const { streaming, awaitingAssistant, streamText, stats, error, send, stop } = useChatStream();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (model) return;
    (async () => {
      const r = await fetch("/api/models", { cache: "no-store" });
      const d = await r.json();
      const first =
        d.models?.find((m: { state: string; type: string }) => m.state === "loaded" && (m.type === "llm" || m.type === "vlm")) ??
        d.models?.find((m: { type: string }) => m.type === "llm" || m.type === "vlm");
      if (first) setModel(first.id);
    })();
  }, [model]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conv.messages.length, streamText]);

  const appendUser = useCallback((content: string, tempId: string) => {
    setConv((c) => ({ ...c, messages: [...c.messages, { id: tempId, role: "user", content }] }));
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
      alert("Load a model first (Models page).");
      return;
    }
    const tempId = `temp-${Date.now()}`;
    appendUser(content, tempId);
    await send({
      conversationId: conv.id,
      content,
      model,
      temperature: conv.temperature,
      systemPrompt: conv.systemPrompt,
      onUserSaved: (realId) => replaceUserId(tempId, realId),
      onAssistantSaved: appendAssistant,
    });
  };

  const regenerate = async (assistantId: string) => {
    if (!model) return;
    // Mirror server-side delete: drop the old assistant message (and anything after).
    setConv((c) => {
      const idx = c.messages.findIndex((m) => m.id === assistantId);
      return idx < 0 ? c : { ...c, messages: c.messages.slice(0, idx) };
    });
    await send({
      conversationId: conv.id,
      content: "",
      model,
      temperature: conv.temperature,
      systemPrompt: conv.systemPrompt,
      regenerateAssistantId: assistantId,
      onAssistantSaved: appendAssistant,
    });
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
    setConv((c) => ({ ...c, messages: c.messages.filter((m) => m.id !== id) }));
    await fetch(`/api/messages/${id}`, { method: "DELETE" });
  };

  const branch = async (messageId: string) => {
    const r = await fetch(`/api/conversations/${conv.id}/branch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upToMessageId: messageId }),
    });
    const d = await r.json();
    if (d.conversation?.id) router.push(`/c/${d.conversation.id}`);
  };

  const exportMd = () => {
    window.open(`/api/export/${conv.id}`, "_blank");
  };

  const totals = useMemo(() => {
    const prompt = conv.messages.reduce((a, m) => a + (m.promptTokens ?? 0), 0);
    const out = conv.messages.reduce((a, m) => a + (m.completionTokens ?? 0), 0);
    return { prompt, out, total: prompt + out };
  }, [conv.messages]);

  return (
    <div className="flex h-dvh flex-1 flex-col">
      <header className="flex items-center gap-2 border-b px-4 py-2">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{conv.title}</h1>
          <p className="text-[11px] text-muted-foreground font-mono">
            {formatNumber(totals.total, 0)} tokens · {conv.messages.length} messages · T={conv.temperature.toFixed(2)}
          </p>
        </div>
        <ModelPicker value={model} onChange={setModel} />
        <SettingsSheet
          conversationId={conv.id}
          systemPrompt={conv.systemPrompt}
          temperature={conv.temperature}
          onSaved={(patch) =>
            setConv((c) => ({
              ...c,
              systemPrompt: patch.systemPrompt ?? c.systemPrompt,
              temperature: patch.temperature ?? c.temperature,
            }))
          }
        />
        <Button variant="outline" size="sm" onClick={exportMd} className="gap-1.5">
          <Download className="size-3.5" />
          Export
        </Button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {conv.messages.length === 0 && !awaitingAssistant && (
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
          </div>
        )}

        <div className="divide-y divide-border/60">
          {conv.messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              onStar={() => star(m.id, !!m.starred)}
              onDelete={() => remove(m.id)}
              onRegenerate={m.role === "assistant" ? () => regenerate(m.id) : undefined}
              onBranch={() => branch(m.id)}
            />
          ))}
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
