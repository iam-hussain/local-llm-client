import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ShortcutsProvider } from "@/components/shortcuts-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "lmstation — Local LM Studio client",
  description: "Chat, track token usage, and explore your offline models.",
};

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem("llm-station-theme") || "system";
    var m = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var dark = t === "dark" || (t === "system" && m);
    var r = document.documentElement;
    if (dark) r.classList.add("dark");
    r.style.colorScheme = dark ? "dark" : "light";
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <ShortcutsProvider />
          <Toaster />
          <div className="flex h-dvh w-full">
            <div className="hidden md:flex">
              <Sidebar />
            </div>
            <main className="flex flex-1 min-w-0 flex-col">
              <MobileSidebar />
              <div className="flex-1 min-h-0">{children}</div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
