import { useState } from 'react'
import { Bot, Menu, ShieldOff, Wrench, Hammer, X, Sparkles } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useSessionStore } from '../../../shared/store/session-store'
import { useRefreshSession } from '../../../shared/model/use-refresh-session'
import { ChatSessionSidebar } from '../../../features/chatbot/ui/chat-session-sidebar'
import { ChatMessage } from '../../../features/chatbot/ui/chat-message'
import { ChatInputWithFiles } from '../../../features/chatbot/ui/chat-input-with-files'
import { useFilesChat, type ToolCallLog } from '../../../features/chatbot/model/use-files-chat'
import { useToolDialogStore } from '../../../features/chatbot/model/tool-dialog-store'

// STEP 7-D: 도구 호출 카드 컴포넌트 — 이름 / 입력 파라미터 / 결과 표시
function ToolCallCard({ call }: { call: ToolCallLog }) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-glass p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Wrench className="size-3.5 text-brand-primary shrink-0" />
        <span className="text-xs font-bold text-brand-primary">{call.name}</span>
        <span className="ml-auto text-[10px] ui-text-muted border border-surface-border-soft rounded px-1.5 py-0.5">done</span>
      </div>
      <div>
        <p className="text-[10px] ui-text-muted mb-1">입력</p>
        <pre className="text-[11px] ui-text-secondary bg-surface-muted rounded p-2 overflow-x-auto">
          {JSON.stringify(call.input, null, 2)}
        </pre>
      </div>
      <div>
        <p className="text-[10px] ui-text-muted mb-1">결과</p>
        <pre className="text-[11px] text-brand-primary bg-surface-muted rounded p-2 overflow-x-auto">
          {JSON.stringify(call.result, null, 2)}
        </pre>
      </div>
    </div>
  )
}

export function ChatbotToolsPage() {
  useRefreshSession()
  const aiAccess = useSessionStore((s) => s.aiAccess)
  const userRole = useSessionStore((s) => s.userRole)
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { open: introOpen, message: introMessage, closeIntroDialog } = useToolDialogStore()

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
  } = useFilesChat({ mode: 'tools' })

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
    <div className="flex h-[calc(100vh-120px)] gap-4 relative overflow-hidden">

      {/* self_introduce 툴 호출 결과 다이얼로그 */}
      {introOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
          <div className="ui-panel rounded-2xl p-8 flex flex-col items-center gap-5 max-w-sm w-full mx-4 text-center shadow-2xl">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-glass border border-brand-border">
              <Sparkles className="size-7 text-brand-primary" />
            </div>
            <div>
              <p className="text-base font-bold ui-text-primary mb-2">자기소개</p>
              <p className="text-sm ui-text-secondary leading-relaxed">{introMessage}</p>
            </div>
            <button
              onClick={closeIntroDialog}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-glass px-5 py-2 text-sm font-bold text-brand-primary hover:bg-brand-glass/80 transition-colors"
            >
              <X className="size-3.5" />
              닫기
            </button>
          </div>
        </div>
      )}

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
            <button
              className="md:hidden p-1 rounded ui-icon-button mr-1"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="size-4" />
            </button>
            <div className="bg-brand-glass border border-brand-border rounded-md p-1.5 shrink-0 flex items-center justify-center">
              <Wrench className="size-3.5 text-brand-primary" />
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
        </div>

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

      {/* STEP 7-B: 오른쪽 도구 호출 로그 패널 — toolCalls 상태 연결 */}
      <aside className="hidden min-h-0 w-[420px] shrink-0 flex-col rounded-lg border border-surface-border bg-surface-raised xl:flex">
        <div className="shrink-0 border-b border-surface-border bg-brand-glass px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="bg-brand-glass border border-brand-border rounded-md p-1.5 shrink-0 flex items-center justify-center">
              <Hammer className="size-3.5 text-brand-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold ui-text-primary">도구 호출 로그</h3>
              <p className="text-[10px] ui-text-muted leading-none mt-0.5">
                {toolCalls.length > 0 ? `${toolCalls.length}개 도구 실행됨` : 'Tool Use 실행 과정'}
              </p>
            </div>
          </div>
        </div>

        {toolCalls.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center p-6">
            <Hammer className="size-6 ui-text-muted" />
            <p className="text-sm font-semibold ui-text-secondary">아직 도구가 없습니다.</p>
            <p className="max-w-56 text-xs leading-5 ui-text-muted">
              질문을 보내면 AI가 호출한 도구 목록과 실행 결과가 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          // STEP 7-C: 도구 호출 카드 렌더링
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {toolCalls.map((call, i) => (
              <ToolCallCard key={i} call={call} />
            ))}
          </div>
        )}
      </aside>

    </div>
  )
}
