import { Bot } from "lucide-react";
import { useChatMessages } from "../../../features/chatbot/model/use-chat-messages";
import { ChatMessage } from "../../../features/chatbot/ui/chat-message";
import { TypingIndicator } from "../../../features/chatbot/ui/typing-indicator";
import { ChatInput } from "../../../features/chatbot/ui/chat-input";

export function ChatbotBasicPage() {
  const {
    messages,
    input,
    setInput,
    isTyping,
    bottomRef,
    handleSend,
    handleKeyDown,
  } = useChatMessages();

  return (
    <div className="mx-auto flex h-[calc(100vh-120px)] max-w-3xl flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="ui-icon-button-brand rounded-md p-2.5">
          <Bot className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold ui-text-primary">기본 채팅</h1>
          <p className="text-xs ui-text-secondary">
            메시지 상태 관리 · mock 응답 패턴 실습
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-raised">
        <div className="flex items-center gap-2 border-b border-surface-border bg-surface-strong px-4 py-2 shrink-0">
          <span className="truncate text-sm font-semibold ui-text-primary">
            기본 채팅 세션
          </span>
          <span className="ml-auto shrink-0 text-[11px] ui-text-muted">
            {messages.length}개 메시지
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-surface-border bg-background p-3">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onKeyDown={handleKeyDown}
            disabled={!input.trim() || isTyping}
          />
        </div>
      </div>
    </div>
  );
}
