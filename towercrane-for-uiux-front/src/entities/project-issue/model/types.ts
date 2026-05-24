export type ProjectIssueType =
  | 'BUG'
  | 'FEATURE'
  | 'IMPROVEMENT'
  | 'QUESTION'
  | 'RISK'
  | 'OTHER'

export type ProjectIssueStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'TESTING'
  | 'CLOSED'
  | 'HOLD'

export type ProjectIssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type ProjectIssueWorkspace = {
  id: string
  name: string
  description: string
  orderIdx: number
  archived: boolean
  createdBy?: string | null
  createdAt: string
  updatedAt: string
  issueCount: number
}

export type ProjectIssueCategory = ProjectIssueWorkspace

export type ProjectIssue = {
  id: string
  projectId: string
  title: string
  content: string
  issueType: ProjectIssueType
  status: ProjectIssueStatus
  priority: ProjectIssuePriority
  reporterId: string
  reporterName?: string | null
  reporterEmail?: string | null
  assigneeId?: string | null
  assigneeName?: string | null
  assigneeEmail?: string | null
  dueDate?: string | null
  orderIdx: number
  archived: boolean
  createdAt: string
  updatedAt: string
}

export type ProjectIssueListResponse = {
  items: ProjectIssue[]
  total: number
  page: number
  pageSize: number
}

export type ProjectIssueFilters = {
  projectId: string
  page?: number
  pageSize?: number
  q?: string
  issueType?: ProjectIssueType
  status?: ProjectIssueStatus
  priority?: ProjectIssuePriority
  assigneeId?: string
  archived?: boolean
  sort?: 'order' | 'recent' | 'oldest' | 'dueDate' | 'priority'
}

export type CreateProjectIssueRequest = {
  projectId: string
  title: string
  content?: string
  issueType?: ProjectIssueType
  status?: ProjectIssueStatus
  priority?: ProjectIssuePriority
  assigneeId?: string | null
  dueDate?: string | null
}

export type UpdateProjectIssueRequest = Partial<
  Omit<CreateProjectIssueRequest, 'projectId'>
>

export type CreateProjectIssueCategoryRequest = {
  name: string
  description?: string
}

export type CreateProjectIssueWorkspaceRequest =
  CreateProjectIssueCategoryRequest

export type ProjectIssueChecklist = {
  id: string
  projectIssueId: string
  content: string
  completed: boolean
  orderIdx: number
  createdAt: string
  updatedAt: string
}

export type ProjectIssueComment = {
  id: string
  projectIssueId: string
  userId: string
  userName?: string | null
  userEmail?: string | null
  content: string
  createdAt: string
  updatedAt: string
}

export type ProjectIssueActivityType =
  | 'CREATED'
  | 'STATUS'
  | 'ASSIGNEE'
  | 'PRIORITY'
  | 'UPDATED'
  | 'ARCHIVED'
  | 'RESTORED'

export type ProjectIssueActivityLog = {
  id: string
  projectIssueId: string
  actorId?: string | null
  actorName?: string | null
  activityType: ProjectIssueActivityType
  fromValue?: string | null
  toValue?: string | null
  message?: string | null
  createdAt: string
}

export type ProjectIssueAttachment = {
  id: string
  projectIssueId: string
  userId: string
  userName?: string | null
  userEmail?: string | null
  fileName: string
  fileUrl: string
  contentType: string
  fileSize: number
  createdAt: string
}
