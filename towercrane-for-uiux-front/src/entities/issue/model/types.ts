export type IssueType = 'BUG' | 'FEATURE' | 'IMPROVEMENT' | 'QUESTION' | 'OTHER'
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'TESTING' | 'CLOSED'
export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type Issue = {
  id: string
  prototypeId: string
  title: string
  content: string
  issueType: IssueType
  status: IssueStatus
  priority: IssuePriority
  reporterId: string
  reporterName?: string | null
  reporterEmail?: string | null
  assigneeId?: string | null
  assigneeName?: string | null
  assigneeEmail?: string | null
  dueDate?: string | null
  orderIdx: number
  createdAt: string
  updatedAt: string
}

export type IssueListResponse = {
  items: Issue[]
  total: number
  page: number
  pageSize: number
}

export type IssueFilters = {
  prototypeId: string
  page?: number
  pageSize?: number
  q?: string
  issueType?: IssueType
  status?: IssueStatus
  priority?: IssuePriority
  assigneeId?: string
  sort?: 'order' | 'recent' | 'oldest' | 'priority'
}

export type IssueComment = {
  id: string
  issueId: string
  userId: string
  userName?: string | null
  userEmail?: string | null
  content: string
  createdAt: string
  updatedAt: string
}

export type CreateIssueRequest = {
  prototypeId: string
  title: string
  content?: string
  issueType?: IssueType
  status?: IssueStatus
  priority?: IssuePriority
  assigneeId?: string | null
  dueDate?: string | null
}

export type UpdateIssueRequest = Partial<Omit<CreateIssueRequest, 'prototypeId'>>
