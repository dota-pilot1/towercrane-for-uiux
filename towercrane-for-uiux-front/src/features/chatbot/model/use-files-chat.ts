import { useState, useRef, useEffect, useMemo } from 'react'
import { useChatSessionStore } from './chat-session-store'
import { API_BASE_URL } from '../../../shared/api/http'
import { useSessionStore } from '../../../shared/store/session-store'

export type { Session } from './chat-session-store'

type StreamMeta = {
  type: 'meta'
  userMessage: {
    id: string
    sessionId: string
    role: 'user'
    content: string
    createdAt: string
  }
  sessionTitle: string
}

type StreamDone = {
  type: 'done'
  assistantMessage: {
    id: string
    sessionId: string
    role: 'assistant'
    content: string
    createdAt: string
  }
}

type StreamChunk = { text: string }

import { uploadFile } from '../../../shared/api/upload'

async function uploadFiles(files: File[]): Promise<string[]> {
  if (files.length === 0) return []
  return Promise.all(files.map((f) => uploadFile(f)))
}

export function useFilesChat() {
  const {
    sessions,
    activeId,
    messagesBySession,
    loaded,
    loadSessions,
    addSession,
    deleteSession,
    switchSession,
    renameSession,
    appendLocalMessage,
    updateLocalChunk,
    replaceLocalMessage,
    setSessionTitle,
  } = useChatSessionStore()

  const [input, setInput] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loaded) void loadSessions()
  }, [loaded, loadSessions])

  const activeSession = sessions.find((s) => s.id === activeId)
  const messages = useMemo(
    () => messagesBySession[activeId] ?? [],
    [messagesBySession, activeId],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  async function handleSend() {
    const text = input.trim()
    if (!text && attachedFiles.length === 0) return
    if (isStreaming || !activeId) return

    const currentActiveId = activeId
    const tempUserId = `temp-user-${Date.now()}`
    const tempAssistantId = `temp-assistant-${Date.now()}`

    // 파일 업로드 먼저
    const fileUrls = await uploadFiles(attachedFiles)

    appendLocalMessage(currentActiveId, {
      id: tempUserId,
      role: 'user',
      content: text || '(파일 첨부)',
      fileUrls,
      timestamp: new Date(),
    })
    appendLocalMessage(currentActiveId, {
      id: tempAssistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    })
    setInput('')
    setAttachedFiles([])
    setIsStreaming(true)

    try {
      const token = useSessionStore.getState().token
      const res = await fetch(`${API_BASE_URL}/chatbot/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId: currentActiveId, message: text, fileUrls }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') {
            setIsStreaming(false)
            return
          }
          try {
            const parsed = JSON.parse(payload) as StreamMeta | StreamDone | StreamChunk

            if ('type' in parsed && parsed.type === 'meta') {
              replaceLocalMessage(currentActiveId, tempUserId, {
                id: parsed.userMessage.id,
                role: 'user',
                content: parsed.userMessage.content,
                fileUrls,
                timestamp: new Date(parsed.userMessage.createdAt),
              })
              setSessionTitle(currentActiveId, parsed.sessionTitle)
            } else if ('type' in parsed && parsed.type === 'done') {
              replaceLocalMessage(currentActiveId, tempAssistantId, {
                id: parsed.assistantMessage.id,
                role: 'assistant',
                content: parsed.assistantMessage.content,
                timestamp: new Date(parsed.assistantMessage.createdAt),
              })
            } else if ('text' in parsed) {
              updateLocalChunk(currentActiveId, tempAssistantId, parsed.text)
            }
          } catch {
            // 빈 줄 등 파싱 불가 라인 무시
          }
        }
      }
    } catch (err) {
      console.error('스트리밍 오류:', err)
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
    sessions,
    activeSession: activeSession ?? { id: '', title: '로딩 중...', messages: [], createdAt: new Date(), updatedAt: new Date() },
    messages,
    activeId,
    input,
    setInput,
    attachedFiles,
    setAttachedFiles,
    isStreaming,
    bottomRef,
    addSession: () => void addSession(),
    deleteSession: (id: string) => void deleteSession(id),
    switchSession: (id: string) => { switchSession(id); setInput(''); setAttachedFiles([]) },
    renameSession: (id: string, title: string) => void renameSession(id, title),
    handleSend: () => void handleSend(),
    handleKeyDown,
  }
}
