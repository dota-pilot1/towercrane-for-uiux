import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles } from 'lucide-react'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const MOCK_RESPONSES = [
  '안녕하세요! 무엇을 도와드릴까요?',
  '좋은 질문입니다. 조금 더 구체적으로 설명해 주시면 더 정확한 답변을 드릴 수 있어요.',
  '네, 이해했습니다. 해당 기능은 현재 개발 중이며 곧 추가될 예정입니다.',
  '그 부분에 대해서는 팀 내부 문서를 참고하시거나 담당자에게 문의해 주세요.',
  '도움이 됐으면 좋겠습니다! 다른 궁금한 점이 있으면 언제든 질문해 주세요.',
]

export function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: '안녕하세요! AI 어시스턴트입니다. 무엇이든 물어보세요.',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  function handleSend() {
    const text = input.trim()
    if (!text || isTyping) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      const randomResponse = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)]
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: randomResponse,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      setIsTyping(false)
    }, 1000 + Math.random() * 500)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-120px)] max-w-3xl flex-col">
      {/* 헤더 */}
      <div className="mb-4 flex items-center gap-3">
        <div className="ui-icon-button-brand rounded-md p-2.5">
          <Bot className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold ui-text-primary">AI 챗봇</h1>
          <p className="text-xs ui-text-secondary">AI 어시스턴트와 대화하세요</p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-glass px-2.5 py-1 text-[11px] font-medium text-brand-primary">
          <Sparkles className="size-3" />
          Mock 모드
        </span>
      </div>

      {/* 메시지 목록 */}
      <div className="ui-panel flex-1 overflow-y-auto rounded-lg p-4">
        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                  msg.role === 'assistant'
                    ? 'bg-brand-glass border border-brand-border'
                    : 'bg-[var(--surface-strong)]'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <Bot className="size-4 text-brand-primary" />
                ) : (
                  <User className="size-4 ui-text-secondary" />
                )}
              </div>
              <div
                className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-brand-glass border border-brand-border text-brand-primary'
                    : 'bg-[var(--surface-raised)] border border-[var(--surface-border-soft)] ui-text-primary'
                }`}
              >
                {msg.content}
                <div className="mt-1 text-[10px] ui-text-muted">
                  {msg.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-glass border border-brand-border">
                <Bot className="size-4 text-brand-primary" />
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-[var(--surface-border-soft)] bg-[var(--surface-raised)] px-4 py-3">
                <span className="size-1.5 animate-bounce rounded-full bg-[var(--text-muted)] [animation-delay:0ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-[var(--text-muted)] [animation-delay:150ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-[var(--text-muted)] [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* 입력창 */}
      <div className="mt-3 flex gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요... (Enter로 전송, Shift+Enter 줄바꿈)"
          rows={2}
          className="ui-input flex-1 resize-none rounded-lg px-4 py-3 text-sm"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="ui-icon-button-brand flex items-center gap-2 self-end rounded-lg px-4 py-3 text-sm font-medium disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  )
}
