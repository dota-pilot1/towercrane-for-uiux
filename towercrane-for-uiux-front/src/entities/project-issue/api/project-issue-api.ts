import { apiRequest } from '../../../shared/api/http'
import type {
  CreateProjectIssueCategoryRequest,
  CreateProjectIssueWorkspaceRequest,
  CreateProjectIssueRequest,
  ProjectIssue,
  ProjectIssueActivityLog,
  ProjectIssueAttachment,
  ProjectIssueCategory,
  ProjectIssueChecklist,
  ProjectIssueComment,
  ProjectIssueFilters,
  ProjectIssueListResponse,
  ProjectIssueWorkspace,
  UpdateProjectIssueRequest,
} from '../model/types'

function toSearchParams(filters?: ProjectIssueFilters) {
  const params = new URLSearchParams()
  if (!filters) return params

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })

  return params
}

export const projectIssueApi = {
  listWorkspaces: (archived = false) =>
    apiRequest<ProjectIssueWorkspace[]>(
      `/project-issues/workspaces?archived=${String(archived)}`,
    ),

  createWorkspace: (body: CreateProjectIssueWorkspaceRequest) =>
    apiRequest<ProjectIssueWorkspace>('/project-issues/workspaces', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateWorkspace: (
    workspaceId: string,
    body: Partial<CreateProjectIssueWorkspaceRequest> & {
      archived?: boolean
      orderIdx?: number
    },
  ) =>
    apiRequest<ProjectIssueWorkspace>(
      `/project-issues/workspaces/${workspaceId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
    ),

  deleteWorkspace: (workspaceId: string) =>
    apiRequest<{ success: boolean }>(
      `/project-issues/workspaces/${workspaceId}`,
      {
        method: 'DELETE',
      },
    ),

  listCategories: (archived = false) =>
    apiRequest<ProjectIssueCategory[]>(
      `/project-issues/categories?archived=${String(archived)}`,
    ),

  createCategory: (body: CreateProjectIssueCategoryRequest) =>
    apiRequest<ProjectIssueCategory>('/project-issues/categories', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateCategory: (
    categoryId: string,
    body: Partial<CreateProjectIssueCategoryRequest> & {
      archived?: boolean
      orderIdx?: number
    },
  ) =>
    apiRequest<ProjectIssueCategory>(`/project-issues/categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteCategory: (categoryId: string) =>
    apiRequest<{ success: boolean }>(`/project-issues/categories/${categoryId}`, {
      method: 'DELETE',
    }),

  list: (filters: ProjectIssueFilters) => {
    const query = toSearchParams(filters).toString()
    return apiRequest<ProjectIssueListResponse>(
      `/project-issues${query ? `?${query}` : ''}`,
    )
  },

  detail: (issueId: string) =>
    apiRequest<ProjectIssue>(`/project-issues/${issueId}`),

  create: (body: CreateProjectIssueRequest) =>
    apiRequest<ProjectIssue>('/project-issues', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (issueId: string, body: UpdateProjectIssueRequest) =>
    apiRequest<ProjectIssue>(`/project-issues/${issueId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (issueId: string) =>
    apiRequest<{ success: boolean }>(`/project-issues/${issueId}`, {
      method: 'DELETE',
    }),

  updateStatus: (issueId: string, status: ProjectIssue['status']) =>
    apiRequest<ProjectIssue>(`/project-issues/${issueId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  updatePriority: (issueId: string, priority: ProjectIssue['priority']) =>
    apiRequest<ProjectIssue>(`/project-issues/${issueId}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    }),

  updateAssignee: (issueId: string, assigneeId: string | null) =>
    apiRequest<ProjectIssue>(`/project-issues/${issueId}/assignee`, {
      method: 'PATCH',
      body: JSON.stringify({ assigneeId }),
    }),

  reorder: (items: Array<{ id: string; orderIdx: number }>) =>
    apiRequest<{ success: boolean }>('/project-issues/reorder', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  archive: (ids: string[]) =>
    apiRequest<{ success: boolean }>('/project-issues/archive', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  restore: (ids: string[]) =>
    apiRequest<{ success: boolean }>('/project-issues/restore', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  listChecklists: (issueId: string) =>
    apiRequest<ProjectIssueChecklist[]>(
      `/project-issues/${issueId}/checklists`,
    ),

  createChecklist: (issueId: string, content: string) =>
    apiRequest<ProjectIssueChecklist>(`/project-issues/${issueId}/checklists`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  updateChecklist: (
    issueId: string,
    checklistId: string,
    body: Partial<
      Pick<ProjectIssueChecklist, 'content' | 'completed' | 'orderIdx'>
    >,
  ) =>
    apiRequest<ProjectIssueChecklist>(
      `/project-issues/${issueId}/checklists/${checklistId}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    ),

  toggleChecklist: (issueId: string, checklistId: string) =>
    apiRequest<ProjectIssueChecklist>(
      `/project-issues/${issueId}/checklists/${checklistId}/toggle`,
      { method: 'PATCH' },
    ),

  deleteChecklist: (issueId: string, checklistId: string) =>
    apiRequest<{ success: boolean }>(
      `/project-issues/${issueId}/checklists/${checklistId}`,
      { method: 'DELETE' },
    ),

  listComments: (issueId: string) =>
    apiRequest<ProjectIssueComment[]>(`/project-issues/${issueId}/comments`),

  createComment: (issueId: string, content: string) =>
    apiRequest<ProjectIssueComment>(`/project-issues/${issueId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  updateComment: (issueId: string, commentId: string, content: string) =>
    apiRequest<ProjectIssueComment>(
      `/project-issues/${issueId}/comments/${commentId}`,
      { method: 'PATCH', body: JSON.stringify({ content }) },
    ),

  deleteComment: (issueId: string, commentId: string) =>
    apiRequest<{ success: boolean }>(
      `/project-issues/${issueId}/comments/${commentId}`,
      { method: 'DELETE' },
    ),

  listActivity: (issueId: string) =>
    apiRequest<ProjectIssueActivityLog[]>(
      `/project-issues/${issueId}/activity`,
    ),

  listAttachments: (issueId: string) =>
    apiRequest<ProjectIssueAttachment[]>(
      `/project-issues/${issueId}/attachments`,
    ),

  createAttachment: (
    issueId: string,
    body: Pick<
      ProjectIssueAttachment,
      'fileName' | 'fileUrl' | 'contentType' | 'fileSize'
    >,
  ) =>
    apiRequest<ProjectIssueAttachment>(
      `/project-issues/${issueId}/attachments`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  deleteAttachment: (issueId: string, attachmentId: string) =>
    apiRequest<{ success: boolean }>(
      `/project-issues/${issueId}/attachments/${attachmentId}`,
      { method: 'DELETE' },
    ),
}
