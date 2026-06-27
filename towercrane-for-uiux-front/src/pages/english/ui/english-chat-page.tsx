import { useLayoutEffect, useRef } from 'react'
import { MessagesSquare, Send, Sparkles } from 'lucide-react'
import { useEnglishChat } from '../../../features/english/model/use-english-chat'
import { useSessionStore } from '../../../shared/store/session-store'

const COMPOSER_MAX_HEIGHT = 160 // max-h-40 (px) — 이 높이부터 내부 스크롤

// 영어 챗봇 대화 — AI 튜터와 영어로 스트리밍 회화
export function EnglishChatPage() {
  const {
    messages,
    input,
    setInput,
    isStreaming,
    bottomRef,
    handleSend,
    handleKeyDown,
  } = useEnglishChat()

  const userName = useSessionStore((s) => s.userName)
  const profileImageUrl = useSessionStore((s) => s.profileImageUrl)
  const userInitial = (userName || 'U').trim().charAt(0).toUpperCase()

  // 입력 내용에 맞춰 textarea 높이 자동 확장 (max 도달 시 내부 스크롤)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT)}px`
  }, [input])

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] w-full max-w-3xl flex-col px-4">
      {/* 헤더 — 얇은 하단 구분선만 */}
      <div className="flex items-center gap-3 border-b border-surface-border-soft py-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand-glass text-brand-primary">
          <MessagesSquare className="size-5" />
        </div>
        <div>
          <h1 className="text-base font-black text-text-primary">영어 챗봇 대화</h1>
          <p className="text-xs text-text-secondary">
            AI 튜터와 영어로 자유 대화 · 실수는 💡로 교정
          </p>
        </div>
      </div>

      {/* 메시지 영역 — 부드러운 윤곽선 패널 */}
      <div className="mt-4 flex-1 overflow-y-auto rounded-2xl border border-surface-border-soft bg-surface-raised p-4 sm:p-6">
        <ul className="mx-auto flex max-w-2xl flex-col gap-5">
          {messages.map((m) => {
            const isUser = m.role === 'user'
            const pending = !m.content && isStreaming && !isUser
            return (
              <li
                key={m.id}
                className={`flex items-end gap-2 ${
                  isUser ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* 아바타 */}
                {isUser ? (
                  profileImageUrl ? (
                    <img
                      src={profileImageUrl}
                      alt={userName || '나'}
                      className="size-8 shrink-0 rounded-full border border-surface-border-soft object-cover"
                    />
                  ) : (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-strong text-xs font-bold text-text-secondary">
                      {userInitial}
                    </div>
                  )
                ) : (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-glass text-brand-primary">
                    <Sparkles className="size-4" />
                  </div>
                )}

                {/* 말풍선 */}
                <div
                  className={
                    isUser
                      ? 'max-w-[78%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground'
                      : 'max-w-[78%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-surface-border-soft bg-surface-muted px-4 py-2.5 text-sm leading-relaxed text-text-primary'
                  }
                >
                  {pending ? (
                    <span className="flex items-center gap-1 py-1">
                      <span className="size-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:-0.3s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:-0.15s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-text-muted" />
                    </span>
                  ) : (
                    m.content
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        <div ref={bottomRef} />
      </div>

      {/* 입력 컴포저 — 넉넉한 라운드 + 중앙 정렬 */}
      <div className="mx-auto w-full max-w-2xl pb-5 pt-2">
        <div className="rounded-3xl border border-surface-border bg-surface-raised px-3 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-colors focus-within:border-brand-border">
          <div className="flex min-h-[2.75rem] items-center gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="영어로 입력하세요…"
              className="block max-h-40 flex-1 resize-none self-center overflow-y-auto border-0 bg-transparent px-2 py-1.5 text-sm leading-relaxed text-text-primary outline-none placeholder:text-text-muted"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isStreaming || !input.trim()}
              className="ui-icon-button-brand size-10 shrink-0 rounded-full disabled:opacity-40"
              aria-label="보내기"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
        <p className="pt-2 text-center text-[11px] text-text-muted">
          <kbd className="font-sans font-semibold text-text-secondary">Enter</kbd> 전송 ·{' '}
          <kbd className="font-sans font-semibold text-text-secondary">Shift+Enter</kbd> 줄바꿈
        </p>
      </div>
    </div>
  )
}
