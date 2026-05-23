import { Bot, User } from "lucide-react";
import type { Message } from "../model/use-chat-messages";

type Props = {
  message: Message;
};

export function ChatMessage({ message }: Props) {
  const isAssistant = message.role === "assistant";

  return (
    <div className={`flex gap-3 ${isAssistant ? "" : "flex-row-reverse"}`}>
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
          isAssistant
            ? "bg-brand-glass border border-brand-border"
            : "bg-[var(--surface-strong)]"
        }`}
      >
        {isAssistant ? (
          <Bot className="size-4 text-brand-primary" />
        ) : (
          <User className="size-4 ui-text-secondary" />
        )}
      </div>
      <div
        className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
          isAssistant
            ? "bg-[var(--surface-raised)] border border-[var(--surface-border-soft)] ui-text-primary"
            : "bg-brand-glass border border-brand-border text-brand-primary"
        }`}
      >
        {message.content}
        <div className="mt-1 text-[10px] ui-text-muted">
          {message.timestamp.toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}
