export type MeetingRoomType =
  | 'ANNOUNCE'
  | 'PROTOTYPE'
  | 'FEEDBACK'
  | 'ISSUE'
  | 'DECISION'
  | 'RESOURCE'
  | 'INTERNAL'
  | 'FREE'
  | 'QNA'
  | 'DM'
export type MeetingMessageType = 'TEXT' | 'SYSTEM' | 'COMMAND_RESULT' | 'BOT_REPLY'

export type MeetingRoom = {
  id: string
  name: string
  roomType: MeetingRoomType
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

export type MeetingMessage = {
  id: string
  roomId: string
  senderId: string
  senderName: string
  senderRole: string | null
  content: string
  messageType: MeetingMessageType
  payload: Record<string, unknown> | null
  createdAt: string
}

export type MeetingMember = {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  online: boolean
  currentRoomId?: string | null
}
