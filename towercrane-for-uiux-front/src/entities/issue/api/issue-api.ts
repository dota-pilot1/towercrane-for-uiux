import { apiRequest } from '../../../shared/api/http'
import type {
  CreateIssueRequest,
  Issue,
  IssueComment,
  IssueFilters,
  IssueListResponse,
  UpdateIssueRequest,
} from '../model/types'

function toSearchParams(filters?: IssueFilters) {
  const params = new URLSearchParams()
  if (!filters) return params

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })

  return params
}

export const issueApi = {
  list: (filters: IssueFilters) => {
    const params = toSearchParams(filters)
    const query = params.toString()
    return apiRequest<IssueListResponse>(`/issues${query ? `?${query}` : ''}`)
  },

  detail: (issueId: string) => apiRequest<Issue>(`/issues/${issueId}`),

  create: (body: CreateIssueRequest) =>
    apiRequest<Issue>('/issues', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (issueId: string, body: UpdateIssueRequest) =>
    apiRequest<Issue>(`/issues/${issueId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (issueId: string) =>
    apiRequest<{ success: boolean }>(`/issues/${issueId}`, {
      method: 'DELETE',
    }),

  updateStatus: (issueId: string, status: Issue['status']) =>
    apiRequest<Issue>(`/issues/${issueId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  reorder: (items: Array<{ id: string; orderIdx: number }>) =>
    apiRequest<{ success: boolean }>('/issues/reorder', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  listComments: (issueId: string) =>
    apiRequest<IssueComment[]>(`/issues/${issueId}/comments`),

  createComment: (issueId: string, content: string) =>
    apiRequest<IssueComment>(`/issues/${issueId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  updateComment: (issueId: string, commentId: string, content: string) =>
    apiRequest<IssueComment>(`/issues/${issueId}/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),

  deleteComment: (issueId: string, commentId: string) =>
    apiRequest<{ success: boolean }>(
      `/issues/${issueId}/comments/${commentId}`,
      { method: 'DELETE' },
    ),
}
