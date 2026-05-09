export type TaskType =
  | 'FEATURE'
  | 'BUG'
  | 'DOCS'
  | 'DESIGN'
  | 'REFACTOR'
  | 'QA'
  | 'CHORE'

export type TaskStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'DONE'
  | 'HOLD'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type Task = {
  id: string
  title: string
  content: string
  taskType: TaskType
  status: TaskStatus
  priority: TaskPriority
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
  taskType?: TaskType
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string | null
  dueDate?: string | null
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
