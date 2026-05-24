import { apiRequest } from '../../../shared/api/http'
import type {
  CreateTaskRequest,
  CreateTaskWorkspaceRequest,
  Task,
  TaskActivityLog,
  TaskAttachment,
  TaskChecklist,
  TaskComment,
  TaskFilters,
  TaskListResponse,
  TaskWorkspace,
  UpdateTaskRequest,
  UpdateTaskWorkspaceRequest,
} from '../model/types'

function toSearchParams(filters?: TaskFilters) {
  const params = new URLSearchParams()
  if (!filters) return params

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })

  return params
}

export const taskApi = {
  list: (filters?: TaskFilters) => {
    const params = toSearchParams(filters)
    const query = params.toString()
    return apiRequest<TaskListResponse>(`/tasks${query ? `?${query}` : ''}`)
  },

  detail: (taskId: string) => apiRequest<Task>(`/tasks/${taskId}`),

  create: (body: CreateTaskRequest) =>
    apiRequest<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (taskId: string, body: UpdateTaskRequest) =>
    apiRequest<Task>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (taskId: string) =>
    apiRequest<{ success: boolean }>(`/tasks/${taskId}`, {
      method: 'DELETE',
    }),

  updateStatus: (taskId: string, status: Task['status']) =>
    apiRequest<Task>(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  updatePriority: (taskId: string, priority: Task['priority']) =>
    apiRequest<Task>(`/tasks/${taskId}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    }),

  updateAssignee: (taskId: string, assigneeId: string | null) =>
    apiRequest<Task>(`/tasks/${taskId}/assignee`, {
      method: 'PATCH',
      body: JSON.stringify({ assigneeId }),
    }),

  reorder: (items: Array<{ id: string; orderIdx: number }>) =>
    apiRequest<{ success: boolean }>('/tasks/reorder', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  archive: (ids: string[]) =>
    apiRequest<{ success: boolean }>('/tasks/archive', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  restore: (ids: string[]) =>
    apiRequest<{ success: boolean }>('/tasks/restore', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  listChecklists: (taskId: string) =>
    apiRequest<TaskChecklist[]>(`/tasks/${taskId}/checklists`),

  createChecklist: (taskId: string, content: string) =>
    apiRequest<TaskChecklist>(`/tasks/${taskId}/checklists`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  updateChecklist: (
    taskId: string,
    checklistId: string,
    body: Partial<Pick<TaskChecklist, 'content' | 'completed' | 'orderIdx'>>,
  ) =>
    apiRequest<TaskChecklist>(`/tasks/${taskId}/checklists/${checklistId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  toggleChecklist: (taskId: string, checklistId: string) =>
    apiRequest<TaskChecklist>(
      `/tasks/${taskId}/checklists/${checklistId}/toggle`,
      { method: 'PATCH' },
    ),

  deleteChecklist: (taskId: string, checklistId: string) =>
    apiRequest<{ success: boolean }>(
      `/tasks/${taskId}/checklists/${checklistId}`,
      { method: 'DELETE' },
    ),

  listComments: (taskId: string) =>
    apiRequest<TaskComment[]>(`/tasks/${taskId}/comments`),

  createComment: (taskId: string, content: string) =>
    apiRequest<TaskComment>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  updateComment: (taskId: string, commentId: string, content: string) =>
    apiRequest<TaskComment>(`/tasks/${taskId}/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),

  deleteComment: (taskId: string, commentId: string) =>
    apiRequest<{ success: boolean }>(`/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE',
    }),

  listActivity: (taskId: string) =>
    apiRequest<TaskActivityLog[]>(`/tasks/${taskId}/activity`),

  listAttachments: (taskId: string) =>
    apiRequest<TaskAttachment[]>(`/tasks/${taskId}/attachments`),

  createAttachment: (
    taskId: string,
    body: Pick<TaskAttachment, 'fileName' | 'fileUrl' | 'contentType' | 'fileSize'>,
  ) =>
    apiRequest<TaskAttachment>(`/tasks/${taskId}/attachments`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteAttachment: (taskId: string, attachmentId: string) =>
    apiRequest<{ success: boolean }>(
      `/tasks/${taskId}/attachments/${attachmentId}`,
      { method: 'DELETE' },
    ),

  // ── Workspace ────────────────────────────────────────────────────────────
  listWorkspaces: () => apiRequest<TaskWorkspace[]>('/tasks/workspaces'),

  createWorkspace: (body: CreateTaskWorkspaceRequest) =>
    apiRequest<TaskWorkspace>('/tasks/workspaces', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateWorkspace: (workspaceId: string, body: UpdateTaskWorkspaceRequest) =>
    apiRequest<TaskWorkspace>(`/tasks/workspaces/${workspaceId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteWorkspace: (workspaceId: string) =>
    apiRequest<{ success: boolean }>(`/tasks/workspaces/${workspaceId}`, {
      method: 'DELETE',
    }),

  reorderWorkspaces: (items: Array<{ id: string; orderIdx: number }>) =>
    apiRequest<TaskWorkspace[]>('/tasks/workspaces/reorder', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  listWorkspaceTasks: (workspaceId: string, filters?: TaskFilters) => {
    const params = toSearchParams(filters)
    const query = params.toString()
    return apiRequest<TaskListResponse>(
      `/tasks/workspaces/${workspaceId}/tasks${query ? `?${query}` : ''}`,
    )
  },

  createWorkspaceTask: (workspaceId: string, body: CreateTaskRequest) =>
    apiRequest<Task>(`/tasks/workspaces/${workspaceId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}
