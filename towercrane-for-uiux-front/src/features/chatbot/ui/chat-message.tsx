import { Bot, User, FileText } from "lucide-react";
import type { Message } from "../model/use-chat-messages";

function AttachedFileView({ url }: { url: string }) {
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
  if (isImage) {
    return (
      <img
        src={url}
        className="max-w-[200px] max-h-[160px] rounded-lg object-contain border border-surface-border"
      />
    )
  }
  return (
    <a
      href={url} target="_blank" rel="noreferrer"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-muted border border-surface-border text-sm text-text-secondary hover:text-brand-primary"
    >
      <FileText className="size-3.5" />
      <span className="max-w-[140px] truncate">{url.split('/').pop()}</span>
    </a>
  )
}

type Props = {
  message: Message;
  isStreaming?: boolean;
};

export function ChatMessage({ message, isStreaming }: Props) {
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
      <div className="flex max-w-[75%] flex-col gap-2">
        {message.fileUrls && message.fileUrls.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.fileUrls.map((url, i) => (
              <AttachedFileView key={i} url={url} />
            ))}
          </div>
        )}
        <div
          className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
            isAssistant
              ? "bg-[var(--surface-raised)] border border-[var(--surface-border-soft)] ui-text-primary"
              : "bg-brand-glass border border-brand-border text-brand-primary"
          }`}
        >
          {message.content}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-brand-primary align-middle" />
          )}
          <div className="mt-1 text-[10px] ui-text-muted">
            {message.timestamp.toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
