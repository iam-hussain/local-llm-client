"use client";
import * as icons from "lucide-react";
import { BUILTIN_PRESETS } from "@/lib/presets";
import { Button } from "@/components/ui/button";

export function PresetPicker({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (prompt: string, name: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {BUILTIN_PRESETS.map((p) => {
        const Icon = (icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[p.icon] ?? icons.Sparkles;
        const active = value === p.prompt;
        return (
          <Button
            key={p.name}
            size="sm"
            variant={active ? "default" : "outline"}
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={() => onChange(p.prompt, p.name)}
          >
            <Icon className="size-3.5" />
            {p.name}
          </Button>
        );
      })}
    </div>
  );
}
