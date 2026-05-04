import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { API_BASE_URL } from '../../../shared/api/http'
import { useSessionStore } from '../../../shared/store/session-store'
import { meetingApi } from '../api/meeting-api'
import type { MeetingMember, MeetingMessage, MeetingRoom } from './types'

export const meetingKeys = {
  all: ['meeting'] as const,
  rooms: () => [...meetingKeys.all, 'rooms'] as const,
  messages: (roomId: string) => [...meetingKeys.all, 'messages', roomId] as const,
  members: (roomId: string) => [...meetingKeys.all, 'members', roomId] as const,
}

export function useMeetingRooms() {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  return useQuery({
    queryKey: meetingKeys.rooms(),
    queryFn: meetingApi.listRooms,
    enabled: isAuthenticated,
  })
}

export function useMeetingMessages(roomId: string | null) {
  return useQuery({
    queryKey: roomId ? meetingKeys.messages(roomId) : [...meetingKeys.all, 'messages', 'none'],
    queryFn: () => meetingApi.listMessages(roomId as string),
    enabled: Boolean(roomId),
    staleTime: 0,
  })
}

export function useMeetingMembers(roomId: string | null) {
  return useQuery({
    queryKey: roomId ? meetingKeys.members(roomId) : [...meetingKeys.all, 'members', 'none'],
    queryFn: () => meetingApi.listMembers(roomId as string),
    enabled: Boolean(roomId),
    staleTime: 0,
  })
}

export function useSendMeetingMessage(roomId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (content: string) => {
      if (!roomId) throw new Error('roomId required')
      return meetingApi.sendMessage(roomId, { content })
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<MeetingMessage[]>(
        meetingKeys.messages(saved.roomId),
        (prev) => {
          if (!prev) return [saved]
          if (prev.some((message) => message.id === saved.id)) return prev
          return [...prev, saved]
        },
      )
      queryClient.invalidateQueries({ queryKey: meetingKeys.rooms() })
      queryClient.invalidateQueries({ queryKey: meetingKeys.members(saved.roomId) })
    },
  })
}

export function useStartMeetingDm() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (otherUserId: string) => meetingApi.startDm(otherUserId),
    onSuccess: (room) => {
      queryClient.setQueryData<MeetingRoom[]>(meetingKeys.rooms(), (prev) => {
        const rooms = prev ?? []
        if (rooms.some((item) => item.id === room.id)) {
          return rooms.map((item) => (item.id === room.id ? room : item))
        }
        return [...rooms, room]
      })
      queryClient.invalidateQueries({ queryKey: meetingKeys.rooms() })
    },
  })
}

function mergePresenceMembers(previous: MeetingMember[] | undefined, onlineMembers: MeetingMember[]) {
  const membersById = new Map<string, MeetingMember>()

  for (const member of previous ?? []) {
    membersById.set(member.id, { ...member, online: false })
  }

  for (const member of onlineMembers) {
    const existing = membersById.get(member.id)
    membersById.set(member.id, {
      ...existing,
      ...member,
      online: true,
    })
  }

  return Array.from(membersById.values()).sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1
    return a.name.localeCompare(b.name, 'ko')
  })
}

export function useMeetingWebSocket(roomId: string | null) {
  const token = useSessionStore((state) => state.token)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!roomId || !token) return

    const url = new URL(API_BASE_URL)
    url.pathname = '/ws/meeting'
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    url.searchParams.set('token', token)

    const socket = new WebSocket(url)

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'SUBSCRIBE', topic: `meeting/${roomId}` }))
    })

    socket.addEventListener('message', (event) => {
      const envelope = JSON.parse(event.data) as {
        type?: string
        data?: unknown
      }

      if (envelope.type === 'MEETING_MESSAGE' && envelope.data) {
        const incoming = envelope.data as MeetingMessage
        queryClient.setQueryData<MeetingMessage[]>(
          meetingKeys.messages(roomId),
          (prev) => {
            if (!prev) return [incoming]
            if (prev.some((message) => message.id === incoming.id)) return prev
            return [...prev, incoming]
          },
        )
        queryClient.invalidateQueries({ queryKey: meetingKeys.rooms() })
      }

      if (envelope.type === 'MEETING_PRESENCE' && envelope.data) {
        const payload = envelope.data as { members?: MeetingMember[] }
        if (Array.isArray(payload.members)) {
          queryClient.setQueryData<MeetingMember[]>(
            meetingKeys.members(roomId),
            (prev) => mergePresenceMembers(prev, payload.members ?? []),
          )
        }
      }
    })

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'UNSUBSCRIBE', topic: `meeting/${roomId}` }))
      }
      socket.close()
    }
  }, [queryClient, roomId, token])
}
