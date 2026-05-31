export type TaskWorkspaceRole = 'owner' | 'editor' | 'member' | 'viewer'

export type TaskWorkspace = {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  orderIdx: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
  taskCount: number
  openTaskCount: number
}

export type CreateTaskWorkspaceRequest = {
  name: string
  description?: string
  icon?: string | null
  color?: string | null
}

export type UpdateTaskWorkspaceRequest = Partial<CreateTaskWorkspaceRequest>

export type TaskType =
  | 'FEATURE'
  | 'BUG'
  | 'DOCS'
  | 'DESIGN'
  | 'REFACTOR'
  | 'QA'
  | 'CHORE'

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'HOLD'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TaskScope = 'TEAM' | 'PERSONAL'
export type TaskVisibility = 'TEAM' | 'PRIVATE'

export type Task = {
  id: string
  title: string
  content: string
  acceptanceCriteria: string
  plan: string
  folderStructure: string
  mmdContent: string
  taskType: TaskType
  status: TaskStatus
  priority: TaskPriority
  scope: TaskScope
  visibility: TaskVisibility
  reporterId: string
  reporterName?: string | null
  reporterEmail?: string | null
  assigneeId?: string | null
  assigneeName?: string | null
  assigneeEmail?: string | null
  ownerId?: string | null
  ownerName?: string | null
  ownerEmail?: string | null
  completedById?: string | null
  completedByName?: string | null
  completedAt?: string | null
  dueDate?: string | null
  orderIdx: number
  archived: boolean
  createdAt: string
  updatedAt: string
}

export type TaskListResponse = {
  items: Task[]
  total: number
  page: number
  pageSize: number
}

export type TaskFilters = {
  page?: number
  pageSize?: number
  q?: string
  scope?: 'all' | 'my' | 'user'
  userId?: string
  taskType?: TaskType
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string
  archived?: boolean
  sort?: 'order' | 'recent' | 'oldest' | 'dueDate' | 'priority'
}

export type CreateTaskRequest = {
  title: string
  content?: string
  acceptanceCriteria?: string
  plan?: string
  folderStructure?: string
  mmdContent?: string
  taskType?: TaskType
  status?: TaskStatus
  priority?: TaskPriority
  scope?: TaskScope
  visibility?: TaskVisibility
  assigneeId?: string | null
  dueDate?: string | null
}

export type CreateCompletedTasksRequest = {
  scope?: TaskScope
  visibility?: TaskVisibility
  assigneeId?: string | null
  text?: string
  textarea?: string
  completedText?: string
  titles?: string[]
  items?: Array<string | { title: string }>
}

export type CreateCompletedTasksResponse = {
  success: boolean
  createdCount: number
  failedCount: number
  items: Task[]
}

export type CreateCodexCommitTasksRequest = {
  commitHash?: string
  commitMessage?: string
  source?: string
  completedText?: string
  tasks?: Array<{
    title: string
    content?: string
    acceptanceCriteria?: string
    plan?: string
    folderStructure?: string
    mmdContent?: string
    taskType?: TaskType
    status?: TaskStatus
    priority?: TaskPriority
    assigneeId?: string | null
    assigneeEmail?: string
    dueDate?: string | null
    completed?: boolean
  }>
}

export type CreateCodexCommitTasksResponse = {
  success: boolean
  workspaceId: string
  source: string
  commitHash: string | null
  commitMessage: string | null
  createdCount: number
  taskIds: string[]
  items: Task[]
}

export type UpdateTaskRequest = Partial<CreateTaskRequest>

export type TaskChecklist = {
  id: string
  taskId: string
  content: string
  completed: boolean
  orderIdx: number
  createdAt: string
  updatedAt: string
}

export type TaskComment = {
  id: string
  taskId: string
  userId: string
  userName?: string | null
  userEmail?: string | null
  content: string
  createdAt: string
  updatedAt: string
}

export type TaskActivityType =
  | 'CREATED'
  | 'STATUS'
  | 'ASSIGNEE'
  | 'PRIORITY'
  | 'UPDATED'
  | 'ARCHIVED'
  | 'RESTORED'

export type TaskActivityLog = {
  id: string
  taskId: string
  actorId?: string | null
  actorName?: string | null
  activityType: TaskActivityType
  fromValue?: string | null
  toValue?: string | null
  message?: string | null
  createdAt: string
}

export type TaskAiReview = {
  id: string
  taskId: string
  format: 'MARKDOWN' | 'HTML'
  title: string
  content: string
  source: 'CODEX' | 'MANUAL'
  createdAt: string
  updatedAt: string
}

export type TaskAttachment = {
  id: string
  taskId: string
  userId: string
  userName?: string | null
  userEmail?: string | null
  fileName: string
  fileUrl: string
  contentType: string
  fileSize: number
  createdAt: string
}
