import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
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
          <div className="flex h-dvh w-full">
            <Sidebar />
            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
