"use client";
import { Gauge, Timer, Zap } from "lucide-react";
import type { StreamingStats } from "@/hooks/use-chat-stream";
import { formatNumber, formatTime } from "@/lib/utils";

export function LiveStats({ stats, streaming }: { stats: StreamingStats; streaming: boolean }) {
  if (!streaming && stats.finalTps == null && stats.liveTps == null) return null;
  const tps = stats.finalTps ?? stats.liveTps;
  const ttft = stats.finalTTFT ?? stats.ttft;

  return (
    <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-1.5 text-[11px] font-mono text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <Zap className={`size-3 ${streaming ? "text-amber-500 animate-pulse" : "text-emerald-500"}`} />
          {formatNumber(tps, 1)} tok/s
        </span>
        <span className="flex items-center gap-1">
          <Timer className="size-3" />
          TTFT {formatTime(ttft)}
        </span>
        {stats.generationTime != null && (
          <span className="flex items-center gap-1">
            <Gauge className="size-3" />
            {formatTime(stats.generationTime)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {stats.promptTokens != null && <span>prompt {stats.promptTokens}</span>}
        {stats.completionTokens != null && <span>out {stats.completionTokens}</span>}
        {stats.totalTokens != null && <span>total {stats.totalTokens}</span>}
        {stats.stopReason && <span>stop: {stats.stopReason}</span>}
      </div>
    </div>
  );
}
