"use client";
import { useEffect, useState } from "react";
import { ChevronsUpDown, CircleAlert, CircleCheck, CircleDot } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/utils";

export type ApiModel = {
  id: string;
  type: string;
  quantization?: string;
  state: string;
  max_context_length: number;
  publisher?: string;
  arch?: string;
};

export function useModels() {
  const [models, setModels] = useState<ApiModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/models", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setModels(data.models ?? []);
          setError(null);
        } else {
          setError(data.error ?? "Failed to load models");
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { models, loading, error };
}

export function ModelPicker({
  value,
  onChange,
  typeFilter = ["llm", "vlm"],
}: {
  value: string | undefined;
  onChange: (id: string) => void;
  typeFilter?: string[];
}) {
  const { models, error } = useModels();
  const filtered = models.filter((m) => typeFilter.includes(m.type));
  const loaded = filtered.filter((m) => m.state === "loaded");
  const unloaded = filtered.filter((m) => m.state !== "loaded");

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="min-w-[220px]" size="sm">
        <SelectValue placeholder={error ? "LM Studio offline" : "Pick a model"} />
        <ChevronsUpDown className="size-3 opacity-60" />
      </SelectTrigger>
      <SelectContent>
        {loaded.length > 0 && (
          <SelectGroup>
            <SelectLabel className="flex items-center gap-1"><CircleCheck className="size-3 text-emerald-500" /> Loaded</SelectLabel>
            {loaded.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs">{m.id}</span>
                  {m.quantization && <span className="text-muted-foreground text-[10px]">{m.quantization}</span>}
                  <span className="text-muted-foreground text-[10px]">{formatNumber(m.max_context_length, 0)} ctx</span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {unloaded.length > 0 && (
          <SelectGroup>
            <SelectLabel className="flex items-center gap-1"><CircleDot className="size-3 text-muted-foreground" /> Available (JIT)</SelectLabel>
            {unloaded.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs">{m.id}</span>
                  {m.quantization && <span className="text-muted-foreground text-[10px]">{m.quantization}</span>}
                  <span className="text-muted-foreground text-[10px]">{formatNumber(m.max_context_length, 0)} ctx</span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {filtered.length === 0 && (
          <div className="p-3 text-xs text-muted-foreground flex items-center gap-2">
            <CircleAlert className="size-4" />
            No models found. Run <code className="font-mono">lms get &lt;model&gt;</code>.
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
