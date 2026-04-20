"use client";
import { useCallback, useRef, useState } from "react";

export type StreamingStats = {
  liveTps: number | null;
  ttft: number | null;
  finalTps: number | null;
  finalTTFT: number | null;
  generationTime: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  stopReason: string | null;
};

const initialStats: StreamingStats = {
  liveTps: null,
  ttft: null,
  finalTps: null,
  finalTTFT: null,
  generationTime: null,
  promptTokens: null,
  completionTokens: null,
  totalTokens: null,
  stopReason: null,
};

export type SavedMessage = {
  id: string;
  role: string;
  content: string;
  model: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  tokensPerSecond: number | null;
  timeToFirstToken: number | null;
  generationTime: number | null;
  stopReason: string | null;
  parentMessageId?: string | null;
  createdAt?: string | null;
};

export function useChatStream() {
  const [streaming, setStreaming] = useState(false);
  const [awaitingAssistant, setAwaitingAssistant] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StreamingStats>(initialStats);
  const controllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setStreamText("");
    setStats(initialStats);
    setError(null);
  }, []);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  const send = useCallback(
    async (opts: {
      conversationId: string;
      content: string;
      model: string;
      temperature?: number;
      topP?: number | null;
      topK?: number | null;
      repeatPenalty?: number | null;
      maxTokens?: number | null;
      stop?: string[];
      systemPrompt?: string | null;
      regenerateAssistantId?: string;
      onUserSaved?: (id: string) => void;
      onAssistantSaved?: (msg: SavedMessage) => void;
    }) => {
      reset();
      setStreaming(true);
      setAwaitingAssistant(true);
      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(opts),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`Chat failed: ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const evt = JSON.parse(line);
            if (evt.type === "delta") {
              setStreamText((t) => t + evt.content);
              setStats((s) => ({ ...s, liveTps: evt.liveTps ?? s.liveTps }));
            } else if (evt.type === "first-token") {
              setStats((s) => ({ ...s, ttft: evt.ttft }));
            } else if (evt.type === "user-saved") {
              opts.onUserSaved?.(evt.id);
            } else if (evt.type === "done") {
              setStats((s) => ({
                ...s,
                finalTps: evt.stats?.tokens_per_second ?? s.liveTps,
                finalTTFT: evt.stats?.time_to_first_token ?? s.ttft,
                generationTime: evt.stats?.generation_time ?? null,
                stopReason: evt.stats?.stop_reason ?? null,
                promptTokens: evt.usage?.prompt_tokens ?? null,
                completionTokens: evt.usage?.completion_tokens ?? null,
                totalTokens: evt.usage?.total_tokens ?? null,
              }));
              if (evt.message) opts.onAssistantSaved?.(evt.message as SavedMessage);
              // Swap streaming bubble → persisted bubble in the same React batch.
              setAwaitingAssistant(false);
            } else if (evt.type === "error") {
              setError(evt.message);
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError((e as Error).message);
        }
      } finally {
        setStreaming(false);
        setAwaitingAssistant(false);
        setStreamText("");
        controllerRef.current = null;
      }
    },
    [reset],
  );

  return { streaming, awaitingAssistant, streamText, stats, error, send, stop, reset };
}
