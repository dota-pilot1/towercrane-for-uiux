import { Bot } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-glass border border-brand-border">
        <Bot className="size-4 text-brand-primary" />
      </div>
      <div className="flex items-center gap-1.5 rounded-xl border border-[var(--surface-border-soft)] bg-[var(--surface-raised)] px-4 py-3">
        <span className="size-1.5 animate-bounce rounded-full bg-[var(--text-muted)] [animation-delay:0ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-[var(--text-muted)] [animation-delay:150ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-[var(--text-muted)] [animation-delay:300ms]" />
      </div>
    </div>
  );
}
