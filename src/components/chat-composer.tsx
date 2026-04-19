"use client";
import { useEffect, useRef, useState } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatComposer({
  onSend,
  onStop,
  streaming,
  disabled,
  placeholder,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  streaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const submit = () => {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue("");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mx-auto w-full max-w-3xl px-4 pb-4"
    >
      <div className="relative flex items-end gap-2 rounded-xl border bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/50">
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder ?? "Message your local model…  (⌘↵ to send, Esc to stop)"}
          className="min-h-10 max-h-60 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submit();
            } else if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape" && streaming) {
              e.preventDefault();
              onStop();
            }
          }}
          disabled={disabled}
        />
        {streaming ? (
          <Button type="button" variant="destructive" size="icon" onClick={onStop} className="shrink-0">
            <Square className="size-4 fill-current" />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={disabled || !value.trim()} className="shrink-0">
            <Send className="size-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
