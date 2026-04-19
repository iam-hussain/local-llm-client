"use client";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, Boxes, MessageSquarePlus, Pin, PinOff, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SemanticSearch } from "@/components/semantic-search";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { relativeTime } from "@/lib/utils";

type Convo = {
  id: string;
  title: string;
  model: string | null;
  pinned: boolean;
  updatedAt: string;
  _count: { messages: number };
};

export function Sidebar() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const activeId = params?.id;
  const [convos, setConvos] = useState<Convo[]>([]);
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const load = async () => {
    const res = await fetch("/api/conversations", { cache: "no-store" });
    const data = await res.json();
    setConvos(data.conversations ?? []);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const newChat = async () => {
    const res = await fetch("/api/conversations", { method: "POST", body: JSON.stringify({}) });
    const data = await res.json();
    router.push(`/c/${data.conversation.id}`);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this conversation?")) return;
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (activeId === id) router.push("/");
    load();
  };

  const togglePin = async (c: Convo) => {
    await fetch(`/api/conversations/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !c.pinned }),
    });
    load();
  };

  const filtered = q.trim()
    ? convos.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()))
    : convos;

  return (
    <aside className="flex h-dvh w-[280px] shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 p-3">
        <Link href="/" className="flex-1">
          <Logo />
        </Link>
        <ThemeToggle compact />
      </div>

      <div className="px-3">
        <Button onClick={newChat} className="w-full justify-start gap-2">
          <MessageSquarePlus className="size-4" />
          New chat
        </Button>
      </div>

      <div className="px-3 pt-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-8 pl-7 text-xs"
          />
        </div>
        <Button variant="outline" size="icon" className="size-8" onClick={() => setSearchOpen(true)} title="Semantic search">
          <Search className="size-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2 py-2">
        <ul className="flex flex-col gap-0.5">
          {filtered.map((c) => {
            const active = c.id === activeId;
            return (
              <li key={c.id}>
                <div
                  className={`group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                    active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                  }`}
                  onClick={() => router.push(`/c/${c.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {c.pinned && <Pin className="size-3 text-amber-500" />}
                      <span className="truncate font-medium">{c.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{c._count.messages} msg</span>
                      <span>·</span>
                      <span>{relativeTime(c.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(c);
                      }}
                    >
                      {c.pinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(c.id);
                      }}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-2 py-8 text-center text-xs text-muted-foreground">No conversations yet.</li>
          )}
        </ul>
      </ScrollArea>

      <div className="flex gap-1 p-2 border-t">
        <Button asChild variant="ghost" size="sm" className="flex-1 justify-start gap-2 text-xs">
          <Link href="/stats"><BarChart3 className="size-3.5" /> Stats</Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="flex-1 justify-start gap-2 text-xs">
          <Link href="/models"><Boxes className="size-3.5" /> Models</Link>
        </Button>
      </div>

      <SemanticSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </aside>
  );
}
