"use client";
import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";

function CodeBlock({ children, className }: { children: ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const lang = className?.replace(/^language-/, "") || "text";
  const copy = async () => {
    const pre = document.createElement("div");
    pre.innerHTML = String(children ?? "");
    const text = pre.innerText;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard may be blocked */
    }
  };
  return (
    <div className="group relative my-2">
      <div className="flex items-center justify-between rounded-t-md border border-b-0 bg-muted/70 px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <span>{lang}</span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] hover:bg-background"
        >
          {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="hljs !mt-0 !rounded-t-none overflow-x-auto rounded-b-md border px-3 py-2 text-[13px] leading-snug">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-chat text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          pre({ children }) {
            return <>{children}</>;
          },
          code({ children, className, ...props }) {
            const isBlock = typeof className === "string" && className.startsWith("language-");
            if (!isBlock) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            return <CodeBlock className={className}>{children}</CodeBlock>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
