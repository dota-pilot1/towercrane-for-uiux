import { apiRequest } from '../../../shared/api/http'
import type {
  CreateTeamDocFileRequest,
  TeamDocNode,
  UpdateTeamDocNodeRequest,
} from '../model/types'

export const teamDocsApi = {
  tree: () => apiRequest<TeamDocNode[]>('/team-docs/tree'),

  detail: (id: string) => apiRequest<TeamDocNode>(`/team-docs/${id}`),

  createFolder: (parentId: string | null, title: string) =>
    apiRequest<TeamDocNode>('/team-docs/folders', {
      method: 'POST',
      body: JSON.stringify({ parentId, title }),
    }),

  createDocument: (parentId: string | null, title: string) =>
    apiRequest<TeamDocNode>('/team-docs/documents', {
      method: 'POST',
      body: JSON.stringify({ parentId, title }),
    }),

  createFile: (body: CreateTeamDocFileRequest) =>
    apiRequest<TeamDocNode>('/team-docs/files', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: UpdateTeamDocNodeRequest) =>
    apiRequest<TeamDocNode>(`/team-docs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  remove: (id: string) =>
    apiRequest<{ success: boolean }>(`/team-docs/${id}`, {
      method: 'DELETE',
    }),
}
