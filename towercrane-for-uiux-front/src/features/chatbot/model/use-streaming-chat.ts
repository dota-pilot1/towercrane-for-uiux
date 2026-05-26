import { useState, useRef, useEffect } from 'react'
import type { Message } from './use-chat-messages'
import { API_BASE_URL, apiRequest } from '../../../shared/api/http'
import { useSessionStore } from '../../../shared/store/session-store'

type SessionDto = {
  id: string
}

type StreamChunk = {
  text?: unknown
}

export function useStreamingChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: '스트리밍 응답 실습 페이지입니다. 메시지를 보내면 타이핑되듯 응답이 출력됩니다.',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef('')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  async function handleSend() {
    const text = input.trim()
    if (!text || isStreaming) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    const assistantMsgId = (Date.now() + 1).toString()
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInput('')
    setIsStreaming(true)

    try {
      if (!sessionIdRef.current) {
        const session = await apiRequest<SessionDto>('/chatbot/sessions', {
          method: 'POST',
          body: JSON.stringify({ title: '스트리밍 세션' }),
        })
        sessionIdRef.current = session.id
      }

      const token = useSessionStore.getState().token
      const res = await fetch(`${API_BASE_URL}/chatbot/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId: sessionIdRef.current, message: text }),
      })

      if (res.status === 401) {
        useSessionStore.getState().clearSession()
      }

      if (!res.ok) {
        let message = `요청 실패: ${res.status}`
        try {
          const data = (await res.json()) as { message?: string | string[] }
          if (Array.isArray(data.message)) message = data.message.join(', ')
          else if (data.message) message = data.message
        } catch {
          // Keep fallback message for non-JSON error responses.
        }
        throw new Error(message)
      }

      if (!res.body) {
        throw new Error('스트리밍 응답 본문이 없습니다.')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const appendChunk = (chunk: string) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: m.content + chunk }
              : m,
          ),
        )
      }

      const handlePayload = (payload: string) => {
        if (payload === '[DONE]') {
          setIsStreaming(false)
          return true
        }

        try {
          const parsed = JSON.parse(payload) as StreamChunk
          if (typeof parsed.text === 'string') {
            appendChunk(parsed.text)
          }
        } catch {
          // Ignore malformed or non-content SSE payloads.
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
          const payloads = event
            .split('\n')
            .filter((line) => line.startsWith('data: '))
            .map((line) => line.slice(6).trim())

          for (const payload of payloads) {
            if (handlePayload(payload)) return
          }
        }
      }

      buffer += decoder.decode()
      for (const line of buffer.split('\n')) {
        if (!line.startsWith('data: ')) continue
        if (handlePayload(line.slice(6).trim())) return
      }
    } catch (err) {
      console.error('스트리밍 오류:', err)
      const message =
        err instanceof Error
          ? err.message
          : '스트리밍 중 알 수 없는 오류가 발생했습니다.'
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: `오류가 발생했습니다. ${message}` }
            : m,
        ),
      )
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

  return { messages, input, setInput, isStreaming, bottomRef, handleSend: () => void handleSend(), handleKeyDown }
}
