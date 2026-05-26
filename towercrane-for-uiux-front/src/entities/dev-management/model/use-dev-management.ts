import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { API_BASE_URL } from '../../../shared/api/http'
import { useSessionStore } from '../../../shared/store/session-store'
import { devManagementApi } from '../api/dev-management-api'
import type {
  CreateDevManagementRoomRequest,
  DevManagementBotSettings,
  DevManagementMember,
  DevManagementMessage,
  DevManagementRoom,
  SendDevManagementMessageRequest,
} from './types'

export const devManagementKeys = {
  all: ['dev-management'] as const,
  rooms: () => [...devManagementKeys.all, 'rooms'] as const,
  messages: (roomId: string) =>
    [...devManagementKeys.all, 'messages', roomId] as const,
  members: (roomId: string) =>
    [...devManagementKeys.all, 'members', roomId] as const,
  botSettings: (roomId: string) =>
    [...devManagementKeys.all, 'bot-settings', roomId] as const,
}

export function useDevManagementRooms() {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  return useQuery({
    queryKey: devManagementKeys.rooms(),
    queryFn: devManagementApi.listRooms,
    enabled: isAuthenticated,
  })
}

export function useCreateDevManagementRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateDevManagementRoomRequest) =>
      devManagementApi.createRoom(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: devManagementKeys.rooms() })
    },
  })
}

export function useDevManagementMessages(roomId: string | null) {
  return useQuery({
    queryKey: roomId
      ? devManagementKeys.messages(roomId)
      : [...devManagementKeys.all, 'messages', 'none'],
    queryFn: () => devManagementApi.listMessages(roomId as string),
    enabled: Boolean(roomId),
    staleTime: 0,
  })
}

export function useDevManagementMembers(roomId: string | null) {
  return useQuery({
    queryKey: roomId
      ? devManagementKeys.members(roomId)
      : [...devManagementKeys.all, 'members', 'none'],
    queryFn: () => devManagementApi.listMembers(roomId as string),
    enabled: Boolean(roomId),
    staleTime: 0,
  })
}

export function useDevManagementBotSettings(roomId: string | null) {
  return useQuery({
    queryKey: roomId
      ? devManagementKeys.botSettings(roomId)
      : [...devManagementKeys.all, 'bot-settings', 'none'],
    queryFn: () => devManagementApi.getBotSettings(roomId as string),
    enabled: Boolean(roomId),
    staleTime: 0,
  })
}

export function useSendDevManagementMessage(roomId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SendDevManagementMessageRequest) => {
      if (!roomId) throw new Error('roomId required')
      return devManagementApi.sendMessage(roomId, input)
    },
    onSuccess: (result) => {
      for (const saved of result.messages) {
        queryClient.setQueryData<DevManagementMessage[]>(
          devManagementKeys.messages(saved.roomId),
          (prev) => {
            if (!prev) return [saved]
            if (prev.some((message) => message.id === saved.id)) return prev
            return [...prev, saved]
          },
        )
        queryClient.invalidateQueries({ queryKey: devManagementKeys.rooms() })
        queryClient.invalidateQueries({
          queryKey: devManagementKeys.members(saved.roomId),
        })
      }
    },
  })
}

export function useClearDevManagementMessages(roomId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      if (!roomId) throw new Error('roomId required')
      return devManagementApi.clearMessages(roomId)
    },
    onSuccess: (result) => {
      queryClient.setQueryData<DevManagementMessage[]>(
        devManagementKeys.messages(result.roomId),
        [],
      )
      queryClient.invalidateQueries({ queryKey: devManagementKeys.rooms() })
    },
  })
}

export function useUpdateDevManagementBotSettings(roomId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<Pick<DevManagementBotSettings, 'enabled'>>) => {
      if (!roomId) throw new Error('roomId required')
      return devManagementApi.updateBotSettings(roomId, payload)
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(
        devManagementKeys.botSettings(settings.roomId),
        settings,
      )
    },
  })
}

