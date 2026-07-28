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

type StreamChunk = { type: 'text'; text: string }

// STEP 6-A: tool_call SSE 이벤트 타입 추가
// 백엔드 STEP 3-D에서 전송하는 이벤트를 여기서 수신
export type ToolCallLog = {
  type: 'tool_call'
  name: string
  input: Record<string, unknown>
  result: Record<string, unknown>
}

/** 서버가 보내는 프레임 5종 — shared/api/sse.ts가 type으로 분기한다 */
type ChatFrame =
  | StreamMeta
  | StreamDone
  | StreamChunk
  | ToolCallLog

type UseFilesChatOptions = {
  mode?: 'general' | 'tools'
  onToolCall?: () => void
}

import { uploadFile } from '../../../shared/api/upload'
import { readSseStream } from '../../../shared/api/sse'
import { useToolDialogStore } from './tool-dialog-store'
import type { GptProfile, TaskItem } from './tool-dialog-store'

async function uploadFiles(files: File[]): Promise<string[]> {
  if (files.length === 0) return []
  return Promise.all(files.map((f) => uploadFile(f)))
}

// 모드마다 엔드포인트가 다르다 — DevTools Network 탭에서 URL 만 보고 구분된다
function streamUrl(mode: UseFilesChatOptions['mode']) {
  if (mode === 'tools') return `${API_BASE_URL}/chatbot/stream/tools`
  return `${API_BASE_URL}/chatbot/stream`
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
    removeLastAssistantMessage,
    setSessionTitle,
  } = useChatSessionStore()

  const [input, setInput] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
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
    setIsStreaming(true)

    try {
      const token = useSessionStore.getState().token
      const res = await fetch(streamUrl(options.mode), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sessionId: currentActiveId,
          message: text,
          fileUrls,
        }),
      })

      const result = await readSseStream<ChatFrame>(res, {
        text: (f) => updateLocalChunk(currentActiveId, tempAssistantId, f.text),

        meta: (f) => {
          replaceLocalMessage(currentActiveId, tempUserId, {
            id: f.userMessage.id,
            role: 'user',
            content: f.userMessage.content,
            fileUrls,
            timestamp: new Date(f.userMessage.createdAt),
          })
          setSessionTitle(currentActiveId, f.sessionTitle)
        },

        done: (f) => {
          replaceLocalMessage(currentActiveId, tempAssistantId, {
            id: f.assistantMessage.id,
            role: 'assistant',
            content: f.assistantMessage.content,
            timestamp: new Date(f.assistantMessage.createdAt),
          })
        },

        tool_call: (f) => {
          setToolCalls((prev) => [...prev, f])
          options.onToolCall?.()
          // 툴 이름별 다이얼로그 트리거 — 스토어에 직접 쓰므로 콜백 불필요
          if (f.name === 'self_introduce') {
            useToolDialogStore.getState().setIntroDialog(f.result as GptProfile)
          } else if (f.name === 'get_my_tasks') {
            const { tasks } = f.result as { tasks: TaskItem[] }
            useToolDialogStore.getState().setTasksDialog(tasks)
          }
        },
      })

      // [DONE] 없이 끊겼다 — 답변이 중간에 잘렸으니 사용자에게 알린다
      if (!result.ok) {
        updateLocalChunk(
          currentActiveId,
          tempAssistantId,
          '\n\n(연결이 끊겨 답변이 중단되었습니다)',
        )
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

    appendLocalMessage(currentActiveId, {
      id: tempAssistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    })
    setIsStreaming(true)

    try {
      const token = useSessionStore.getState().token
      const res = await fetch(streamUrl(options.mode), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sessionId: currentActiveId,
          message: lastUserMsg.content,
          fileUrls,
        }),
      })

      const result = await readSseStream<ChatFrame>(res, {
        text: (f) => updateLocalChunk(currentActiveId, tempAssistantId, f.text),

        done: (f) => {
          replaceLocalMessage(currentActiveId, tempAssistantId, {
            id: f.assistantMessage.id,
            role: 'assistant',
            content: f.assistantMessage.content,
            timestamp: new Date(f.assistantMessage.createdAt),
          })
        },

        tool_call: (f) => {
          setToolCalls((prev) => [...prev, f])
          options.onToolCall?.()
          if (f.name === 'self_introduce') {
            useToolDialogStore.getState().setIntroDialog(f.result as GptProfile)
          } else if (f.name === 'get_my_tasks') {
            const { tasks } = f.result as { tasks: TaskItem[] }
            useToolDialogStore.getState().setTasksDialog(tasks)
          }
        },

        // meta는 서버가 보내지만 등록하지 않는다 — 재생성은 사용자 메시지를
        // 새로 그리지 않으므로 쓸 데가 없다. 핸들러가 없으면 조용히 무시된다.
      })

      if (!result.ok) {
        updateLocalChunk(
          currentActiveId,
          tempAssistantId,
          '\n\n(연결이 끊겨 답변이 중단되었습니다)',
        )
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
    // STEP 6-G: toolCalls 반환 — 페이지의 오른쪽 패널에 전달
    toolCalls,
    bottomRef,
    addSession: () => void addSession(),
    deleteSession: (id: string) => void deleteSession(id),
    switchSession: (id: string) => {
      switchSession(id)
      setInput('')
      setAttachedFiles([])
    },
    renameSession: (id: string, title: string) => void renameSession(id, title),
    handleSend: () => void handleSend(),
    handleRegenerate: () => void handleRegenerate(),
    handleKeyDown,
  }
}
