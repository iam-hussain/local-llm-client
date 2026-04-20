"use client";
import { formatNumber } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ContextMeter({ used, max }: { used: number; max: number | null | undefined }) {
  if (!max || max <= 0) return null;
  const pct = Math.min(1, used / max);
  const tone =
    pct >= 0.9 ? "bg-destructive" : pct >= 0.7 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
          <div className="w-24 overflow-hidden rounded-full bg-muted h-1.5">
            <div className={`h-full ${tone}`} style={{ width: `${pct * 100}%` }} />
          </div>
          <span>
            {formatNumber(used, 1)}/{formatNumber(max, 1)}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        Context: {used.toLocaleString()} / {max.toLocaleString()} tokens ({(pct * 100).toFixed(0)}%)
      </TooltipContent>
    </Tooltip>
  );
}
