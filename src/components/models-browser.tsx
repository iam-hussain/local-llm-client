"use client";
import { useEffect, useState } from "react";
import { Boxes, CircleCheck, CircleDot, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

type ModelRow = {
  id: string;
  type: string;
  publisher?: string;
  arch?: string;
  compatibility_type?: string;
  quantization?: string;
  state: string;
  max_context_length: number;
  loaded_context_length?: number;
};

export function ModelsBrowser() {
  const [models, setModels] = useState<ModelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/models", { cache: "no-store" });
      const d = await r.json();
      setModels(d.models ?? []);
      setError(d.error ?? null);
      setHint(d.hint ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const groups = {
    llm: models.filter((m) => m.type === "llm" || m.type === "vlm"),
    embeddings: models.filter((m) => m.type === "embeddings"),
    other: models.filter((m) => !["llm", "vlm", "embeddings"].includes(m.type)),
  };

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><Boxes className="size-5" /> Models</h1>
          <p className="text-sm text-muted-foreground">Live view from LM Studio at 127.0.0.1:1234.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
            {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
          </CardContent>
        </Card>
      )}

      <ModelGroup title="Chat (LLM / VLM)" models={groups.llm} />
      <ModelGroup title="Embeddings" models={groups.embeddings} />
      {groups.other.length > 0 && <ModelGroup title="Other" models={groups.other} />}
    </div>
  );
}

function ModelGroup({ title, models }: { title: string; models: ModelRow[] }) {
  if (models.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{models.length} {models.length === 1 ? "model" : "models"}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {models.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2">
              {m.state === "loaded" ? (
                <CircleCheck className="size-4 text-emerald-500 shrink-0" />
              ) : (
                <CircleDot className="size-4 text-muted-foreground shrink-0" />
              )}
              <span className="font-mono text-sm font-medium">{m.id}</span>
              {m.quantization && <Badge variant="secondary">{m.quantization}</Badge>}
              {m.compatibility_type && <Badge variant="outline">{m.compatibility_type}</Badge>}
              {m.arch && <span className="text-xs text-muted-foreground font-mono">{m.arch}</span>}
              <span className="ml-auto text-xs text-muted-foreground font-mono">
                {formatNumber(m.max_context_length, 0)} ctx
                {m.loaded_context_length ? ` · loaded ${formatNumber(m.loaded_context_length, 0)}` : ""}
              </span>
              <Badge variant={m.state === "loaded" ? "default" : "outline"}>{m.state}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
