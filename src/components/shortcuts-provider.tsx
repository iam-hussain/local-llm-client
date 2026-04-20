"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useShortcuts } from "@/hooks/use-shortcuts";
import { useTheme } from "@/components/theme-provider";

export const OPEN_SEARCH_EVENT = "lmstation:open-search";
export const FOCUS_COMPOSER_EVENT = "lmstation:focus-composer";

export function ShortcutsProvider() {
  const router = useRouter();
  const { theme, setTheme, resolved } = useTheme();

  useShortcuts({
    onSearch: () => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT)),
    onNewChat: async () => {
      const r = await fetch("/api/conversations", { method: "POST", body: JSON.stringify({}) });
      const d = await r.json();
      if (d.conversation?.id) {
        toast.success("New chat created");
        router.push(`/c/${d.conversation.id}`);
      }
    },
    onToggleTheme: () => {
      const next = resolved === "dark" ? "light" : "dark";
      setTheme(next);
      toast(`${next === "dark" ? "Dark" : "Light"} mode`, { duration: 800 });
      void theme;
    },
    onFocusComposer: () => window.dispatchEvent(new Event(FOCUS_COMPOSER_EVENT)),
  });

  return null;
}
