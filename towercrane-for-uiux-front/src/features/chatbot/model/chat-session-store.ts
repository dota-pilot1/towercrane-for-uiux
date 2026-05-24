import { create } from 'zustand'
import { apiRequest } from '../../../shared/api/http'
import type { Message } from './use-chat-messages'

export type Session = {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}

type SessionDto = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

type MessageDto = {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

function toSession(s: SessionDto): Session {
  return {
    id: s.id,
    title: s.title,
    createdAt: new Date(s.createdAt),
    updatedAt: new Date(s.updatedAt),
  }
}

function toMessage(m: MessageDto): Message {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.createdAt),
  }
}

type ChatSessionState = {
  sessions: Session[]
  activeId: string
  messagesBySession: Record<string, Message[]>
  loaded: boolean

  loadSessions: () => Promise<void>
  loadMessages: (sessionId: string) => Promise<void>
  addSession: () => Promise<void>
  deleteSession: (id: string) => Promise<void>
  switchSession: (id: string) => void
  renameSession: (id: string, title: string) => Promise<void>

  appendLocalMessage: (sessionId: string, message: Message) => void
  updateLocalChunk: (sessionId: string, messageId: string, chunk: string) => void
  replaceLocalMessage: (sessionId: string, oldId: string, message: Message) => void
  setSessionTitle: (sessionId: string, title: string) => void
  resetStore: () => void
}

export const useChatSessionStore = create<ChatSessionState>()((set, get) => ({
  sessions: [],
  activeId: '',
  messagesBySession: {},
  loaded: false,

  loadSessions: async () => {
    const dtos = await apiRequest<SessionDto[]>('/chatbot/sessions')
    let sessions = dtos.map(toSession)

    if (sessions.length === 0) {
      const fresh = await apiRequest<SessionDto>('/chatbot/sessions', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      sessions = [toSession(fresh)]
    }

    set({ sessions, activeId: sessions[0].id, loaded: true })
    await get().loadMessages(sessions[0].id)
  },

  loadMessages: async (sessionId) => {
    const cached = get().messagesBySession[sessionId]
    if (cached) return

    const dtos = await apiRequest<MessageDto[]>(
      `/chatbot/sessions/${sessionId}/messages`,
    )
    const messages = dtos.map(toMessage)
    set((state) => ({
      messagesBySession: { ...state.messagesBySession, [sessionId]: messages },
    }))
  },

  addSession: async () => {
    const dto = await apiRequest<SessionDto>('/chatbot/sessions', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const session = toSession(dto)
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeId: session.id,
      messagesBySession: { ...state.messagesBySession, [session.id]: [] },
    }))
  },

  deleteSession: async (id) => {
    await apiRequest(`/chatbot/sessions/${id}`, { method: 'DELETE' })
    set((state) => {
      const next = state.sessions.filter((s) => s.id !== id)
      const { [id]: _, ...rest } = state.messagesBySession
      void _
      const activeId = state.activeId === id ? next[0]?.id ?? '' : state.activeId
      return { sessions: next, messagesBySession: rest, activeId }
    })

    if (get().sessions.length === 0) {
      await get().addSession()
    } else if (!get().messagesBySession[get().activeId]) {
      await get().loadMessages(get().activeId)
    }
  },

  switchSession: (id) => {
    set({ activeId: id })
    void get().loadMessages(id)
  },

  renameSession: async (id, title) => {
    await apiRequest(`/chatbot/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    })
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, title } : s)),
    }))
  },

  appendLocalMessage: (sessionId, message) => {
    set((state) => ({
      messagesBySession: {
        ...state.messagesBySession,
        [sessionId]: [...(state.messagesBySession[sessionId] ?? []), message],
      },
    }))
  },

  updateLocalChunk: (sessionId, messageId, chunk) => {
    set((state) => ({
      messagesBySession: {
        ...state.messagesBySession,
        [sessionId]: (state.messagesBySession[sessionId] ?? []).map((m) =>
          m.id === messageId ? { ...m, content: m.content + chunk } : m,
        ),
      },
    }))
  },

  replaceLocalMessage: (sessionId, oldId, message) => {
    set((state) => ({
      messagesBySession: {
        ...state.messagesBySession,
        [sessionId]: (state.messagesBySession[sessionId] ?? []).map((m) =>
          m.id === oldId ? message : m,
        ),
      },
    }))
  },

  setSessionTitle: (sessionId, title) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, title } : s,
      ),
    }))
  },

  resetStore: () => {
    set({ sessions: [], activeId: '', messagesBySession: {}, loaded: false })
  },
}))
