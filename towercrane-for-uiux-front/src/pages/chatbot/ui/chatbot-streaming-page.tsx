import { Zap } from 'lucide-react'
import { useStreamingChat } from '../../../features/chatbot/model/use-streaming-chat'
import { ChatMessage } from '../../../features/chatbot/ui/chat-message'
import { ChatInput } from '../../../features/chatbot/ui/chat-input'
import { useRefreshSession } from '../../../shared/model/use-refresh-session'

export function ChatbotStreamingPage() {
  useRefreshSession()
  const { messages, input, setInput, isStreaming, bottomRef, handleSend, handleKeyDown } =
    useStreamingChat()

  return (
    <div className="mx-auto flex h-[calc(100vh-120px)] max-w-3xl flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="ui-icon-button-brand rounded-md p-2.5">
          <Zap className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold ui-text-primary">스트리밍 응답</h1>
          <p className="text-xs ui-text-secondary">GPT 실시간 스트리밍 · fetch + ReadableStream</p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-glass px-2.5 py-1 text-[11px] font-medium text-brand-primary">
          GPT-4o-mini
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-raised">
        <div className="flex items-center gap-2 border-b border-surface-border bg-surface-strong px-4 py-2 shrink-0">
          <span className="truncate text-sm font-semibold ui-text-primary">
            스트리밍 세션
          </span>
          <span className="ml-auto shrink-0 rounded-full border border-brand-border bg-brand-glass px-2.5 py-1 text-[11px] font-medium text-brand-primary">
            GPT-4o-mini
          </span>
          <span className="shrink-0 text-[11px] ui-text-muted">
            {messages.length}개 메시지
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isStreaming={isStreaming && msg === messages[messages.length - 1]}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-surface-border bg-background p-3">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onKeyDown={handleKeyDown}
            disabled={!input.trim() || isStreaming}
          />
        </div>
      </div>
    </div>
  )
}
