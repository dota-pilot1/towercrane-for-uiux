export type DevMeetingMinutesTextItem = {
  text: string
  sourceMessageIds: string[]
}

export type DevMeetingMinutesActionItem = {
  text: string
  assigneeName: string | null
  dueDate: string | null
  sourceMessageIds: string[]
}

export type DevMeetingMinutesSummary = {
  id: string
  roomId: string
  title: string
  summary: string
  discussionPointCount: number
  decisionCount: number
  actionItemCount: number
  openQuestionCount: number
  sourceMessageCount: number
  createdBy: string | null
  createdByName: string
  createdAt: string
  updatedAt: string
}

export type DevMeetingMinutesDetail = DevMeetingMinutesSummary & {
  discussionPoints: DevMeetingMinutesTextItem[]
  decisions: DevMeetingMinutesTextItem[]
  actionItems: DevMeetingMinutesActionItem[]
  openQuestions: DevMeetingMinutesTextItem[]
  sourceMessageIds: string[]
  canEdit: boolean
  canDelete: boolean
}

export type DevMeetingMinutesListResponse = {
  items: DevMeetingMinutesSummary[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type DevMeetingMinutesListParams = {
  roomId?: string
  q?: string
  page: number
  pageSize: number
}

export type UpdateDevMeetingMinutesPayload = {
  title?: string
  summary?: string
}
