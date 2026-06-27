import { useState } from 'react'
import {
  Bell,
  BookOpen,
  Bot,
  Code2,
  ExternalLink,
  FileQuestion,
  Menu,
  Search,
  Sparkles,
} from 'lucide-react'
import { useFilesChat } from '../../../features/chatbot/model/use-files-chat'
import { ChatSessionSidebar } from '../../../features/chatbot/ui/chat-session-sidebar'
import { ChatMessage } from '../../../features/chatbot/ui/chat-message'
import { ChatInputWithFiles } from '../../../features/chatbot/ui/chat-input-with-files'
import { useRefreshSession } from '../../../shared/model/use-refresh-session'
import type { KnowledgeChannel } from '../../../entities/knowledge-base/model/types'
import type { KnowledgeSource } from '../../../features/chatbot/model/use-chat-messages'

const CHANNEL_OPTIONS: Array<{
  value: KnowledgeChannel
  label: string
  Icon: typeof Bell
}> = [
  { value: 'notice', label: '공지사항', Icon: Bell },
  { value: 'faq', label: 'FAQ', Icon: FileQuestion },
  { value: 'dev', label: '개발 자료', Icon: Code2 },
  { value: 'ai', label: 'AI 자료', Icon: Sparkles },
]

function formatScore(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1)
}

function KnowledgeSourcePanel({
  sources,
  selectedChannels,
}: {
  sources: KnowledgeSource[]
  selectedChannels: KnowledgeChannel[]
}) {
  const scopeLabel =
    selectedChannels.length === 0
      ? '전체'
      : CHANNEL_OPTIONS.filter((option) => selectedChannels.includes(option.value))
          .map((option) => option.label)
          .join(', ')

  return (
    <aside className="hidden min-h-0 w-[420px] shrink-0 flex-col rounded-lg border border-surface-border bg-surface-raised xl:flex">
      <div className="shrink-0 border-b border-surface-border bg-brand-glass px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="bg-brand-glass border border-brand-border rounded-md p-1.5 shrink-0 flex items-center justify-center">
            <Search className="size-3.5 text-brand-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold ui-text-primary">검색 근거</h3>
            <p className="truncate text-[10px] ui-text-muted leading-none mt-0.5">범위: {scopeLabel}</p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {sources.length === 0 ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-center">
            <BookOpen className="size-6 ui-text-muted" />
            <p className="text-sm font-semibold ui-text-secondary">
              아직 검색 근거가 없습니다.
            </p>
            <p className="max-w-56 text-xs leading-5 ui-text-muted">
              질문을 보내면 선택한 범위의 chunk 검색 결과와 원문 링크가 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {sources.map((source, index) => (
              <article
                key={source.chunkId}
                className="rounded-md border border-surface-border-soft bg-surface-muted p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-sm border border-brand-border bg-brand-glass px-1.5 py-0.5 text-[10px] font-semibold text-brand-primary">
                    {source.channelLabel}
                  </span>
                  <span className="ml-auto text-[10px] ui-text-muted">
                    score {formatScore(source.score)}
                  </span>
                </div>
                <h4 className="line-clamp-2 text-sm font-semibold ui-text-primary">
                  {index + 1}. {source.title}
                </h4>
                {source.summary && (
                  <p className="mt-1 line-clamp-2 text-xs leading-5 ui-text-secondary">
                    {source.summary}
                  </p>
                )}
                <p className="mt-2 max-h-44 overflow-y-auto whitespace-pre-wrap rounded-sm border border-surface-border-soft bg-surface-raised p-3 text-xs leading-6 ui-text-muted">
                  {source.snippet}
                </p>
                <a
                  href={source.documentUrl}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary hover:underline"
                >
                  원문 열기
                  <ExternalLink className="size-3" />
                </a>
              </article>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

export function ChatbotKnowledgePage() {
  useRefreshSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedChannels, setSelectedChannels] = useState<KnowledgeChannel[]>([])

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
    knowledgeSources,
  } = useFilesChat({
    mode: 'knowledge',
    channels: selectedChannels,
  })

  function toggleChannel(channel: KnowledgeChannel) {
    setSelectedChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    )
  }

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
        <div className="shrink-0 border-b border-surface-border bg-brand-glass px-4 py-3">
          <div className="flex items-center gap-2">
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
        </div>

        {/* 채널 필터 바 (헤더 아래 격리) */}
        <div className="shrink-0 border-b border-surface-border bg-surface-muted/30 px-4 py-2 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedChannels([])}
            className={`rounded-sm border px-2.5 py-1 text-[11px] font-semibold transition ${
              selectedChannels.length === 0
                ? 'border-brand-border bg-brand-glass text-brand-primary'
                : 'border-surface-border-soft bg-surface-raised ui-text-secondary hover:border-surface-border'
            }`}
          >
            전체
          </button>
          {CHANNEL_OPTIONS.map(({ value, label, Icon }) => {
            const selected = selectedChannels.includes(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleChannel(value)}
                className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[11px] font-semibold transition ${
                  selected
                    ? 'border-brand-border bg-brand-glass text-brand-primary'
                    : 'border-surface-border-soft bg-surface-raised ui-text-secondary hover:border-surface-border'
                }`}
              >
                <Icon className="size-3" />
                {label}
              </button>
            )
          })}
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

      <KnowledgeSourcePanel
        sources={knowledgeSources}
        selectedChannels={selectedChannels}
      />
    </div>
  )
}
