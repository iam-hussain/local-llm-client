"use client";
import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { PresetPicker } from "@/components/preset-picker";
import { BUILTIN_PRESETS } from "@/lib/presets";

type Props = {
  conversationId: string;
  systemPrompt: string | null;
  temperature: number;
  onSaved: (patch: { systemPrompt?: string | null; temperature?: number }) => void;
};

export function SettingsSheet({ conversationId, systemPrompt, temperature, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(systemPrompt ?? "");
  const [temp, setTemp] = useState(temperature);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrompt(systemPrompt ?? "");
    setTemp(temperature);
  }, [systemPrompt, temperature, open]);

  const save = async () => {
    setSaving(true);
    try {
      const body = { systemPrompt: prompt || null, temperature: temp };
      await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onSaved(body);
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
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Conversation settings</SheetTitle>
          <SheetDescription>System prompt and sampling. Applies to future turns.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 p-4">
          <div className="flex flex-col gap-2">
            <Label>Preset</Label>
            <PresetPicker
              value={prompt}
              onChange={(p) => setPrompt(p)}
            />
            <div className="flex flex-wrap gap-1.5">
              {BUILTIN_PRESETS.slice(0, 0).map((p) => p.name)}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>System prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={8}
              placeholder="Instructions that apply to every message in this conversation."
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Temperature</Label>
              <span className="text-xs font-mono text-muted-foreground">{temp.toFixed(2)}</span>
            </div>
            <Slider value={temp} onValueChange={setTemp} min={0} max={2} step={0.05} />
            <p className="text-[11px] text-muted-foreground">
              0 = deterministic · 0.7 = default · 1+ = creative
            </p>
          </div>
        </div>

        <div className="mt-auto flex gap-2 p-4 border-t">
          <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="flex-1" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
