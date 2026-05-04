import { apiRequest } from '../../../shared/api/http'
import type { MeetingMember, MeetingMessage, MeetingMessageType, MeetingRoom } from '../model/types'

export const meetingApi = {
  listRooms: () => apiRequest<MeetingRoom[]>('/meeting/rooms'),

  listMessages: (roomId: string) =>
    apiRequest<MeetingMessage[]>(`/meeting/rooms/${roomId}/messages?limit=100`),

  listMembers: (roomId: string) =>
    apiRequest<MeetingMember[]>(`/meeting/rooms/${roomId}/members`),

  sendMessage: (
    roomId: string,
    input: {
      content: string
      messageType?: MeetingMessageType
      payload?: Record<string, unknown> | null
    },
  ) =>
    apiRequest<MeetingMessage>(`/meeting/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  startDm: (otherUserId: string) =>
    apiRequest<MeetingRoom>('/meeting/dms', {
      method: 'POST',
      body: JSON.stringify({ otherUserId }),
    }),
}
