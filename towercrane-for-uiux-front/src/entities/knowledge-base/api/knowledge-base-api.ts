import { apiRequest } from '../../../shared/api/http'
import type {
  KnowledgeDocumentDetail,
  ListKnowledgeDocumentsParams,
  ListKnowledgeDocumentsResponse,
  SaveKnowledgeDocumentRequest,
  SearchKnowledgeRequest,
  SearchKnowledgeResponse,
  UpdateKnowledgeDocumentRequest,
} from '../model/types'

function toSearchParams(params: ListKnowledgeDocumentsParams) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    searchParams.set(key, String(value))
  })
  return searchParams.toString()
}

export const knowledgeBaseApi = {
  listDocuments(params: ListKnowledgeDocumentsParams = {}) {
    const query = toSearchParams(params)
    return apiRequest<ListKnowledgeDocumentsResponse>(
      `/knowledge/documents${query ? `?${query}` : ''}`,
    )
  },

  getDocument(id: string) {
    return apiRequest<KnowledgeDocumentDetail>(`/knowledge/documents/${id}`)
  },

  createDocument(payload: SaveKnowledgeDocumentRequest) {
    return apiRequest<KnowledgeDocumentDetail>('/knowledge/documents', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateDocument(id: string, payload: UpdateKnowledgeDocumentRequest) {
    return apiRequest<KnowledgeDocumentDetail>(`/knowledge/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  deleteDocument(id: string) {
    return apiRequest<{ success: boolean }>(`/knowledge/documents/${id}`, {
      method: 'DELETE',
    })
  },

  search(payload: SearchKnowledgeRequest) {
    return apiRequest<SearchKnowledgeResponse>('/knowledge/search', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}
