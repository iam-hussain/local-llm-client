"use client";
import { useEffect } from "react";

type Handlers = {
  onSearch?: () => void;
  onNewChat?: () => void;
  onToggleTheme?: () => void;
  onFocusComposer?: () => void;
};

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
}

export function useShortcuts(h: Handlers) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      // ⌘K → search
      if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        h.onSearch?.();
        return;
      }
      // ⌘/ → theme toggle (only when not typing, to avoid intercepting in-field slash)
      if (e.key === "/" && !isTypingTarget(e.target)) {
        e.preventDefault();
        h.onToggleTheme?.();
        return;
      }
      // ⌘J → new chat (avoids browser ⌘N which opens a new window)
      if (e.key.toLowerCase() === "j" && e.shiftKey) {
        e.preventDefault();
        h.onNewChat?.();
        return;
      }
      // ⌘L → focus composer
      if (e.key.toLowerCase() === "l" && e.shiftKey) {
        e.preventDefault();
        h.onFocusComposer?.();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [h]);
}
