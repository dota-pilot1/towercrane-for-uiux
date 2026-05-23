import { Zap } from 'lucide-react'
import { useStreamingChat } from '../../../features/chatbot/model/use-streaming-chat'
import { ChatMessage } from '../../../features/chatbot/ui/chat-message'
import { ChatInput } from '../../../features/chatbot/ui/chat-input'

export function ChatbotStreamingPage() {
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

      <div className="ui-panel flex-1 overflow-y-auto rounded-lg p-4">
        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} isStreaming={isStreaming && msg === messages[messages.length - 1]} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onKeyDown={handleKeyDown}
        disabled={!input.trim() || isStreaming}
      />
    </div>
  )
}
