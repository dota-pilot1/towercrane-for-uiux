import { useHistoryChat } from '../../../features/chatbot/model/use-history-chat'
import { ChatSessionSidebar } from '../../../features/chatbot/ui/chat-session-sidebar'
import { ChatMessage } from '../../../features/chatbot/ui/chat-message'
import { ChatInput } from '../../../features/chatbot/ui/chat-input'

export function ChatbotHistoryPage() {
  const {
    sessions,
    activeSession,
    messages,
    activeId,
    input,
    setInput,
    isStreaming,
    bottomRef,
    addSession,
    deleteSession,
    switchSession,
    renameSession,
    handleSend,
    handleKeyDown,
  } = useHistoryChat()

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      <ChatSessionSidebar
        sessions={sessions}
        activeId={activeId}
        onAdd={addSession}
        onSwitch={switchSession}
        onDelete={deleteSession}
        onRename={renameSession}
      />

      <div className="flex flex-1 flex-col min-w-0 rounded-lg border border-surface-border bg-surface-raised overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-surface-strong border-b border-surface-border shrink-0">
          <span className="text-sm font-semibold ui-text-primary truncate">
            {activeSession.title}
          </span>
          <span className="ml-auto text-[11px] ui-text-muted shrink-0">
            {messages.length}개 메시지
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm ui-text-muted">
                메시지를 입력해 대화를 시작하세요.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((msg, i) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming && msg.id === messages[messages.length - 1].id}
                  isLast={i === messages.length - 1 && msg.role === 'assistant'}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t border-surface-border p-3 shrink-0">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onKeyDown={handleKeyDown}
            disabled={!input.trim() || isStreaming || !activeId}
          />
        </div>
      </div>
    </div>
  )
}