export function useStartDevManagementDm() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (otherUserId: string) => devManagementApi.startDm(otherUserId),
    onSuccess: (room) => {
      queryClient.setQueryData<DevManagementRoom[]>(
        devManagementKeys.rooms(),
        (prev) => {
          if (!prev) return [room]
          const exists = prev.some((item) => item.id === room.id)
          if (exists) {
            return prev.map((item) => (item.id === room.id ? room : item))
          }
          return [...prev, room]
        },
      )
      queryClient.invalidateQueries({ queryKey: devManagementKeys.rooms() })
    },
  })
}

function mergePresenceMembers(
  previous: DevManagementMember[] | undefined,
  onlineMembers: DevManagementMember[],
) {
  const membersById = new Map<string, DevManagementMember>()

  for (const member of previous ?? []) {
    membersById.set(member.id, { ...member, online: member.memberType === 'BOT' })
  }

  for (const member of onlineMembers) {
    membersById.set(member.id, {
      ...member,
      memberType: member.memberType ?? 'USER',
      online: true,
    })
  }

  return Array.from(membersById.values()).sort((a, b) => {
    if (a.memberType !== b.memberType) return a.memberType === 'USER' ? -1 : 1
    if (a.online !== b.online) return a.online ? -1 : 1
    return a.name.localeCompare(b.name, 'ko')
  })
}

export function useDevManagementWebSocket(roomId: string | null) {
  const token = useSessionStore((state) => state.token)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!roomId || !token) return

    const url = new URL(API_BASE_URL)
    url.pathname = '/ws/dev-management'
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    url.searchParams.set('token', token)

    const socket = new WebSocket(url)

    let heartbeatId: number | null = null

    socket.addEventListener('open', () => {
      socket.send(
        JSON.stringify({ type: 'SUBSCRIBE', topic: `dev-management/${roomId}` }),
      )
      heartbeatId = window.setInterval(() => {
        if (socket.readyState !== WebSocket.OPEN) return
        socket.send(
          JSON.stringify({ type: 'PING', topic: `dev-management/${roomId}` }),
        )
      }, 10_000)
    })

    socket.addEventListener('message', (event) => {
      const envelope = JSON.parse(event.data) as {
        type?: string
        data?: unknown
      }

      if (envelope.type === 'DEV_MANAGEMENT_MESSAGE' && envelope.data) {
        const incoming = envelope.data as DevManagementMessage
        queryClient.setQueryData<DevManagementMessage[]>(
          devManagementKeys.messages(roomId),
          (prev) => {
            if (!prev) return [incoming]
            if (prev.some((message) => message.id === incoming.id)) return prev
            return [...prev, incoming]
          },
        )
        queryClient.invalidateQueries({ queryKey: devManagementKeys.rooms() })
      }

      if (envelope.type === 'DEV_MANAGEMENT_MESSAGES_CLEARED' && envelope.data) {
        const payload = envelope.data as { roomId?: string }
        if (payload.roomId === roomId) {
          queryClient.setQueryData<DevManagementMessage[]>(
            devManagementKeys.messages(roomId),
            [],
          )
          queryClient.invalidateQueries({ queryKey: devManagementKeys.rooms() })
        }
      }

      if (envelope.type === 'DEV_MANAGEMENT_PRESENCE' && envelope.data) {
        const payload = envelope.data as { members?: DevManagementMember[] }
        if (Array.isArray(payload.members)) {
          queryClient.setQueryData<DevManagementMember[]>(
            devManagementKeys.members(roomId),
            (prev) => mergePresenceMembers(prev, payload.members ?? []),
          )
        }
      }

      if (envelope.type === 'DEV_MANAGEMENT_BOT_SETTINGS' && envelope.data) {
        const settings = envelope.data as DevManagementBotSettings
        queryClient.setQueryData(devManagementKeys.botSettings(roomId), settings)
      }
    })

    return () => {
      if (heartbeatId) {
        window.clearInterval(heartbeatId)
      }
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: 'UNSUBSCRIBE',
            topic: `dev-management/${roomId}`,
          }),
        )
      }
      socket.close()
    }
  }, [queryClient, roomId, token])
}
