export type DevManagementRoomType =
  | 'GENERAL'
  | 'PROTOTYPE'
  | 'ISSUE'
  | 'DECISION'
  | 'TECH_DEBT'
  | 'RESOURCE'
  | 'DM'

export type DevManagementMessageType =
  | 'TEXT'
  | 'SYSTEM'
  | 'BOT_REPLY'
  | 'SUMMARY'
  | 'PROTOTYPE_SEARCH_RESULT'
  | 'TECH_DEBT_ANALYSIS'
  | 'TOOL_RESULT'

export type DevManagementSenderType = 'USER' | 'BOT' | 'SYSTEM' | 'TOOL'

export type DevManagementBotResponseMode =
  | 'MENTION_ONLY'
  | 'DIRECT_ONLY'
  | 'MENTION_OR_DIRECT'

export type CreateDevManagementRoomRequest = {
  name: string
  description?: string | null
  roomType?: DevManagementRoomType
}

export type DevManagementRoom = {
  id: string
  name: string
  roomType: DevManagementRoomType
  description: string | null
  orderIdx: number
  messageCount: number
  createdAt: string
  updatedAt: string
  dmCounterpart?: {
    id: string
    name: string
    email: string
    role: 'admin' | 'user'
  } | null
}

export type DevManagementMessage = {
  id: string
  roomId: string
  senderId: string | null
  senderType: DevManagementSenderType
  senderName: string
  senderRole: string | null
  content: string
  messageType: DevManagementMessageType
  payload: Record<string, unknown> | null
  createdAt: string
}

export type DevManagementMember = {
  id: string
  name: string
  email: string
  role: 'admin' | 'user' | 'bot'
  memberType: 'USER' | 'BOT'
  online: boolean
  currentRoomId?: string | null
}

export type DevManagementBotSettings = {
  roomId: string
  enabled: boolean
  responseMode: DevManagementBotResponseMode
  updatedBy: string | null
  updatedAt: string
}

export type SendDevManagementMessageRequest = {
  content: string
  target?: 'ROOM' | 'BOT'
  messageType?: DevManagementMessageType
  payload?: Record<string, unknown> | null
}

export type SendDevManagementMessageResult = {
  messages: DevManagementMessage[]
}

export type ClearDevManagementMessagesResult = {
  success: boolean
  roomId: string
  deletedCount: number
}
