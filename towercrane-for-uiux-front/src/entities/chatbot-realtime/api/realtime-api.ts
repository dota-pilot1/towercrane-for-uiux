import { apiRequest } from '../../../shared/api/http'

export type RealtimeResponseMode = 'text_audio' | 'text_only' | 'audio_only'
export type RealtimeTurnMode = 'server_vad' | 'push_to_talk'

export type RealtimeSessionRequest = {
  model?: string
  voice?: string
  language?: string
  turnMode?: RealtimeTurnMode
  responseMode?: RealtimeResponseMode
  instructions?: string
  enabledTools?: string[]
}

export type RealtimeSessionResponse = {
  type: 'client_secret'
  token: string
  model: string
  voice: string
  expiresAt?: number
  tools: string[]
}

export type RealtimeToolName = 'get_my_tasks'

export type RealtimeToolExecuteRequest = {
  callId?: string
  name: RealtimeToolName
  source?: 'realtime' | 'manual_test'
  arguments?: Record<string, unknown>
}

export type RealtimeToolExecuteResponse = {
  callId: string
  name: string
  result: {
    count?: number
    items?: unknown[]
    [key: string]: unknown
  }
  summary: string
}

export const realtimeApi = {
  createSession(body: RealtimeSessionRequest) {
    return apiRequest<RealtimeSessionResponse>('/chatbot/realtime/session', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  executeTool(body: RealtimeToolExecuteRequest) {
    return apiRequest<RealtimeToolExecuteResponse>('/chatbot/realtime/tools/execute', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
}
