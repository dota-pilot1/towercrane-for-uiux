import { useState, useRef, useEffect, useMemo } from 'react'
import { useChatSessionStore } from './chat-session-store'
import { API_BASE_URL } from '../../../shared/api/http'
import { useSessionStore } from '../../../shared/store/session-store'
import type { KnowledgeChannel } from '../../../entities/knowledge-base/model/types'
import type { KnowledgeSource } from './use-chat-messages'

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
  knowledgeSources?: KnowledgeSource[]
}

type StreamChunk = { text: string }
type StreamKnowledgeSources = {
  type: 'knowledge_sources'
  items: KnowledgeSource[]
}

// STEP 6-A: tool_call SSE 이벤트 타입 추가
// 백엔드 STEP 3-D에서 전송하는 이벤트를 여기서 수신
export type ToolCallLog = {
  type: 'tool_call'
  name: string
  input: Record<string, unknown>
  result: Record<string, unknown>
}

type UseFilesChatOptions = {
  // STEP 6-B: mode에 'tools' 추가
  mode?: 'general' | 'knowledge' | 'tools'
  channels?: KnowledgeChannel[]
  onToolCall?: () => void
}

import { uploadFile } from '../../../shared/api/upload'
import { useToolDialogStore } from './tool-dialog-store'

async function uploadFiles(files: File[]): Promise<string[]> {
  if (files.length === 0) return []
  return Promise.all(files.map((f) => uploadFile(f)))
}

export function useFilesChat(options: UseFilesChatOptions = {}) {
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
    setMessageSources,
    removeLastAssistantMessage,
    setSessionTitle,
  } = useChatSessionStore()

  const [input, setInput] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([])
  // STEP 6-C: 도구 호출 로그 상태 — 오른쪽 패널에 전달
  const [toolCalls, setToolCalls] = useState<ToolCallLog[]>([])
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
    const isKnowledgeMode = options.mode === 'knowledge'
    // STEP 6-D: tools 모드 시작 시 이전 로그 초기화
    if (options.mode === 'tools') setToolCalls([])

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
    if (isKnowledgeMode) setKnowledgeSources([])
    setIsStreaming(true)

    try {
      const token = useSessionStore.getState().token
      const res = await fetch(`${API_BASE_URL}/chatbot/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sessionId: currentActiveId,
          message: text,
          fileUrls,
          mode: options.mode,
          channels: options.channels,
        }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') {
            setIsStreaming(false)
            return
          }
          try {
            const parsed = JSON.parse(payload) as
              | StreamMeta
              | StreamDone
              | StreamChunk
              | StreamKnowledgeSources
              | ToolCallLog // STEP 6-E: tool_call 이벤트 타입 추가

            // STEP 6-F: tool_call 이벤트 처리 — 오른쪽 패널 상태에 누적
            if ('type' in parsed && parsed.type === 'tool_call') {
              setToolCalls((prev) => [...prev, parsed])
              options.onToolCall?.()
              // 툴 이름별 다이얼로그 트리거 — 스토어에 직접 쓰므로 콜백 불필요
              if (parsed.name === 'self_introduce') {
                useToolDialogStore.getState().setIntroDialog(
                  parsed.result as import('./tool-dialog-store').GptProfile
                )
              } else if (parsed.name === 'get_my_tasks') {
                const { tasks } = parsed.result as { tasks: import('./tool-dialog-store').TaskItem[] }
                useToolDialogStore.getState().setTasksDialog(tasks)
              }
            } else if ('type' in parsed && parsed.type === 'meta') {
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
                sources: parsed.knowledgeSources,
                timestamp: new Date(parsed.assistantMessage.createdAt),
              })
            } else if ('type' in parsed && parsed.type === 'knowledge_sources') {
              setKnowledgeSources(parsed.items)
              setMessageSources(currentActiveId, tempAssistantId, parsed.items)
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

  async function handleRegenerate() {
    if (isStreaming || !activeId) return
    const allMessages = messagesBySession[activeId] ?? []
    const lastUserMsg = [...allMessages].reverse().find((m) => m.role === 'user')
    if (!lastUserMsg) return

    removeLastAssistantMessage(activeId)

    const currentActiveId = activeId
    const tempAssistantId = `temp-assistant-${Date.now()}`
    const fileUrls = lastUserMsg.fileUrls ?? []
    const isKnowledgeMode = options.mode === 'knowledge'

    appendLocalMessage(currentActiveId, {
      id: tempAssistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    })
    if (isKnowledgeMode) setKnowledgeSources([])
    setIsStreaming(true)

    try {
      const token = useSessionStore.getState().token
      const res = await fetch(`${API_BASE_URL}/chatbot/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sessionId: currentActiveId,
          message: lastUserMsg.content,
          fileUrls,
          mode: options.mode,
          channels: options.channels,
        }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') { setIsStreaming(false); return }
          try {
            const parsed = JSON.parse(payload) as
              | StreamMeta
              | StreamDone
              | StreamChunk
              | StreamKnowledgeSources
            if ('type' in parsed && parsed.type === 'done') {
              replaceLocalMessage(currentActiveId, tempAssistantId, {
                id: parsed.assistantMessage.id,
                role: 'assistant',
                content: parsed.assistantMessage.content,
                sources: parsed.knowledgeSources,
                timestamp: new Date(parsed.assistantMessage.createdAt),
              })
            } else if ('type' in parsed && parsed.type === 'knowledge_sources') {
              setKnowledgeSources(parsed.items)
              setMessageSources(currentActiveId, tempAssistantId, parsed.items)
            } else if ('text' in parsed) {
              updateLocalChunk(currentActiveId, tempAssistantId, parsed.text)
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      console.error('재생성 오류:', err)
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
    knowledgeSources,
    // STEP 6-G: toolCalls 반환 — 페이지의 오른쪽 패널에 전달
    toolCalls,
    bottomRef,
    addSession: () => void addSession(),
    deleteSession: (id: string) => void deleteSession(id),
    switchSession: (id: string) => {
      switchSession(id)
      setInput('')
      setAttachedFiles([])
      setKnowledgeSources([])
    },
    renameSession: (id: string, title: string) => void renameSession(id, title),
    handleSend: () => void handleSend(),
    handleRegenerate: () => void handleRegenerate(),
    handleKeyDown,
  }
}
