import { useState } from 'react'
import { Bot, Menu, ShieldOff, Wrench, Hammer, X, Cpu, Building2, CalendarDays, BookOpen, Languages, CheckCircle2, ListChecks, Zap, ClipboardList, AlertCircle, Clock, FileCheck } from 'lucide-react'
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
  const [rightTab, setRightTab] = useState<'tools' | 'logs'>('tools')
  const {
    introOpen, introProfile, closeIntroDialog,
    tasksOpen, tasks, closeTasksDialog,
    aiRequestOpen, aiRequests, closeAiRequestDialog,
  } = useToolDialogStore()

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

      {/* check_ai_service_request 툴 호출 결과 — AI 서비스 신청 현황 다이얼로그 */}
      {aiRequestOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
          <div className="ui-panel rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-brand-glass border-b border-brand-border px-6 py-4 flex items-center gap-3 shrink-0">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-glass border border-brand-border shrink-0">
                <FileCheck className="size-5 text-brand-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-brand-primary">AI 서비스 신청 현황</p>
                <p className="text-xs ui-text-muted">{aiRequests.length}건 신청</p>
              </div>
              <button onClick={closeAiRequestDialog} className="ui-icon-button p-1.5 rounded-lg">
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-3">
              {aiRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <FileCheck className="size-8 ui-text-muted" />
                  <p className="text-sm font-semibold ui-text-secondary">신청 내역이 없습니다.</p>
                </div>
              ) : (
                aiRequests.map((req) => {
                  const statusMap: Record<string, { label: string; cls: string }> = {
                    pending:             { label: '검토 대기', cls: 'bg-surface-muted border-surface-border ui-text-muted' },
                    manager_approved:    { label: '팀장 승인', cls: 'bg-blue-500/10 border-blue-500/30 text-blue-400' },
                    admin_approved:      { label: '관리자 승인', cls: 'bg-brand-glass border-brand-border text-brand-primary' },
                    active:              { label: '사용 중', cls: 'bg-brand-glass border-brand-border text-brand-primary' },
                    rejected:            { label: '반려', cls: 'bg-red-500/10 border-red-500/30 text-red-400' },
                    revision_requested:  { label: '보완 요청', cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
                  }
                  const s = statusMap[req.status] ?? { label: req.status, cls: 'bg-surface-muted border-surface-border ui-text-muted' }
                  return (
                    <div key={req.id} className="ui-panel-soft rounded-xl p-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold ui-text-primary flex-1">{req.serviceType}</p>
                        <span className={`text-[10px] font-bold rounded-full border px-2.5 py-0.5 ${s.cls}`}>{s.label}</span>
                      </div>
                      <p className="text-xs ui-text-secondary leading-relaxed">{req.purpose}</p>
                      {req.rejectReason && (
                        <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">사유: {req.rejectReason}</p>
                      )}
                      <div className="flex gap-3 text-[10px] ui-text-muted pt-1 border-t border-surface-border-soft">
                        <span>신청일: {new Date(req.createdAt).toLocaleDateString('ko-KR')}</span>
                        <span>최종 업데이트: {new Date(req.updatedAt).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="shrink-0 border-t border-surface-border px-6 py-3">
              <button onClick={closeAiRequestDialog} className="w-full rounded-lg border border-brand-border bg-brand-glass py-2 text-sm font-bold text-brand-primary hover:bg-brand-glass/80 transition-colors">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* get_my_tasks 툴 호출 결과 — 담당 업무 테이블 다이얼로그 */}
      {tasksOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
          <div className="ui-panel rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-brand-glass border-b border-brand-border px-6 py-4 flex items-center gap-3 shrink-0">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-glass border border-brand-border shrink-0">
                <ClipboardList className="size-5 text-brand-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-brand-primary">내 담당 업무</p>
                <p className="text-xs ui-text-muted">{tasks.length}개 업무</p>
              </div>
              <button onClick={closeTasksDialog} className="ui-icon-button p-1.5 rounded-lg">
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-3">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <ClipboardList className="size-8 ui-text-muted" />
                  <p className="text-sm font-semibold ui-text-secondary">담당 업무가 없습니다.</p>
                </div>
              ) : tasks.map((task) => {
                const priorityMap: Record<string, { label: string; cls: string }> = {
                  HIGH:   { label: '높음', cls: 'bg-red-500/10 border-red-500/30 text-red-400' },
                  MEDIUM: { label: '보통', cls: 'bg-brand-glass border-brand-border text-brand-primary' },
                  LOW:    { label: '낮음', cls: 'bg-surface-muted border-surface-border ui-text-muted' },
                }
                const statusMap: Record<string, { label: string; cls: string }> = {
                  TODO:        { label: '할 일', cls: 'bg-surface-muted border-surface-border ui-text-muted' },
                  IN_PROGRESS: { label: '진행 중', cls: 'bg-blue-500/10 border-blue-500/30 text-blue-400' },
                  DONE:        { label: '완료', cls: 'bg-brand-glass border-brand-border text-brand-primary' },
                }
                const p = priorityMap[task.priority] ?? { label: task.priority, cls: 'bg-surface-muted border-surface-border ui-text-muted' }
                const s = statusMap[task.status] ?? { label: task.status, cls: 'bg-surface-muted border-surface-border ui-text-muted' }
                return (
                  <div key={task.id} className="ui-panel-soft rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-start gap-2">
                      <p className="text-sm font-semibold ui-text-primary flex-1 leading-snug">{task.title}</p>
                      <span className={`shrink-0 text-[10px] font-bold rounded-full border px-2.5 py-0.5 ${s.cls}`}>{s.label}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] rounded-md bg-surface-raised border border-surface-border-soft ui-text-muted px-2 py-0.5">{task.taskType}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-full border px-2.5 py-0.5 ${p.cls}`}>
                        <AlertCircle className="size-2.5" />
                        {p.label}
                      </span>
                      {task.dueDate && (
                        <span className="inline-flex items-center gap-1 text-[10px] ui-text-muted ml-auto">
                          <Clock className="size-3" />
                          {task.dueDate}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="shrink-0 border-t border-surface-border px-6 py-3">
              <button onClick={closeTasksDialog} className="w-full rounded-lg border border-brand-border bg-brand-glass py-2 text-sm font-bold text-brand-primary hover:bg-brand-glass/80 transition-colors">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* self_introduce 툴 호출 결과 — GPT 모델 카드 다이얼로그 */}
      {introOpen && introProfile && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
          <div className="ui-panel rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

            {/* 헤더 */}
            <div className="bg-brand-glass border-b border-brand-border px-6 py-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-glass border border-brand-border shrink-0">
                <Cpu className="size-5 text-brand-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-brand-primary">{introProfile.model}</p>
                <p className="text-xs ui-text-muted">by {introProfile.developer}</p>
              </div>
              <button onClick={closeIntroDialog} className="ui-icon-button p-1.5 rounded-lg">
                <X className="size-4" />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-5">

              {/* 설명 */}
              <p className="text-sm ui-text-secondary leading-relaxed">{introProfile.description}</p>

              {/* 스펙 그리드 */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: CalendarDays, label: '출시일', value: introProfile.released },
                  { icon: BookOpen, label: '지식 기준일', value: introProfile.knowledgeCutoff },
                  { icon: Cpu, label: '컨텍스트', value: introProfile.contextWindow },
                  { icon: Languages, label: '지원 언어', value: introProfile.languages },
                  { icon: Building2, label: '개발사', value: introProfile.developer },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="ui-panel-soft rounded-xl p-3 flex items-start gap-2.5">
                    <Icon className="size-3.5 text-brand-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] ui-text-muted leading-none mb-1">{label}</p>
                      <p className="text-xs font-semibold ui-text-primary">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 기능 태그 */}
              <div>
                <p className="text-[10px] font-bold ui-text-muted uppercase tracking-wide mb-2">주요 기능</p>
                <div className="flex flex-wrap gap-1.5">
                  {introProfile.capabilities.map((cap) => (
                    <span key={cap} className="inline-flex items-center gap-1 rounded-full bg-brand-glass border border-brand-border px-2.5 py-1 text-[11px] font-medium text-brand-primary">
                      <CheckCircle2 className="size-3" />
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={closeIntroDialog}
                className="w-full rounded-lg border border-brand-border bg-brand-glass py-2 text-sm font-bold text-brand-primary hover:bg-brand-glass/80 transition-colors"
              >
                닫기
              </button>
            </div>
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

      {/* 오른쪽 패널 — 사용 가능한 툴 / 호출 로그 탭 토글 */}
      <aside className="hidden min-h-0 w-[420px] shrink-0 flex-col rounded-lg border border-surface-border bg-surface-raised xl:flex">

        {/* 탭 헤더 */}
        <div className="shrink-0 border-b border-surface-border bg-brand-glass p-2">
          <div className="grid grid-cols-2 gap-1 bg-surface-muted p-1 rounded-xl border border-surface-border-soft relative">
            <button
              onClick={() => setRightTab('tools')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all duration-200 select-none cursor-pointer ${
                rightTab === 'tools'
                  ? 'bg-surface-raised border border-surface-border text-brand-primary shadow-sm scale-[1.01]'
                  : 'text-text-secondary hover:text-text-primary border border-transparent hover:bg-surface-raised/40'
              }`}
            >
              <ListChecks className={`size-4 transition-colors ${rightTab === 'tools' ? 'text-brand-primary' : 'text-text-muted'}`} />
              <span>사용 가능한 툴</span>
            </button>
            <button
              onClick={() => setRightTab('logs')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all duration-200 select-none cursor-pointer ${
                rightTab === 'logs'
                  ? 'bg-surface-raised border border-surface-border text-brand-primary shadow-sm scale-[1.01]'
                  : 'text-text-secondary hover:text-text-primary border border-transparent hover:bg-surface-raised/40'
              }`}
            >
              <Hammer className={`size-4 transition-colors ${rightTab === 'logs' ? 'text-brand-primary' : 'text-text-muted'}`} />
              <span>호출 로그</span>
              {toolCalls.length > 0 && (
                <span className={`ml-1 rounded-full text-[10px] font-extrabold px-1.5 py-0.5 leading-none transition-colors duration-200 ${
                  rightTab === 'logs'
                    ? 'bg-brand-primary text-primary-foreground'
                    : 'bg-surface-border-soft text-text-secondary'
                }`}>
                  {toolCalls.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 사용 가능한 툴 탭 */}
        {rightTab === 'tools' && (
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            <div className="rounded-lg border border-surface-border bg-surface-muted p-3 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-md bg-brand-glass border border-brand-border shrink-0">
                  <Wrench className="size-3.5 text-brand-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold ui-text-primary">self_introduce</p>
                  <p className="text-[10px] ui-text-muted">GPT 자기소개 툴</p>
                </div>
                <span className="ml-auto text-[10px] rounded-full bg-brand-glass border border-brand-border text-brand-primary px-2 py-0.5">active</span>
              </div>
              <p className="text-[11px] ui-text-secondary leading-relaxed">
                사용자가 GPT 자기소개를 요청할 때 발동합니다. 모델 정보·기능·스펙을 카드 다이얼로그로 표시합니다.
              </p>
              <div className="flex flex-wrap gap-1">
                {['자기소개해줘', '넌 누구야', 'who are you', '너에 대해 알려줘'].map((ex) => (
                  <span key={ex} className="text-[10px] rounded bg-surface-raised border border-surface-border-soft ui-text-muted px-1.5 py-0.5">
                    {ex}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5 pt-1 border-t border-surface-border-soft">
                <Zap className="size-3 text-brand-primary" />
                <span className="text-[10px] ui-text-muted">파라미터 없음 · 다이얼로그 전용</span>
              </div>
            </div>

            {/* get_my_tasks 툴 카드 */}
            <div className="rounded-lg border border-surface-border bg-surface-muted p-3 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-md bg-brand-glass border border-brand-border shrink-0">
                  <ClipboardList className="size-3.5 text-brand-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold ui-text-primary">get_my_tasks</p>
                  <p className="text-[10px] ui-text-muted">담당 업무 조회 툴</p>
                </div>
                <span className="ml-auto text-[10px] rounded-full bg-brand-glass border border-brand-border text-brand-primary px-2 py-0.5">active</span>
              </div>
              <p className="text-[11px] ui-text-secondary leading-relaxed">
                현재 로그인한 사용자가 담당자로 지정된 업무 목록을 DB에서 조회합니다. 업무명·타입·우선순위·상태·마감일을 테이블로 표시합니다.
              </p>
              <div className="flex flex-wrap gap-1">
                {['내 업무 보여줘', '내 할일 알려줘', '담당 업무 조회', '나한테 배정된 업무'].map((ex) => (
                  <span key={ex} className="text-[10px] rounded bg-surface-raised border border-surface-border-soft ui-text-muted px-1.5 py-0.5">
                    {ex}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5 pt-1 border-t border-surface-border-soft">
                <Zap className="size-3 text-brand-primary" />
                <span className="text-[10px] ui-text-muted">파라미터 없음 · DB 조회 · 테이블 다이얼로그</span>
              </div>
            </div>

            {/* check_ai_service_request 툴 카드 */}
            <div className="rounded-lg border border-surface-border bg-surface-muted p-3 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-md bg-brand-glass border border-brand-border shrink-0">
                  <FileCheck className="size-3.5 text-brand-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold ui-text-primary">check_ai_service_request</p>
                  <p className="text-[10px] ui-text-muted">AI 서비스 신청 현황 조회 툴</p>
                </div>
                <span className="ml-auto text-[10px] rounded-full bg-brand-glass border border-brand-border text-brand-primary px-2 py-0.5">active</span>
              </div>
              <p className="text-[11px] ui-text-secondary leading-relaxed">
                현재 로그인한 사용자의 AI 서비스 신청 내역과 승인 상태를 조회합니다. 신청 유형·목적·상태·반려 사유를 카드로 표시합니다.
              </p>
              <div className="flex flex-wrap gap-1">
                {['AI 신청 상태 알려줘', '내 신청 현황', '챗봇 신청 됐어?', 'AI 사용 신청 확인'].map((ex) => (
                  <span key={ex} className="text-[10px] rounded bg-surface-raised border border-surface-border-soft ui-text-muted px-1.5 py-0.5">
                    {ex}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5 pt-1 border-t border-surface-border-soft">
                <Zap className="size-3 text-brand-primary" />
                <span className="text-[10px] ui-text-muted">파라미터 없음 · DB 조회 · 카드 다이얼로그</span>
              </div>
            </div>
          </div>
        )}

        {/* 호출 로그 탭 */}
        {rightTab === 'logs' && (
          toolCalls.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center p-6">
              <Hammer className="size-6 ui-text-muted" />
              <p className="text-sm font-semibold ui-text-secondary">아직 도구가 없습니다.</p>
              <p className="max-w-56 text-xs leading-5 ui-text-muted">
                질문을 보내면 AI가 호출한 도구 목록과 실행 결과가 여기에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
              {toolCalls.map((call, i) => (
                <ToolCallCard key={i} call={call} />
              ))}
            </div>
          )
        )}
      </aside>

    </div>
  )
}
