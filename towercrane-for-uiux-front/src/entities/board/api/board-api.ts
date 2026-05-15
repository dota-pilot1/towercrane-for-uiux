import { apiRequest } from '../../../shared/api/http'
import type {
  BoardComment,
  BoardConfig,
  BoardDetail,
  BoardFilters,
  BoardListResponse,
  BoardStatus,
  CreateBoardConfigRequest,
  CreateBoardRequest,
  UpdateBoardConfigRequest,
  UpdateBoardRequest,
} from '../model/types'

function toSearchParams(filters?: BoardFilters) {
  const params = new URLSearchParams()
  if (!filters) return params
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })
  return params
}

export const boardApi = {
  listConfigs: () => apiRequest<BoardConfig[]>('/boards/configs'),

  list: (code: string, filters?: BoardFilters) => {
    const params = toSearchParams(filters)
    const query = params.toString()
    return apiRequest<BoardListResponse>(`/boards/${code}${query ? `?${query}` : ''}`)
  },

  detail: (code: string, boardId: string) =>
    apiRequest<BoardDetail>(`/boards/${code}/${boardId}`),

  create: (code: string, body: CreateBoardRequest) =>
    apiRequest<BoardDetail>(`/boards/${code}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (code: string, boardId: string, body: UpdateBoardRequest) =>
    apiRequest<BoardDetail>(`/boards/${code}/${boardId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (code: string, boardId: string) =>
    apiRequest<{ success: boolean }>(`/boards/${code}/${boardId}`, {
      method: 'DELETE',
    }),

  listComments: (code: string, boardId: string) =>
    apiRequest<BoardComment[]>(`/boards/${code}/${boardId}/comments`),

  createComment: (code: string, boardId: string, content: string) =>
    apiRequest<BoardComment>(`/boards/${code}/${boardId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
}

export const boardConfigApi = {
  listAdmin: () => apiRequest<BoardConfig[]>('/admin/board-configs'),

  create: (body: CreateBoardConfigRequest) =>
    apiRequest<BoardConfig>('/admin/board-configs', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (code: string, body: UpdateBoardConfigRequest) =>
    apiRequest<BoardConfig>(`/admin/board-configs/${code}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deactivate: (code: string) =>
    apiRequest<{ success: boolean }>(`/admin/board-configs/${code}`, {
      method: 'DELETE',
    }),
}

export const adminBoardApi = {
  list: (code: string, filters?: BoardFilters) => {
    const params = toSearchParams(filters)
    const query = params.toString()
    return apiRequest<BoardListResponse>(`/admin/boards/${code}${query ? `?${query}` : ''}`)
  },

  create: (code: string, body: CreateBoardRequest) =>
    apiRequest<BoardDetail>(`/admin/boards/${code}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  detail: (code: string, boardId: string) =>
    apiRequest<BoardDetail>(`/admin/boards/${code}/${boardId}`),

  update: (code: string, boardId: string, body: UpdateBoardRequest) =>
    apiRequest<BoardDetail>(`/admin/boards/${code}/${boardId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (code: string, boardId: string) =>
    apiRequest<{ success: boolean }>(`/admin/boards/${code}/${boardId}`, {
      method: 'DELETE',
    }),

  updateStatus: (code: string, boardId: string, status: BoardStatus) =>
    apiRequest<{ success: boolean }>(`/admin/boards/${code}/${boardId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  pin: (code: string, boardId: string) =>
    apiRequest<{ success: boolean }>(`/admin/boards/${code}/${boardId}/pin`, {
      method: 'PATCH',
    }),

  unpin: (code: string, boardId: string) =>
    apiRequest<{ success: boolean }>(`/admin/boards/${code}/${boardId}/unpin`, {
      method: 'PATCH',
    }),

  reply: (code: string, boardId: string, content: string) =>
    apiRequest<BoardComment>(`/admin/boards/${code}/${boardId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  unansweredCount: () =>
    apiRequest<{ count: number }>('/admin/boards/inquiries/unanswered-count'),
}
