import { useCallback, useMemo, useRef, useState } from 'react'
import {
  realtimeApi,
  type RealtimeResponseMode,
  type RealtimeSessionRequest,
  type RealtimeToolExecuteResponse,
  type RealtimeToolName,
  type RealtimeTurnMode,
} from '../../../entities/chatbot-realtime/api/realtime-api'

export type RealtimeConnectionStatus =
  | 'idle'
  | 'requesting-permission'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'disconnected'
  | 'error'

export type RealtimeTurnStatus =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'tool-calling'

export type RealtimeChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'tool'
  inputMode: 'text' | 'voice' | 'tool'
  content: string
  status: 'pending' | 'streaming' | 'done' | 'error'
  responseId?: string
  itemId?: string
  callId?: string
  createdAt: string
}

export type RealtimeEventLog = {
  id: string
  type: string
  level: 'info' | 'warning' | 'error'
  summary: string
  payload?: unknown
  createdAt: string
}

export type RealtimeToolCallLog = {
  id: string
  callId: string
  name: string
  arguments: Record<string, unknown>
  triggerMode: 'text' | 'voice' | 'manual'
  source: 'model_call' | 'manual_test' | 'manual_inject'
  status: 'pending' | 'running' | 'success' | 'error'
  resultSummary?: string
  result?: RealtimeToolExecuteResponse
  errorMessage?: string
  startedAt: string
  completedAt?: string
}

export type RealtimeChatOptions = {
  model: string
  voice: string
  language: string
  responseMode: RealtimeResponseMode
  turnMode: RealtimeTurnMode
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  responseLength: 'default' | 'short' | 'long'
  instructions: string
  enabledTools: RealtimeToolName[]
}

const defaultOptions: RealtimeChatOptions = {
  model: 'gpt-realtime-2',
  voice: 'marin',
  language: 'ko',
  responseMode: 'text_audio',
  turnMode: 'server_vad',
  difficulty: 'intermediate',
  responseLength: 'default',
  instructions: '',
  enabledTools: ['get_my_tasks'],
}

