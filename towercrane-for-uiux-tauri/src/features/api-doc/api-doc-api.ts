import { apiRequest } from "./http";
import type {
  ApiDocBlock,
  ApiDocCategory,
  ApiDocEndpoint,
  ApiDocTeam,
  CreateApiDocCategoryRequest,
  CreateApiDocEndpointRequest,
  CreateApiDocTeamRequest,
  UpdateApiDocCategoryRequest,
  UpdateApiDocEndpointRequest,
  UpdateApiDocTeamRequest,
} from "./types";
import type {
  ApiDocImportExportFile,
  ApiDocImportResult,
} from "./import-export-types";

export const apiDocApi = {
  listTeams: () => apiRequest<ApiDocTeam[]>("/api-doc/teams"),

  createTeam: (body: CreateApiDocTeamRequest) =>
    apiRequest<ApiDocTeam>("/api-doc/teams", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateTeam: (teamId: string, body: UpdateApiDocTeamRequest) =>
    apiRequest<ApiDocTeam>(`/api-doc/teams/${teamId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteTeam: (teamId: string) =>
    apiRequest<{ success: boolean }>(`/api-doc/teams/${teamId}`, {
      method: "DELETE",
    }),

  reorderTeams: (items: Array<{ id: string; orderIdx: number }>) =>
    apiRequest<{ success: boolean }>("/api-doc/teams/reorder", {
      method: "PATCH",
      body: JSON.stringify({ items }),
    }),

  listCategories: () => apiRequest<ApiDocCategory[]>("/api-doc/categories"),

  listTeamCategories: (teamId: string) =>
    apiRequest<ApiDocCategory[]>(`/api-doc/teams/${teamId}/categories`),

  exportAll: () => apiRequest<ApiDocImportExportFile>("/api-doc/export"),

  importAll: (body: ApiDocImportExportFile) =>
    apiRequest<ApiDocImportResult>("/api-doc/import", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  createCategory: (body: CreateApiDocCategoryRequest) =>
    apiRequest<ApiDocCategory>("/api-doc/categories", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateCategory: (categoryId: string, body: UpdateApiDocCategoryRequest) =>
    apiRequest<ApiDocCategory>(`/api-doc/categories/${categoryId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteCategory: (categoryId: string) =>
    apiRequest<{ success: boolean }>(`/api-doc/categories/${categoryId}`, {
      method: "DELETE",
    }),

  reorderCategories: (items: Array<{ id: string; orderIdx: number }>) =>
    apiRequest<{ success: boolean }>("/api-doc/categories/reorder", {
      method: "PATCH",
      body: JSON.stringify({ items }),
    }),

  listEndpoints: (categoryId: string) =>
    apiRequest<ApiDocEndpoint[]>(`/api-doc/categories/${categoryId}/endpoints`),

  createEndpoint: (body: CreateApiDocEndpointRequest) =>
    apiRequest<ApiDocEndpoint>("/api-doc/endpoints", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateEndpoint: (endpointId: string, body: UpdateApiDocEndpointRequest) =>
    apiRequest<ApiDocEndpoint>(`/api-doc/endpoints/${endpointId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteEndpoint: (endpointId: string) =>
    apiRequest<{ success: boolean }>(`/api-doc/endpoints/${endpointId}`, {
      method: "DELETE",
    }),

  reorderEndpoints: (items: Array<{ id: string; orderIdx: number }>) =>
    apiRequest<{ success: boolean }>("/api-doc/endpoints/reorder", {
      method: "PATCH",
      body: JSON.stringify({ items }),
    }),

  listBlocks: (endpointId: string) =>
    apiRequest<ApiDocBlock[]>(`/api-doc/endpoints/${endpointId}/blocks`),

  replaceBlocks: (endpointId: string, blocks: ApiDocBlock[]) =>
    apiRequest<ApiDocBlock[]>(`/api-doc/endpoints/${endpointId}/blocks`, {
      method: "PUT",
      body: JSON.stringify({ blocks }),
    }),
};
