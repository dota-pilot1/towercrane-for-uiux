import { useState } from "react";
import { Bot, User, FileText, Copy, Check, RefreshCw } from "lucide-react";
import type { Message } from "../model/use-chat-messages";
import { ChatMessageMarkdown } from "./chat-message-markdown";

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
  isLast?: boolean;
  onRegenerate?: () => void;
};

export function ChatMessage({ message, isStreaming, isLast, onRegenerate }: Props) {
  const isAssistant = message.role === "assistant";
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const showActions = isAssistant && !isStreaming && message.content;

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
        className={`flex flex-col gap-1.5 ${
          isAssistant
            ? "max-w-[min(82%,_880px)]"
            : "max-w-[min(75%,_760px)]"
        }`}
      >
        {message.fileUrls && message.fileUrls.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.fileUrls.map((url, i) => (
              <AttachedFileView key={i} url={url} />
            ))}
          </div>
        )}

        <div
          className={`rounded-xl px-4 py-3 text-[15px] leading-7 ${
            isAssistant
              ? "bg-[var(--surface-raised)] border border-[var(--surface-border-soft)] ui-text-primary"
              : "bg-brand-glass border border-brand-border text-brand-primary"
          }`}
        >
          {isAssistant ? (
            <div className="chat-markdown">
              <ChatMessageMarkdown content={message.content || (isStreaming ? "응답을 작성하는 중입니다..." : "")} />
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          )}
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

        {/* 액션 버튼 — 스트리밍 완료 후에만 노출 */}
        {showActions && (
          <div className="flex items-center gap-1 px-1">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] ui-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors"
              title="답변 복사"
            >
              {copied
                ? <><Check className="size-3" /><span>복사됨</span></>
                : <><Copy className="size-3" /><span>복사</span></>
              }
            </button>

            {isLast && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] ui-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors"
                title="응답 재생성"
              >
                <RefreshCw className="size-3" />
                <span>재생성</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
