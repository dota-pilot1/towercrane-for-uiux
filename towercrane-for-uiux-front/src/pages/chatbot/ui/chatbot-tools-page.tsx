import { useState } from 'react'
import { Menu, Wrench } from 'lucide-react'
import { useRefreshSession } from '../../../shared/model/use-refresh-session'
import { ChatSessionSidebar } from '../../../features/chatbot/ui/chat-session-sidebar'
import { ChatMessage } from '../../../features/chatbot/ui/chat-message'
import { ChatInputWithFiles } from '../../../features/chatbot/ui/chat-input-with-files'
import { ToolIntroDialog } from '../../../features/chatbot/ui/tool-intro-dialog'
import { ToolTasksDialog } from '../../../features/chatbot/ui/tool-tasks-dialog'
import { useFilesChat } from '../../../features/chatbot/model/use-files-chat'
import { ChatbotToolPanel, type ToolPanelTab } from '../../../widgets/chatbot-tool-panel/ui/chatbot-tool-panel'

export function ChatbotToolsPage() {
  useRefreshSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rightTab, setRightTab] = useState<ToolPanelTab>('tools')

  // STEP 7: mode: 'tools' 로 훅 호출 — 백엔드 tools 분기 실행됨
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
    toolCalls, // STEP 7-A: 도구 호출 로그 — 오른쪽 패널에 전달
    bottomRef,
    addSession,
    deleteSession,
    switchSession,
    renameSession,
    handleSend,
    handleRegenerate,
    handleKeyDown,
  } = useFilesChat({ mode: 'tools', onToolCall: () => setRightTab('logs') })

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4 relative overflow-hidden">

      {/* 툴 호출 결과 다이얼로그 — 각자 tool-dialog-store를 구독한다 */}
      <ToolTasksDialog />
      <ToolIntroDialog />

      {/* 모바일 백드롭 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 왼쪽 세션 사이드바 */}
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

      {/* 채팅 영역 */}
      <div className="flex flex-1 flex-col min-w-0 rounded-lg border border-surface-border bg-surface-raised overflow-hidden">
        <div className="shrink-0 border-b border-surface-border bg-brand-glass px-4 py-3">
          <div className="flex items-center gap-2">

            <div className="min-w-0 flex-1">
              <span className="text-sm font-semibold ui-text-primary block truncate">
                {activeSession.title}
              </span>
              <span className="text-[10px] ui-text-muted block leading-none mt-0.5">
                {messages.length}개 메시지
              </span>
            </div>
          </div>
        </div>

        {/* 채팅 메세지 영역 */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-surface-muted border border-surface-border mx-auto mb-3">
                  <Wrench className="size-5 ui-text-muted" />
                </div>
                <p className="text-sm font-semibold ui-text-secondary">도구 호출 챗봇입니다.</p>
                <p className="text-xs ui-text-muted mt-1">
                  질문하면 AI가 적절한 도구를 선택해 실행합니다.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.filter((msg) => !(msg.role === 'assistant' && msg.content === '')).map((msg, i) => (
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

      {/* 오른쪽 패널 — 사용 가능한 툴 / 호출 로그 */}
      <ChatbotToolPanel tab={rightTab} onTabChange={setRightTab} toolCalls={toolCalls} />

    </div>
  )
}
