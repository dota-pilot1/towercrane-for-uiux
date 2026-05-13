import { apiRequest } from '../../../shared/api/http'
import type {
  ApiDocBlock,
  ApiDocCategory,
  ApiDocEndpoint,
  CreateApiDocCategoryRequest,
  CreateApiDocEndpointRequest,
  UpdateApiDocCategoryRequest,
  UpdateApiDocEndpointRequest,
} from '../model/types'
import type { ApiDocImportExportFile, ApiDocImportResult } from '../model/import-export-types'

export const apiDocApi = {
  listCategories: () => apiRequest<ApiDocCategory[]>('/api-doc/categories'),

  exportAll: () => apiRequest<ApiDocImportExportFile>('/api-doc/export'),

  importAll: (body: ApiDocImportExportFile) =>
    apiRequest<ApiDocImportResult>('/api-doc/import', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  createCategory: (body: CreateApiDocCategoryRequest) =>
    apiRequest<ApiDocCategory>('/api-doc/categories', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateCategory: (categoryId: string, body: UpdateApiDocCategoryRequest) =>
    apiRequest<ApiDocCategory>(`/api-doc/categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteCategory: (categoryId: string) =>
    apiRequest<{ success: boolean }>(`/api-doc/categories/${categoryId}`, {
      method: 'DELETE',
    }),

  reorderCategories: (items: Array<{ id: string; orderIdx: number }>) =>
    apiRequest<{ success: boolean }>('/api-doc/categories/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    }),

  listEndpoints: (categoryId: string) =>
    apiRequest<ApiDocEndpoint[]>(`/api-doc/categories/${categoryId}/endpoints`),

  createEndpoint: (body: CreateApiDocEndpointRequest) =>
    apiRequest<ApiDocEndpoint>('/api-doc/endpoints', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateEndpoint: (endpointId: string, body: UpdateApiDocEndpointRequest) =>
    apiRequest<ApiDocEndpoint>(`/api-doc/endpoints/${endpointId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteEndpoint: (endpointId: string) =>
    apiRequest<{ success: boolean }>(`/api-doc/endpoints/${endpointId}`, {
      method: 'DELETE',
    }),

  reorderEndpoints: (items: Array<{ id: string; orderIdx: number }>) =>
    apiRequest<{ success: boolean }>('/api-doc/endpoints/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    }),

  listBlocks: (endpointId: string) =>
    apiRequest<ApiDocBlock[]>(`/api-doc/endpoints/${endpointId}/blocks`),

  replaceBlocks: (endpointId: string, blocks: ApiDocBlock[]) =>
    apiRequest<ApiDocBlock[]>(`/api-doc/endpoints/${endpointId}/blocks`, {
      method: 'PUT',
      body: JSON.stringify({ blocks }),
    }),
}
