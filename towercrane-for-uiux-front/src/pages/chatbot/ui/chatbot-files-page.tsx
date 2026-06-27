import { useState } from 'react'
import { Menu, Bot } from 'lucide-react'
import { useFilesChat } from '../../../features/chatbot/model/use-files-chat'
import { ChatSessionSidebar } from '../../../features/chatbot/ui/chat-session-sidebar'
import { ChatMessage } from '../../../features/chatbot/ui/chat-message'
import { ChatInputWithFiles } from '../../../features/chatbot/ui/chat-input-with-files'
import { useRefreshSession } from '../../../shared/model/use-refresh-session'

export function ChatbotFilesPage() {
  useRefreshSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const {
    sessions,
    activeSession,
    messages,
    activeId,
    input,
    setInput,
    attachedFiles,
    setAttachedFiles,
    isStreaming,
    bottomRef,
    addSession,
    deleteSession,
    switchSession,
    renameSession,
    handleSend,
    handleRegenerate,
    handleKeyDown,
  } = useFilesChat()

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4 relative overflow-hidden">

      {/* 모바일 백드롭 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 — 모바일: 슬라이드 드로어 / 데스크탑: 고정 */}
      <aside className={`
        absolute top-0 left-0 h-full z-[95] transition-transform duration-200
        md:relative md:h-auto md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <ChatSessionSidebar
          sessions={sessions}
          activeId={activeId}
          onAdd={addSession}
          onSwitch={(id) => { switchSession(id); setSidebarOpen(false) }}
          onDelete={deleteSession}
          onRename={renameSession}
        />
      </aside>

      <div className="flex flex-1 flex-col min-w-0 rounded-lg border border-surface-border bg-surface-raised overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-brand-glass border-b border-surface-border shrink-0">
          {/* 모바일 햄버거 */}
          <button
            className="md:hidden p-1 rounded ui-icon-button mr-1"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-4" />
          </button>
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
                메시지를 입력하거나 파일을 첨부해 대화를 시작하세요.
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
                  onRegenerate={handleRegenerate}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t border-surface-border p-3 shrink-0">
          <ChatInputWithFiles
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onKeyDown={handleKeyDown}
            disabled={(!input.trim() && attachedFiles.length === 0) || isStreaming || !activeId}
            attachedFiles={attachedFiles}
            onFilesChange={setAttachedFiles}
          />
        </div>
      </div>
    </div>
  )
}