function makeId(prefix: string) {
  const value =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}_${value}`
}

function nowIso() {
  return new Date().toISOString()
}

function normalizeText(text: string) {
  return text.normalize('NFC')
}

function summarizeEvent(type: string) {
  if (type === 'session.created') return 'Realtime session created'
  if (type === 'session.updated') return 'Realtime session updated'
  if (type === 'input_audio_buffer.speech_started') return 'User speech started'
  if (type === 'input_audio_buffer.speech_stopped') return 'User speech stopped'
  if (type === 'response.created') return 'Assistant response started'
  if (type === 'response.done') return 'Assistant response completed'
  if (type === 'rate_limits.updated') return 'Rate limit updated'
  if (type === 'error') return 'Realtime error'
  return type
}

function parseJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function collectAssistantTexts(value: unknown, texts: string[] = []) {
  if (!value || typeof value !== 'object') return texts

  if (Array.isArray(value)) {
    value.forEach((item) => collectAssistantTexts(item, texts))
    return texts
  }

  const record = value as Record<string, unknown>
  const type = typeof record.type === 'string' ? record.type : ''
  const transcript = typeof record.transcript === 'string' ? record.transcript.trim() : ''
  const text = typeof record.text === 'string' ? record.text.trim() : ''

  if (transcript && (type.includes('audio') || type === 'output_audio')) {
    texts.push(transcript)
  } else if (text && (type.includes('text') || type === 'output_text')) {
    texts.push(text)
  }

  Object.values(record).forEach((child) => collectAssistantTexts(child, texts))
  return texts
}

function extractAssistantText(payload: unknown) {
  const seen = new Set<string>()
  return collectAssistantTexts(payload)
    .map((text) => normalizeText(text))
    .filter((text) => {
      if (!text || seen.has(text)) return false
      seen.add(text)
      return true
    })
    .join('\n')
    .trim()
}

export function useRealtimeChat() {
  const [status, setStatus] = useState<RealtimeConnectionStatus>('idle')
  const [turnStatus, setTurnStatus] = useState<RealtimeTurnStatus>('idle')
  const [messages, setMessages] = useState<RealtimeChatMessage[]>([])
  const [eventLogs, setEventLogs] = useState<RealtimeEventLog[]>([])
  const [toolLogs, setToolLogs] = useState<RealtimeToolCallLog[]>([])
  const [options, setOptions] = useState<RealtimeChatOptions>(defaultOptions)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [sessionModel, setSessionModel] = useState<string | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const optionsRef = useRef(options)
  const completedAssistantTextKeysRef = useRef<Set<string>>(new Set())

  const isConnected = status === 'connected'

  const addEventLog = useCallback(
    (type: string, payload?: unknown, level: RealtimeEventLog['level'] = 'info') => {
      setEventLogs((prev) => [
        {
          id: makeId('evt'),
          type,
          level,
          summary: summarizeEvent(type),
          payload,
          createdAt: nowIso(),
        },
        ...prev,
      ].slice(0, 120))
    },
    [],
  )

  const sendJson = useCallback((payload: Record<string, unknown>) => {
    const dc = dcRef.current
    if (!dc || dc.readyState !== 'open') {
      throw new Error('Realtime data channel is not open.')
    }
    dc.send(JSON.stringify(payload))
  }, [])

  const responseModalities = useCallback(() => {
    const mode = optionsRef.current.responseMode
    if (mode === 'text_only') return ['text']
    return ['audio']
  }, [])

  const sendResponseCreate = useCallback(() => {
    sendJson({
      type: 'response.create',
      response: {
        output_modalities: responseModalities(),
      },
    })
  }, [responseModalities, sendJson])

  const appendAssistantDelta = useCallback((delta: string, responseId?: string) => {
    const text = normalizeText(delta)
    setMessages((prev) => {
      const activeIndex = [...prev]
        .reverse()
        .findIndex((msg) => msg.role === 'assistant' && msg.status === 'streaming')
      if (activeIndex >= 0) {
        const index = prev.length - 1 - activeIndex
        return prev.map((msg, msgIndex) =>
          msgIndex === index
            ? { ...msg, content: `${msg.content}${text}`, responseId: responseId ?? msg.responseId }
            : msg,
        )
      }

      return [
        ...prev,
        {
          id: makeId('assistant'),
          role: 'assistant',
          inputMode: optionsRef.current.responseMode === 'text_only' ? 'text' : 'voice',
          content: text,
          status: 'streaming',
          responseId,
          createdAt: nowIso(),
        },
      ]
    })
  }, [])

  const completeAssistantMessage = useCallback((text?: string, responseId?: string, itemId?: string) => {
    const normalizedText = text?.trim() ? normalizeText(text) : ''
    const itemDedupeKey = normalizedText
      ? `${responseId ?? 'response'}:${itemId ?? normalizedText}`
      : ''
    const textDedupeKey = normalizedText
      ? `${responseId ?? 'response'}:text:${normalizedText}`
      : ''
    if (
      (itemDedupeKey && completedAssistantTextKeysRef.current.has(itemDedupeKey)) ||
      (textDedupeKey && completedAssistantTextKeysRef.current.has(textDedupeKey))
    ) {
      return
    }

    setMessages((prev) => {
      if (
        normalizedText &&
        prev.some(
          (msg) =>
            msg.role === 'assistant' &&
            msg.content.trim() === normalizedText &&
            (!responseId || msg.responseId === responseId),
        )
      ) {
        if (itemDedupeKey) completedAssistantTextKeysRef.current.add(itemDedupeKey)
        if (textDedupeKey) completedAssistantTextKeysRef.current.add(textDedupeKey)
        return prev
      }

      const activeIndex = [...prev]
        .reverse()
        .findIndex((msg) => msg.role === 'assistant' && msg.status === 'streaming')
      if (activeIndex < 0) {
        if (!normalizedText) return prev
        if (itemDedupeKey) completedAssistantTextKeysRef.current.add(itemDedupeKey)
        if (textDedupeKey) completedAssistantTextKeysRef.current.add(textDedupeKey)
        return [
          ...prev,
          {
            id: makeId('assistant'),
            role: 'assistant',
            inputMode: optionsRef.current.responseMode === 'text_only' ? 'text' : 'voice',
            content: normalizedText,
            status: 'done',
            responseId,
            itemId,
            createdAt: nowIso(),
          },
        ]
      }
      const index = prev.length - 1 - activeIndex
      if (itemDedupeKey) completedAssistantTextKeysRef.current.add(itemDedupeKey)
      if (textDedupeKey) completedAssistantTextKeysRef.current.add(textDedupeKey)
      return prev.map((msg, msgIndex) =>
        msgIndex === index
          ? {
              ...msg,
              content: normalizedText || msg.content,
              responseId: responseId ?? msg.responseId,
              itemId: itemId ?? msg.itemId,
              status: 'done',
            }
          : msg,
      )
    })
  }, [])

  const updateToolLog = useCallback(
    (id: string, patch: Partial<RealtimeToolCallLog>) => {
      setToolLogs((prev) => prev.map((log) => (log.id === id ? { ...log, ...patch } : log)))
    },
    [],
  )

  const injectToolResult = useCallback(
    (toolResult: RealtimeToolExecuteResponse) => {
      sendJson({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: toolResult.callId,
          output: JSON.stringify({
            summary: toolResult.summary,
            result: toolResult.result,
          }),
        },
      })
      sendResponseCreate()
      setMessages((prev) => [
        ...prev,
        {
          id: makeId('tool'),
          role: 'tool',
          inputMode: 'tool',
          content: toolResult.summary,
          status: 'done',
          callId: toolResult.callId,
          createdAt: nowIso(),
        },
      ])
      addEventLog('tool.result.injected', toolResult)
    },
    [addEventLog, sendJson, sendResponseCreate],
  )

  const executeModelTool = useCallback(
    async (item: Record<string, unknown>) => {
      const name = typeof item.name === 'string' ? item.name : ''
      const callId = typeof item.call_id === 'string' ? item.call_id : ''
      if (!name || !callId) return

      const args =
        typeof item.arguments === 'string'
          ? parseJsonObject(item.arguments)
          : item.arguments && typeof item.arguments === 'object'
            ? (item.arguments as Record<string, unknown>)
            : {}

      const logId = makeId('tool')
      const startedAt = nowIso()
      setTurnStatus('tool-calling')
      setToolLogs((prev) => [
        {
          id: logId,
          callId,
          name,
          arguments: args,
          triggerMode: 'text',
          source: 'model_call',
          status: 'running',
          startedAt,
        },
        ...prev,
      ])

      try {
        const result = await realtimeApi.executeTool({
          callId,
          name: name as RealtimeToolName,
          source: 'realtime',
          arguments: args,
        })
        updateToolLog(logId, {
          status: 'success',
          result,
          resultSummary: result.summary,
          completedAt: nowIso(),
        })
        injectToolResult(result)
      } catch (error) {
        const message = error instanceof Error ? error.message : '도구 실행에 실패했습니다.'
        updateToolLog(logId, {
          status: 'error',
          errorMessage: message,
          completedAt: nowIso(),
        })
        setErrorMessage(message)
        addEventLog('tool.error', { name, callId, message }, 'error')
      } finally {
        setTurnStatus('idle')
      }
    },
    [addEventLog, injectToolResult, updateToolLog],
  )

  const handleRealtimeEvent = useCallback(
    (event: Record<string, unknown>) => {
      const type = typeof event.type === 'string' ? event.type : 'unknown'
      addEventLog(type, event, type === 'error' ? 'error' : 'info')

      if (type === 'input_audio_buffer.speech_started') setTurnStatus('listening')
      if (type === 'input_audio_buffer.speech_stopped') setTurnStatus('thinking')
      if (type === 'response.created') setTurnStatus('thinking')
      if (type === 'response.audio.delta') setTurnStatus('speaking')
      if (type === 'response.done') {
        completeAssistantMessage(
          extractAssistantText(event),
          typeof event.response_id === 'string' ? event.response_id : undefined,
          'response.done',
        )
        setTurnStatus('idle')
      }
      if (type === 'error') {
        const error = event.error as { message?: string } | undefined
        setErrorMessage(error?.message ?? 'Realtime 오류가 발생했습니다.')
        setTurnStatus('idle')
        setStatus(dcRef.current?.readyState === 'open' ? 'connected' : 'error')
      }

      if (
        type === 'conversation.item.input_audio_transcription.completed' &&
        typeof event.transcript === 'string'
      ) {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId('user_voice'),
            role: 'user',
            inputMode: 'voice',
            content: normalizeText(event.transcript),
            status: 'done',
            itemId: typeof event.item_id === 'string' ? event.item_id : undefined,
            createdAt: nowIso(),
          },
        ])
      }

      if (
        (type === 'response.output_text.delta' || type === 'response.audio_transcript.delta') &&
        typeof event.delta === 'string'
      ) {
        appendAssistantDelta(
          event.delta,
          typeof event.response_id === 'string' ? event.response_id : undefined,
        )
      }

      if (
        (type === 'response.output_text.done' || type === 'response.audio_transcript.done') &&
        (typeof event.text === 'string' || typeof event.transcript === 'string')
      ) {
        completeAssistantMessage(
          typeof event.text === 'string' ? event.text : (event.transcript as string),
          typeof event.response_id === 'string' ? event.response_id : undefined,
          typeof event.item_id === 'string' ? event.item_id : undefined,
        )
      }

      if (
        type === 'response.output_item.done' &&
        event.item &&
        typeof event.item === 'object'
      ) {
        const item = event.item as Record<string, unknown>
        if (item.type === 'function_call') {
          void executeModelTool(item)
          return
        }
        completeAssistantMessage(
          extractAssistantText(item),
          typeof event.response_id === 'string' ? event.response_id : undefined,
          typeof event.item_id === 'string'
            ? event.item_id
            : typeof item.id === 'string'
              ? item.id
              : undefined,
        )
      }
    },
    [addEventLog, appendAssistantDelta, completeAssistantMessage, executeModelTool],
  )

  const bindDataChannel = useCallback(
    (channel: RTCDataChannel) => {
      dcRef.current = channel
      channel.onopen = () => {
        setStatus('connected')
        setTurnStatus('idle')
        addEventLog('data_channel.open')
      }
      channel.onclose = () => {
        addEventLog('data_channel.closed')
      }
      channel.onerror = () => {
        setStatus('error')
        setErrorMessage('Realtime data channel 오류가 발생했습니다.')
        addEventLog('data_channel.error', undefined, 'error')
      }
      channel.onmessage = (event) => {
        if (event.data instanceof Blob) {
          void event.data.text().then((text) => {
            const parsed = parseJsonObject(text)
            handleRealtimeEvent(parsed)
          })
          return
        }

        const raw =
          event.data instanceof ArrayBuffer
            ? new TextDecoder('utf-8').decode(event.data)
            : String(event.data ?? '')
        const parsed = parseJsonObject(raw)
        handleRealtimeEvent(parsed)
      }
    },
    [addEventLog, handleRealtimeEvent],
  )

  const disconnect = useCallback(() => {
    setStatus((current) => (current === 'idle' ? current : 'disconnecting'))
    try {
      dcRef.current?.close()
    } catch {
      // Ignore cleanup errors.
    }
    try {
      pcRef.current?.close()
    } catch {
      // Ignore cleanup errors.
    }
    try {
      localStreamRef.current?.getTracks().forEach((track) => track.stop())
    } catch {
      // Ignore cleanup errors.
    }
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null
    }
    pcRef.current = null
    dcRef.current = null
    localStreamRef.current = null
    setTurnStatus('idle')
    setStatus('disconnected')
  }, [])

  const connect = useCallback(async () => {
    setErrorMessage(null)
    setStatus('requesting-permission')
    optionsRef.current = options

    try {
      const media = navigator.mediaDevices
      if (!media?.getUserMedia) {
        throw new Error('이 브라우저에서 마이크 API를 사용할 수 없습니다.')
      }

      const localStream = await media.getUserMedia({ audio: true })
      localStreamRef.current = localStream
      setStatus('connecting')

      const sessionRequest: RealtimeSessionRequest = {
        model: options.model,
        voice: options.voice,
        language: options.language,
        turnMode: options.turnMode,
        responseMode: options.responseMode,
        instructions: [
          `난이도: ${options.difficulty}`,
          `응답 길이: ${options.responseLength}`,
          options.instructions,
        ]
          .filter(Boolean)
          .join('\n'),
        enabledTools: options.enabledTools,
      }
      const session = await realtimeApi.createSession(sessionRequest)
      setSessionModel(session.model)

      const pc = new RTCPeerConnection()
      pcRef.current = pc
      const remoteStream = new MediaStream()
      pc.ontrack = (event) => {
        remoteStream.addTrack(event.track)
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = remoteStream
          void audioElementRef.current.play().catch(() => undefined)
        }
      }
      pc.ondatachannel = (event) => bindDataChannel(event.channel)
      bindDataChannel(pc.createDataChannel('oai-events'))
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      })
      await pc.setLocalDescription(offer)

      const answer = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp ?? '',
      })

      if (!answer.ok) {
        const details = await answer.text()
        throw new Error(`OpenAI Realtime 연결 실패 (${answer.status}): ${details}`)
      }

      await pc.setRemoteDescription({
        type: 'answer',
        sdp: await answer.text(),
      })
      addEventLog('webrtc.connected', { model: session.model, voice: session.voice })
    } catch (error) {
      disconnect()
      const message = error instanceof Error ? error.message : 'Realtime 연결에 실패했습니다.'
      setErrorMessage(message)
      setStatus('error')
      addEventLog('connect.error', { message }, 'error')
    }
  }, [addEventLog, bindDataChannel, disconnect, options])

  const sendText = useCallback(
    (content: string) => {
      const text = content.trim()
      if (!text) return
      sendJson({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text }],
        },
      })
      setMessages((prev) => [
        ...prev,
        {
          id: makeId('user_text'),
          role: 'user',
          inputMode: 'text',
          content: text,
          status: 'done',
          createdAt: nowIso(),
        },
      ])
      setTurnStatus('thinking')
      sendResponseCreate()
    },
    [sendJson, sendResponseCreate],
  )

  const executeManualTool = useCallback(
    async (name: RealtimeToolName, args: Record<string, unknown>) => {
      const logId = makeId('manual_tool')
      setToolLogs((prev) => [
        {
          id: logId,
          callId: `manual_${logId}`,
          name,
          arguments: args,
          triggerMode: 'manual',
          source: 'manual_test',
          status: 'running',
          startedAt: nowIso(),
        },
        ...prev,
      ])

      try {
        const result = await realtimeApi.executeTool({
          callId: `manual_${logId}`,
          name,
          source: 'manual_test',
          arguments: args,
        })
        updateToolLog(logId, {
          callId: result.callId,
          status: 'success',
          result,
          resultSummary: result.summary,
          completedAt: nowIso(),
        })
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : '도구 실행에 실패했습니다.'
        updateToolLog(logId, {
          status: 'error',
          errorMessage: message,
          completedAt: nowIso(),
        })
        throw error
      }
    },
    [updateToolLog],
  )

  const setAudioElement = useCallback((element: HTMLAudioElement | null) => {
    audioElementRef.current = element
  }, [])

  const updateOptions = useCallback((nextOptions: RealtimeChatOptions) => {
    optionsRef.current = nextOptions
    setOptions(nextOptions)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setErrorMessage(null)
    completedAssistantTextKeysRef.current.clear()
  }, [])

  return useMemo(
    () => ({
      status,
      turnStatus,
      messages,
      eventLogs,
      toolLogs,
      options,
      errorMessage,
      sessionModel,
      isConnected,
      connect,
      disconnect,
      sendText,
      setAudioElement,
      setOptions: updateOptions,
      executeManualTool,
      injectToolResult,
      clearMessages,
    }),
    [
      clearMessages,
      connect,
      disconnect,
      errorMessage,
      eventLogs,
      executeManualTool,
      injectToolResult,
      isConnected,
      messages,
      options,
      sendText,
      sessionModel,
      setAudioElement,
      status,
      toolLogs,
      turnStatus,
      updateOptions,
    ],
  )
}
