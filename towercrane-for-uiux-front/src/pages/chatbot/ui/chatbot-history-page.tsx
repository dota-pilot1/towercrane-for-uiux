import { ShieldOff, Bot } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useHistoryChat } from '../../../features/chatbot/model/use-history-chat'
import { ChatSessionSidebar } from '../../../features/chatbot/ui/chat-session-sidebar'
import { ChatMessage } from '../../../features/chatbot/ui/chat-message'
import { ChatInput } from '../../../features/chatbot/ui/chat-input'
import { useSessionStore } from '../../../shared/store/session-store'
import { useRefreshSession } from '../../../shared/model/use-refresh-session'

export function ChatbotHistoryPage() {
  useRefreshSession()
  const aiAccess = useSessionStore((s) => s.aiAccess)
  const userRole = useSessionStore((s) => s.userRole)
  const navigate = useNavigate()
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

  if (!aiAccess && userRole !== 'admin') {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <div className="ui-panel rounded-2xl p-10 flex flex-col items-center gap-4 text-center max-w-md">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-surface-muted border border-surface-border">
            <ShieldOff className="size-7 ui-text-muted" />
          </div>
          <div>
            <p className="text-base font-bold ui-text-primary">AI 서비스 접근 권한이 없습니다</p>
            <p className="mt-1.5 text-sm ui-text-muted leading-relaxed">
              챗봇 사용을 위해 AI 서비스 신청 후 승인을 받아야 합니다.
            </p>
          </div>
          <button
            onClick={() => navigate({ to: '/ai-service-request' })}
            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-glass px-4 py-2 text-sm font-bold text-brand-primary hover:bg-brand-glass/80 transition-colors"
          >
            서비스 신청하기
          </button>
        </div>
      </div>
    )
  }

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
        <div className="flex items-center gap-2 px-4 py-3 bg-brand-glass border-b border-surface-border shrink-0">
          <div className="bg-brand-glass border border-brand-border rounded-md p-1.5 shrink-0 flex items-center justify-center">
            <Bot className="size-3.5 text-brand-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-semibold ui-text-primary block truncate">
              {activeSession.title}
            </span>
            <span className="text-[10px] ui-text-muted block leading-none mt-0.5">
              {messages.length}개 메시지
            </span>
          </div>
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
