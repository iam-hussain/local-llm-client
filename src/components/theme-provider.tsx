"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

type Ctx = {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "llm-station-theme";

function resolve(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // Hydrate from storage on mount.
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    setThemeState(stored);
    const r = resolve(stored);
    setResolved(r);
    apply(r);
  }, []);

  // Follow system changes when theme = "system".
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = () => {
      const r = mq.matches ? "dark" : "light";
      setResolved(r);
      apply(r);
    };
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
    const r = resolve(t);
    setResolved(r);
    apply(r);
  }, []);

  return <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme outside ThemeProvider");
  return ctx;
}
