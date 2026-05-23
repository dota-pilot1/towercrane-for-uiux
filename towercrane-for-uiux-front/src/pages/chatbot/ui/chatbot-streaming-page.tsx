import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Zap } from 'lucide-react'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

const MOCK_LONG_RESPONSES = [
  '스트리밍 응답은 실제 AI API에서 서버가 토큰을 생성할 때마다 클라이언트로 전송하는 방식입니다. SSE(Server-Sent Events) 또는 WebSocket을 통해 구현하며, 사용자 경험을 크게 향상시킵니다.',
  'Claude API에서는 stream 옵션을 true로 설정하면 됩니다. 응답이 청크 단위로 전달되고, 각 청크를 받을 때마다 UI를 업데이트합니다. React에서는 useState로 누적 텍스트를 관리하면 됩니다.',
  'React에서 스트리밍을 구현할 때는 ReadableStream을 사용합니다. getReader()로 스트림 리더를 얻고, read() 메서드를 반복 호출하여 청크를 읽습니다. TextDecoder로 바이트를 문자열로 변환합니다.',
]

export function ChatbotStreamingPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: '스트리밍 응답 실습 페이지입니다. 메시지를 보내면 타이핑되듯 응답이 출력됩니다.',
    },
  ])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function simulateStream(fullText: string, msgId: string) {
    let charIndex = 0
    setIsStreaming(true)

    streamIntervalRef.current = setInterval(() => {
      charIndex += Math.floor(Math.random() * 3) + 1
      const chunk = fullText.slice(0, charIndex)

      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, content: chunk, isStreaming: charIndex < fullText.length } : m)),
      )

      if (charIndex >= fullText.length) {
        clearInterval(streamIntervalRef.current!)
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, content: fullText, isStreaming: false } : m)),
        )
        setIsStreaming(false)
      }
    }, 30)
  }

  function handleSend() {
    const text = input.trim()
    if (!text || isStreaming) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text }
    const assistantMsgId = (Date.now() + 1).toString()
    const assistantMsg: Message = { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInput('')

    setTimeout(() => {
      const reply = MOCK_LONG_RESPONSES[Math.floor(Math.random() * MOCK_LONG_RESPONSES.length)]
      simulateStream(reply, assistantMsgId)
    }, 300)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-120px)] max-w-3xl flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="ui-icon-button-brand rounded-md p-2.5">
          <Zap className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold ui-text-primary">스트리밍 응답</h1>
          <p className="text-xs ui-text-secondary">SSE 스트리밍 시뮬레이션 · 타이핑 효과 구현 실습</p>
        </div>
        <span className="ml-auto rounded-full border border-brand-border bg-brand-glass px-2.5 py-1 text-[11px] font-medium text-brand-primary">
          Simulated SSE
        </span>
      </div>

      <div className="ui-panel flex-1 overflow-y-auto rounded-lg p-4">
        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                msg.role === 'assistant' ? 'bg-brand-glass border border-brand-border' : 'bg-[var(--surface-strong)]'
              }`}>
                {msg.role === 'assistant'
                  ? <Bot className="size-4 text-brand-primary" />
                  : <User className="size-4 ui-text-secondary" />}
              </div>
              <div className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand-glass border border-brand-border text-brand-primary'
                  : 'bg-[var(--surface-raised)] border border-[var(--surface-border-soft)] ui-text-primary'
              }`}>
                {msg.content}
                {msg.isStreaming && (
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-brand-primary align-middle" />
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          rows={2}
          className="ui-input flex-1 resize-none rounded-lg px-4 py-3 text-sm"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          className="ui-icon-button-brand flex items-center gap-2 self-end rounded-lg px-4 py-3 text-sm font-medium disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  )
}
