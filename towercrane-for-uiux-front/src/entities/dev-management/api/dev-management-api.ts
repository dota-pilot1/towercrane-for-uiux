import { apiRequest } from '../../../shared/api/http'
import type {
  CreateDevManagementRoomRequest,
  ClearDevManagementMessagesResult,
  DevManagementBotSettings,
  DevManagementMessage,
  DevManagementMember,
  DevManagementRoom,
  SendDevManagementMessageRequest,
  SendDevManagementMessageResult,
} from '../model/types'

export const devManagementApi = {
  listRooms: () => apiRequest<DevManagementRoom[]>('/dev-management/rooms'),

  createRoom: (payload: CreateDevManagementRoomRequest) =>
    apiRequest<DevManagementRoom>('/dev-management/rooms', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteRoom: (roomId: string) =>
    apiRequest<{ success: boolean; roomId: string }>(
      `/dev-management/rooms/${roomId}`,
      {
        method: 'DELETE',
      },
    ),

  listMessages: (roomId: string) =>
    apiRequest<DevManagementMessage[]>(
      `/dev-management/rooms/${roomId}/messages?limit=100`,
    ),

  listMembers: (roomId: string) =>
    apiRequest<DevManagementMember[]>(`/dev-management/rooms/${roomId}/members`),

  sendMessage: (roomId: string, input: SendDevManagementMessageRequest) =>
    apiRequest<SendDevManagementMessageResult>(
      `/dev-management/rooms/${roomId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    ),

  clearMessages: (roomId: string) =>
    apiRequest<ClearDevManagementMessagesResult>(
      `/dev-management/rooms/${roomId}/messages`,
      {
        method: 'DELETE',
      },
    ),

  getBotSettings: (roomId: string) =>
    apiRequest<DevManagementBotSettings>(
      `/dev-management/rooms/${roomId}/bot-settings`,
    ),

  updateBotSettings: (
    roomId: string,
    input: Partial<Pick<DevManagementBotSettings, 'enabled' | 'responseMode'>>,
  ) =>
    apiRequest<DevManagementBotSettings>(
      `/dev-management/rooms/${roomId}/bot-settings`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    ),

  startDm: (otherUserId: string) =>
    apiRequest<DevManagementRoom>('/dev-management/dms', {
      method: 'POST',
      body: JSON.stringify({ otherUserId }),
    }),
}
