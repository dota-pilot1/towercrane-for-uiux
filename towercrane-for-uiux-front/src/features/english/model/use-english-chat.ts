import { useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '../../../shared/api/http'
import { useSessionStore } from '../../../shared/store/session-store'

export type EnglishMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const GREETING: EnglishMessage = {
  id: '0',
  role: 'assistant',
  content:
    "Hi! I'm your English tutor. Let's chat in English. What did you work on today?",
}

// 기존 챗봇 SSE 규약과 동일: data:{text} → data:{type:done} → data:[DONE]
export function useEnglishChat() {
  const [messages, setMessages] = useState<EnglishMessage[]>([GREETING])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  async function handleSend() {
    const text = input.trim()
    if (!text || isStreaming) return

    const userMsg: EnglishMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    }
    const assistantId = (Date.now() + 1).toString()

    // 서버로 보낼 히스토리 (빈 placeholder 제외, 직전까지 + 새 user 메시지)
    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }))

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: 'assistant', content: '' },
    ])
    setInput('')
    setIsStreaming(true)

    const appendChunk = (chunk: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: m.content + chunk } : m,
        ),
      )
    }

    try {
      const token = useSessionStore.getState().token
      const res = await fetch(`${API_BASE_URL}/english-chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: history }),
      })

      if (res.status === 401) useSessionStore.getState().clearSession()
      if (!res.ok || !res.body) throw new Error(`요청 실패: ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const handlePayload = (payload: string): boolean => {
        if (payload === '[DONE]') return true
        try {
          const parsed = JSON.parse(payload) as { text?: unknown }
          if (typeof parsed.text === 'string') appendChunk(parsed.text)
        } catch {
          // 비-콘텐츠 SSE 페이로드 무시
        }
        return false
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''
        for (const event of events) {
          for (const line of event.split('\n')) {
            if (!line.startsWith('data: ')) continue
            if (handlePayload(line.slice(6).trim())) return
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류'
      appendChunk(`\n(오류가 발생했습니다: ${message})`)
    } finally {
      setIsStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return {
    messages,
    input,
    setInput,
    isStreaming,
    bottomRef,
    handleSend: () => void handleSend(),
    handleKeyDown,
  }
}
