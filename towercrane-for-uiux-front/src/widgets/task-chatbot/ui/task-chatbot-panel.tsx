import { useRef, useEffect, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Send, Mic, MicOff, X, Bot, Loader2 } from 'lucide-react'
import { useSpeechRecognition } from '../lib/use-speech-recognition'
import { API_BASE_URL } from '../../../shared/api/http'
import { useSessionStore } from '../../../shared/store/session-store'

export function TaskChatbotPanel({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState('')

  // 절대경로 + Bearer 토큰을 붙인 커스텀 fetch (기존 apiRequest와 동일한 인증 규약).
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `${API_BASE_URL}/task-chat/stream`,
      fetch: (url, options) => {
        const token = useSessionStore.getState().token
        return fetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
      },
    }),
  })

  const isLoading = status === 'submitted' || status === 'streaming'
  const chatEndRef = useRef<HTMLDivElement>(null)

  const { isListening, startListening, stopListening, isSupported } =
    useSpeechRecognition((text) => setInput(text))

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    void sendMessage({ text })
    setInput('')
  }

  return (
    <div className="fixed bottom-28 right-8 z-50 flex h-[580px] w-[380px] flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-glass shadow-2xl backdrop-blur-md transition-all duration-300">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-brand-border/40 bg-brand-glass px-4 py-3 text-text-primary">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-brand-primary text-text-on-brand">
            <Bot className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-black">업무 비서 하이봇</h3>
            <span className="text-[10px] opacity-80">
              Vercel AI SDK & Voice
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted transition-colors hover:text-text-primary"
          aria-label="닫기"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* 대화 내역 — message.parts 순회 */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                m.role === 'user'
                  ? 'bg-brand-primary text-text-on-brand'
                  : 'bg-surface-raised text-text-primary'
              }`}
            >
              {m.parts
                .filter((p) => p.type === 'text')
                .map((p, i) => (
                  <span key={i}>{(p as { text: string }).text}</span>
                ))}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-xl bg-surface-raised/50 px-3.5 py-2.5 text-xs text-text-muted">
              <Loader2 className="size-3 animate-spin text-brand-primary" />
              답변을 생각하는 중...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 입력 영역 */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-brand-border/40 bg-surface-raised/40 p-3"
      >
        <div className="flex items-center gap-1.5 rounded-lg border border-brand-border bg-background px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-brand-primary/20">
          {isSupported && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`flex size-7 items-center justify-center rounded-md transition-colors ${
                isListening
                  ? 'animate-bounce bg-red-500/10 text-red-500'
                  : 'text-text-muted hover:bg-brand-glass hover:text-brand-primary'
              }`}
              aria-label={isListening ? '음성 인식 중지' : '음성 인식 시작'}
            >
              {isListening ? (
                <MicOff className="size-4" />
              ) : (
                <Mic className="size-4" />
              )}
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? '말씀하세요...' : '업무를 조회하거나 등록해보세요...'}
            className="flex-1 border-none bg-transparent px-1 text-xs text-text-primary outline-none disabled:opacity-50"
            disabled={isListening}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex size-7 items-center justify-center rounded-md bg-brand-primary text-text-on-brand transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            aria-label="보내기"
          >
            <Send className="size-3.5" />
          </button>
        </div>
      </form>
    </div>
  )
}
