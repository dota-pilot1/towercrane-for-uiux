import { useState } from 'react'
import { Plus, MessageSquare, Trash2, Send, Bot, User, History } from 'lucide-react'

type Message = { id: string; role: 'user' | 'assistant'; content: string }
type Session = { id: string; title: string; messages: Message[]; createdAt: Date }

const MOCK_REPLIES = [
  '알겠습니다! 더 궁금한 점이 있으신가요?',
  '좋은 질문이에요. 이 주제에 대해 더 자세히 설명해 드릴게요.',
  '맞습니다. 그 부분은 특히 중요합니다.',
]

let sessionCounter = 1

function makeSession(): Session {
  return {
    id: Date.now().toString(),
    title: `대화 ${sessionCounter++}`,
    messages: [],
    createdAt: new Date(),
  }
}

export function ChatbotHistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([makeSession()])
  const [activeId, setActiveId] = useState<string>(sessions[0].id)
  const [input, setInput] = useState('')

  const activeSession = sessions.find((s) => s.id === activeId)!

  function addSession() {
    const s = makeSession()
    setSessions((prev) => [s, ...prev])
    setActiveId(s.id)
    setInput('')
  }

  function deleteSession(id: string) {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id)
      if (next.length === 0) {
        const fresh = makeSession()
        setActiveId(fresh.id)
        return [fresh]
      }
      if (activeId === id) setActiveId(next[0].id)
      return next
    })
  }

  function handleSend() {
    const text = input.trim()
    if (!text) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text }
    const reply = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)]
    const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: reply }

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeId) return s
        const updatedMessages = [...s.messages, userMsg, botMsg]
        return {
          ...s,
          messages: updatedMessages,
          title: s.messages.length === 0 ? text.slice(0, 20) + (text.length > 20 ? '…' : '') : s.title,
        }
      }),
    )
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* 사이드바: 세션 목록 */}
      <div className="flex w-60 shrink-0 flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <History className="size-4 text-brand-primary" />
          <span className="text-sm font-semibold ui-text-primary">대화 목록</span>
          <button onClick={addSession} className="ml-auto ui-icon-button rounded-md p-1">
            <Plus className="size-4" />
          </button>
        </div>
        <div className="flex flex-col gap-1 overflow-y-auto">
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => { setActiveId(s.id); setInput('') }}
              className={`group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                s.id === activeId
                  ? 'bg-brand-glass border border-brand-border text-brand-primary'
                  : 'hover:bg-[var(--surface-muted)] ui-text-secondary'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquare className="size-3.5 shrink-0" />
                <span className="truncate">{s.title}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                className="ml-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 채팅 영역 */}
      <div className="flex flex-1 flex-col">
        <div className="mb-3 flex items-center gap-2">
          <Bot className="size-4 text-brand-primary" />
          <span className="text-sm font-semibold ui-text-primary">{activeSession.title}</span>
          <span className="ml-auto text-[11px] ui-text-muted">
            {activeSession.messages.length}개 메시지
          </span>
        </div>

        <div className="ui-panel flex-1 overflow-y-auto rounded-lg p-4">
          {activeSession.messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm ui-text-muted">메시지를 입력해 대화를 시작하세요.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {activeSession.messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                    msg.role === 'assistant' ? 'bg-brand-glass border border-brand-border' : 'bg-[var(--surface-strong)]'
                  }`}>
                    {msg.role === 'assistant'
                      ? <Bot className="size-3.5 text-brand-primary" />
                      : <User className="size-3.5 ui-text-secondary" />}
                  </div>
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-brand-glass border border-brand-border text-brand-primary'
                      : 'bg-[var(--surface-raised)] border border-[var(--surface-border-soft)] ui-text-primary'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          )}
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
            disabled={!input.trim()}
            className="ui-icon-button-brand flex items-center gap-2 self-end rounded-lg px-4 py-3 text-sm font-medium disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
