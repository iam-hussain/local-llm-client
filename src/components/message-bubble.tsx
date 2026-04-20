"use client";
import { useState } from "react";
import { Bot, ChevronLeft, ChevronRight, Copy, GitBranch, RefreshCw, Star, Trash2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber, formatTime } from "@/lib/utils";

export type MessageView = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  tokensPerSecond?: number | null;
  timeToFirstToken?: number | null;
  generationTime?: number | null;
  stopReason?: string | null;
  starred?: boolean;
  parentMessageId?: string | null;
  activeVersion?: boolean;
  createdAt?: string | null;
  streaming?: boolean;
};

export function MessageBubble({
  message,
  onStar,
  onDelete,
  onRegenerate,
  onBranch,
  versionIndex,
  versionCount,
  onPrevVersion,
  onNextVersion,
}: {
  message: MessageView;
  onStar?: () => void;
  onDelete?: () => void;
  onRegenerate?: () => void;
  onBranch?: () => void;
  versionIndex?: number;
  versionCount?: number;
  onPrevVersion?: () => void;
  onNextVersion?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const hasVersions = (versionCount ?? 1) > 1;

  const copy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className={`group flex gap-3 px-4 py-4 ${isUser ? "bg-transparent" : "bg-muted/30"}`}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background border">
        {isUser ? <UserIcon className="size-4" /> : <Bot className="size-4 text-primary" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{isUser ? "You" : "Assistant"}</span>
          {message.model && <span className="font-mono">{message.model}</span>}
          {message.streaming && <span className="text-amber-500">streaming…</span>}
          {message.stopReason === "aborted" && <span className="text-amber-500">stopped</span>}
          {hasVersions && (
            <span className="ml-2 inline-flex items-center gap-0.5 rounded-md border bg-background px-1 py-0.5">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground disabled:opacity-40"
                onClick={onPrevVersion}
                disabled={(versionIndex ?? 1) <= 1}
              >
                <ChevronLeft className="size-3" />
              </button>
              <span className="px-1 text-[10px] font-mono">
                {versionIndex}/{versionCount}
              </span>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground disabled:opacity-40"
                onClick={onNextVersion}
                disabled={(versionIndex ?? 1) >= (versionCount ?? 1)}
              >
                <ChevronRight className="size-3" />
              </button>
            </span>
          )}
        </div>

        <div className="min-w-0">
          <Markdown>{message.content || (message.streaming ? " " : "")}</Markdown>
          {message.streaming && <span className="caret" />}
        </div>

        {!isUser && !message.streaming && message.tokensPerSecond != null && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-mono text-muted-foreground">
            <span>{message.tokensPerSecond.toFixed(1)} tok/s</span>
            <span>TTFT {formatTime(message.timeToFirstToken)}</span>
            <span>gen {formatTime(message.generationTime)}</span>
            {message.totalTokens != null && <span>{formatNumber(message.totalTokens, 0)} total tokens</span>}
            {message.promptTokens != null && <span>prompt {formatNumber(message.promptTokens, 0)}</span>}
            {message.completionTokens != null && <span>out {formatNumber(message.completionTokens, 0)}</span>}
            {message.stopReason && <span>stop: {message.stopReason}</span>}
          </div>
        )}

        <div className="opacity-0 transition-opacity group-hover:opacity-100 flex items-center gap-1 -ml-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="size-7" onClick={copy}>
                <Copy className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{copied ? "Copied" : "Copy"}</TooltipContent>
          </Tooltip>

          {onStar && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="size-7" onClick={onStar}>
                  <Star className={`size-3.5 ${message.starred ? "fill-amber-400 text-amber-400" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{message.starred ? "Unstar" : "Star"}</TooltipContent>
            </Tooltip>
          )}
          {onRegenerate && !isUser && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="size-7" onClick={onRegenerate}>
                  <RefreshCw className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Regenerate</TooltipContent>
            </Tooltip>
          )}
          {onBranch && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="size-7" onClick={onBranch}>
                  <GitBranch className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Branch from here</TooltipContent>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="size-7" onClick={onDelete}>
                  <Trash2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
