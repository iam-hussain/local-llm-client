"use client";
import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { PresetPicker } from "@/components/preset-picker";
import { ScrollArea } from "@/components/ui/scroll-area";

export type SamplingSettings = {
  systemPrompt: string | null;
  temperature: number;
  topP: number | null;
  topK: number | null;
  repeatPenalty: number | null;
  maxTokens: number | null;
  stopSequences: string[];
};

type Props = {
  conversationId: string;
  initial: SamplingSettings;
  onSaved: (patch: Partial<SamplingSettings>) => void;
};

export function SettingsSheet({ conversationId, initial, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SamplingSettings>(initial);
  const [stopInput, setStopInput] = useState(initial.stopSequences.join(", "));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(initial);
      setStopInput(initial.stopSequences.join(", "));
    }
  }, [initial, open]);

  const save = async () => {
    setSaving(true);
    try {
      const body: Partial<SamplingSettings> = {
        systemPrompt: form.systemPrompt?.trim() ? form.systemPrompt : null,
        temperature: form.temperature,
        topP: form.topP,
        topK: form.topK,
        repeatPenalty: form.repeatPenalty,
        maxTokens: form.maxTokens,
        stopSequences: stopInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onSaved(body);
      toast.success("Settings saved");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="size-3.5" />
          Settings
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader>
          <SheetTitle>Conversation settings</SheetTitle>
          <SheetDescription>System prompt, sampling, stop sequences.</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-5 p-4">
            <div className="flex flex-col gap-2">
              <Label>Preset</Label>
              <PresetPicker
                value={form.systemPrompt}
                onChange={(p) => setForm((f) => ({ ...f, systemPrompt: p }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>System prompt</Label>
              <Textarea
                value={form.systemPrompt ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
                rows={6}
                placeholder="Instructions that apply to every message in this conversation."
              />
            </div>

            <SliderRow
              label="Temperature"
              value={form.temperature}
              onChange={(v) => setForm((f) => ({ ...f, temperature: v }))}
              min={0}
              max={2}
              step={0.05}
              hint="0 = deterministic · 0.7 = default · 1+ = creative"
            />

            <SliderRow
              label="Top-p (nucleus)"
              value={form.topP ?? 1}
              optional
              enabled={form.topP != null}
              onToggle={(on) => setForm((f) => ({ ...f, topP: on ? 0.95 : null }))}
              onChange={(v) => setForm((f) => ({ ...f, topP: v }))}
              min={0}
              max={1}
              step={0.01}
              hint="Keep the top-p cumulative probability mass. Lower = more focused."
            />

            <IntRow
              label="Top-k"
              value={form.topK}
              onChange={(v) => setForm((f) => ({ ...f, topK: v }))}
              placeholder="e.g. 40"
              hint="Restrict to the K most-likely next tokens. Empty = disabled."
            />

            <SliderRow
              label="Repeat penalty"
              value={form.repeatPenalty ?? 1}
              optional
              enabled={form.repeatPenalty != null}
              onToggle={(on) => setForm((f) => ({ ...f, repeatPenalty: on ? 1.1 : null }))}
              onChange={(v) => setForm((f) => ({ ...f, repeatPenalty: v }))}
              min={1}
              max={1.5}
              step={0.01}
              hint="Discourage repeated tokens. 1.0 = off."
            />

            <IntRow
              label="Max tokens"
              value={form.maxTokens}
              onChange={(v) => setForm((f) => ({ ...f, maxTokens: v }))}
              placeholder="empty = unlimited"
              hint="Cap the length of each reply. Empty = no cap."
            />

            <div className="flex flex-col gap-2">
              <Label>Stop sequences</Label>
              <Input
                value={stopInput}
                onChange={(e) => setStopInput(e.target.value)}
                placeholder="e.g.  </s>, ###, User:"
              />
              <p className="text-[11px] text-muted-foreground">Comma-separated. Generation halts as soon as any is produced.</p>
            </div>
          </div>
        </ScrollArea>

        <div className="mt-auto flex gap-2 p-4 border-t">
          <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="flex-1" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  min,
  max,
  step,
  hint,
  optional,
  enabled = true,
  onToggle,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  hint?: string;
  optional?: boolean;
  enabled?: boolean;
  onToggle?: (on: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {label}
          {optional && (
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggle?.(e.target.checked)}
              className="accent-primary"
            />
          )}
        </Label>
        <span className="text-xs font-mono text-muted-foreground">{enabled ? value.toFixed(2) : "off"}</span>
      </div>
      <Slider value={value} onValueChange={onChange} min={min} max={max} step={step} />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function IntRow({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Input
        value={value == null ? "" : String(value)}
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (!raw) return onChange(null);
          const n = parseInt(raw, 10);
          onChange(Number.isFinite(n) ? n : null);
        }}
        placeholder={placeholder}
        type="number"
      />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
