import { apiRequest } from '../../../shared/api/http'
import type {
  CreateMeetingRoomRequest,
  CreateMeetingWorkspaceRequest,
  MeetingMember,
  MeetingMessage,
  MeetingMessageType,
  MeetingRoom,
  MeetingWorkspace,
  UpdateMeetingWorkspaceRequest,
} from '../model/types'

export const meetingApi = {
  listWorkspaces: () => apiRequest<MeetingWorkspace[]>('/meeting/workspaces'),

  createWorkspace: (payload: CreateMeetingWorkspaceRequest) =>
    apiRequest<MeetingWorkspace>('/meeting/workspaces', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateWorkspace: (workspaceId: string, payload: UpdateMeetingWorkspaceRequest) =>
    apiRequest<MeetingWorkspace>(`/meeting/workspaces/${workspaceId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteWorkspace: (workspaceId: string) =>
    apiRequest<{ success: boolean }>(`/meeting/workspaces/${workspaceId}`, {
      method: 'DELETE',
    }),

  listWorkspaceRooms: (workspaceId: string) =>
    apiRequest<MeetingRoom[]>(`/meeting/workspaces/${workspaceId}/rooms`),

  createWorkspaceRoom: (workspaceId: string, payload: CreateMeetingRoomRequest) =>
    apiRequest<MeetingRoom>(`/meeting/workspaces/${workspaceId}/rooms`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listRooms: () => apiRequest<MeetingRoom[]>('/meeting/rooms'),

  listMessages: (roomId: string) =>
    apiRequest<MeetingMessage[]>(`/meeting/rooms/${roomId}/messages?limit=100`),

  listMembers: (roomId: string) =>
    apiRequest<MeetingMember[]>(`/meeting/rooms/${roomId}/members`),

  // 채널 메시지 전체 비우기 (admin 전용, 서버 권한 검증)
  clearMessages: (roomId: string) =>
    apiRequest<{ success: boolean; roomId: string }>(`/meeting/rooms/${roomId}/messages`, {
      method: 'DELETE',
    }),

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

  toggleReaction: (roomId: string, messageId: string, emoji: string) =>
    apiRequest<MeetingMessage>(`/meeting/rooms/${roomId}/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    }),

  startDm: (otherUserId: string) =>
    apiRequest<MeetingRoom>('/meeting/dms', {
      method: 'POST',
      body: JSON.stringify({ otherUserId }),
    }),

  createRoom: (payload: CreateMeetingRoomRequest) =>
    apiRequest<MeetingRoom>('/meeting/rooms', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteRoom: (roomId: string) =>
    apiRequest<{ success: boolean; roomId: string }>(`/meeting/rooms/${roomId}`, {
      method: 'DELETE',
    }),
}
