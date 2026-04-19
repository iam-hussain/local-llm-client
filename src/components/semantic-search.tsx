"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Result = {
  score: number;
  messageId: string;
  role: string;
  snippet: string;
  conversation: { id: string; title: string };
};

export function SemanticSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQ("");
      setResults([]);
      setError(null);
    }
  }, [open]);

  const run = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 15 }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Search failed");
      else setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  };

  const index = async () => {
    setIndexing(true);
    setError(null);
    try {
      const res = await fetch("/api/search", { method: "PUT" });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Indexing failed");
    } finally {
      setIndexing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Search className="size-4" /> Semantic search</DialogTitle>
          <DialogDescription>Find past messages by meaning — powered by a loaded embeddings model.</DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); run(q); }} className="flex gap-2">
          <Input autoFocus placeholder="How did we handle retry logic?" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Search"}
          </Button>
          <Button type="button" variant="outline" onClick={index} disabled={indexing} title="Re-index messages">
            {indexing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          </Button>
        </form>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
          {results.map((r) => (
            <Link
              key={r.messageId}
              href={`/c/${r.conversation.id}`}
              className="rounded-md border px-3 py-2 hover:bg-accent/50 transition"
              onClick={() => onOpenChange(false)}
            >
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="font-mono">{(r.score * 100).toFixed(0)}%</span>
                <span>·</span>
                <span>{r.role}</span>
                <span>·</span>
                <span className="truncate">{r.conversation.title}</span>
              </div>
              <p className="mt-1 text-sm line-clamp-3">{r.snippet}</p>
            </Link>
          ))}
          {!loading && results.length === 0 && q && !error && (
            <p className="py-6 text-center text-xs text-muted-foreground">No matches. Try indexing first.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
