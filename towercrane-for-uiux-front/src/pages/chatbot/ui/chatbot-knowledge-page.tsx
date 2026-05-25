import { useState } from 'react'
import { Menu, BookOpen, ChevronRight, FileText, Bell, HelpCircle, Sparkles, Code2 } from 'lucide-react'
import { useFilesChat } from '../../../features/chatbot/model/use-files-chat'
import { ChatSessionSidebar } from '../../../features/chatbot/ui/chat-session-sidebar'
import { ChatMessage } from '../../../features/chatbot/ui/chat-message'
import { ChatInputWithFiles } from '../../../features/chatbot/ui/chat-input-with-files'

const KNOWLEDGE_TREE = [
  {
    id: 'notice',
    label: '공지사항',
    Icon: Bell,
    children: [
      { id: 'n1', label: '시스템 점검 안내 (5/20)' },
      { id: 'n2', label: '신규 AI 서비스 오픈' },
      { id: 'n3', label: '서비스 이용 정책 변경' },
    ],
  },
  {
    id: 'faq',
    label: 'FAQ',
    Icon: HelpCircle,
    children: [
      { id: 'f1', label: '계정 및 권한 관련' },
      { id: 'f2', label: 'AI 서비스 신청 방법' },
      { id: 'f3', label: '결제 및 비용 정산' },
      { id: 'f4', label: '오류 및 장애 대응' },
    ],
  },
  {
    id: 'ai_docs',
    label: 'AI 자료',
    Icon: Sparkles,
    children: [
      { id: 'a1', label: 'GPT 활용 가이드' },
      { id: 'a2', label: '프롬프트 엔지니어링 기초' },
      { id: 'a3', label: 'AI 서비스 소개서' },
      { id: 'a4', label: 'Embedding 개념 정리' },
    ],
  },
  {
    id: 'dev_docs',
    label: '개발 자료',
    Icon: Code2,
    children: [
      { id: 'd1', label: 'API 연동 가이드' },
      { id: 'd2', label: '개발 환경 설정' },
      { id: 'd3', label: '배포 프로세스' },
      { id: 'd4', label: '코드 리뷰 체크리스트' },
    ],
  },
]

function KnowledgeTreeSidebar() {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(['faq', 'notice']))
  const [activeDocId, setActiveDocId] = useState<string | null>(null)

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="hidden lg:flex w-52 shrink-0 flex-col rounded-lg border border-surface-border bg-surface-raised overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-surface-strong border-b border-surface-border shrink-0">
        <BookOpen className="size-3.5 text-brand-primary shrink-0" />
        <span className="text-xs font-semibold ui-text-secondary">지식 문서</span>
        <span className="ml-auto text-[10px] text-text-muted bg-surface-muted px-1.5 py-0.5 rounded-full">mock</span>
      </div>

      {/* 트리 */}
      <div className="flex flex-col overflow-y-auto p-1.5 gap-0.5 flex-1">
        {KNOWLEDGE_TREE.map(({ id, label, Icon, children }) => (
          <div key={id}>
            <button
              onClick={() => toggle(id)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-surface-muted transition-colors"
            >
              <ChevronRight
                className={`size-3 shrink-0 ui-text-muted transition-transform duration-150 ${openIds.has(id) ? 'rotate-90' : ''}`}
              />
              <Icon className="size-3.5 text-brand-primary shrink-0" />
              <span className="text-xs font-medium ui-text-secondary text-left truncate">{label}</span>
            </button>

            {openIds.has(id) && (
              <div className="ml-3 border-l border-surface-border pl-2 flex flex-col gap-0.5 mb-1">
                {children.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveDocId(item.id)}
                    className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-left ${
                      activeDocId === item.id
                        ? 'bg-brand-glass text-brand-primary'
                        : 'hover:bg-surface-muted ui-text-muted'
                    }`}
                  >
                    <FileText className="size-3 shrink-0 opacity-60" />
                    <span className="text-[11px] truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 하단 안내 */}
      <div className="px-3 py-2 border-t border-surface-border shrink-0">
        <p className="text-[10px] text-text-muted leading-relaxed">
          문서를 선택하면 해당 내용을<br />참고해서 답변합니다.
        </p>
      </div>
    </div>
  )
}

export function ChatbotKnowledgePage() {
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
        <div className="flex items-center gap-2 px-4 py-2 bg-surface-strong border-b border-surface-border shrink-0">
          <button
            className="md:hidden p-1 rounded ui-icon-button mr-1"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-4" />
          </button>
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
                사내 지식 검색 챗봇입니다. 궁금한 내용을 질문해보세요.
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

      {/* 오른쪽 지식 트리 사이드바 */}
      <KnowledgeTreeSidebar />
    </div>
  )
}
