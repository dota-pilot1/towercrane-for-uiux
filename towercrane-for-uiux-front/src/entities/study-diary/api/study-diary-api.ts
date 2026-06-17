import { apiRequest } from '../../../shared/api/http'
import type {
  StudyDiary,
  StudyDiaryCategory,
  StudyDiaryNote,
  StudyDiaryOrganizeMode,
  StudyDiarySection,
  StudyDiaryVisibility,
} from '../model/types'

export const studyDiaryApi = {
  listWorkspaces: () => apiRequest<StudyDiary[]>('/study-diary/workspaces'),

  createWorkspace: (data: { title: string; description?: string | null; visibility?: StudyDiaryVisibility }) =>
    apiRequest<StudyDiary>('/study-diary/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getWorkspace: (workspaceId: string) =>
    apiRequest<StudyDiary>(`/study-diary/workspaces/${workspaceId}`),

  updateWorkspace: (workspaceId: string, data: { title?: string; description?: string | null; visibility?: StudyDiaryVisibility }) =>
    apiRequest<StudyDiary>(`/study-diary/workspaces/${workspaceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  listWorkspaceCategories: (workspaceId: string) =>
    apiRequest<StudyDiaryCategory[]>(`/study-diary/workspaces/${workspaceId}/categories`),

  createWorkspaceCategory: (workspaceId: string, data: { name: string }) =>
    apiRequest<StudyDiaryCategory>(`/study-diary/workspaces/${workspaceId}/categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reorderWorkspaceCategories: (workspaceId: string, categoryIds: string[]) =>
    apiRequest<void>(`/study-diary/workspaces/${workspaceId}/categories/reorder`, {
      method: 'POST',
      body: JSON.stringify({ categoryIds }),
    }),

  listWorkspaceSections: (workspaceId: string, categoryId: string) =>
    apiRequest<StudyDiarySection[]>(`/study-diary/workspaces/${workspaceId}/categories/${categoryId}/sections`),

  listWorkspaceMyNotes: (workspaceId: string, sectionId: string) =>
    apiRequest<StudyDiaryNote[]>(`/study-diary/workspaces/${workspaceId}/sections/${sectionId}/notes/mine`),

  getMe: () => apiRequest<StudyDiary>('/study-diary/me'),

  updateMe: (data: { title?: string; description?: string | null; visibility?: StudyDiaryVisibility }) =>
    apiRequest<StudyDiary>('/study-diary/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  listCategories: () => apiRequest<StudyDiaryCategory[]>('/study-diary/categories'),

  createCategory: (data: { name: string }) =>
    apiRequest<StudyDiaryCategory>('/study-diary/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCategory: (id: string, data: { name?: string }) =>
    apiRequest<StudyDiaryCategory>(`/study-diary/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteCategory: (id: string) =>
    apiRequest<void>(`/study-diary/categories/${id}`, { method: 'DELETE' }),

  reorderCategories: (categoryIds: string[]) =>
    apiRequest<void>('/study-diary/categories/reorder', {
      method: 'POST',
      body: JSON.stringify({ categoryIds }),
    }),

  listSections: (categoryId: string) =>
    apiRequest<StudyDiarySection[]>(`/study-diary/categories/${categoryId}/sections`),

  createSection: (data: { categoryId: string; title: string }) =>
    apiRequest<StudyDiarySection>('/study-diary/sections', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSection: (id: string, data: { title?: string }) =>
    apiRequest<StudyDiarySection>(`/study-diary/sections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteSection: (id: string) =>
    apiRequest<void>(`/study-diary/sections/${id}`, { method: 'DELETE' }),

  reorderSections: (categoryId: string, sectionIds: string[]) =>
    apiRequest<void>('/study-diary/sections/reorder', {
      method: 'POST',
      body: JSON.stringify({ categoryId, sectionIds }),
    }),

  listMyNotes: (sectionId: string) =>
    apiRequest<StudyDiaryNote[]>(`/study-diary/sections/${sectionId}/notes/mine`),

  createNote: (data: {
    sectionId?: string
    topicId?: string
    title?: string
    content: string
    visibility: StudyDiaryVisibility | string
    pinned: boolean
  }) =>
    apiRequest<StudyDiaryNote>('/study-diary/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateNote: (id: string, data: Partial<StudyDiaryNote>) =>
    apiRequest<StudyDiaryNote>(`/study-diary/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  organizeNote: (data: { title?: string; content: string; mode?: StudyDiaryOrganizeMode }) =>
    apiRequest<{ content: string }>('/study-diary/notes/organize', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteNote: (id: string) =>
    apiRequest<void>(`/study-diary/notes/${id}`, { method: 'DELETE' }),

  getPublicDiary: (userId: string) =>
    apiRequest<StudyDiary>(`/study-diary/public/${userId}`),

  getPublicWorkspace: (workspaceId: string) =>
    apiRequest<StudyDiary>(`/study-diary/public/workspaces/${workspaceId}`),

  listPublicCategories: (userId: string) =>
    apiRequest<StudyDiaryCategory[]>(`/study-diary/public/${userId}/categories`),

  listPublicWorkspaceCategories: (workspaceId: string) =>
    apiRequest<StudyDiaryCategory[]>(`/study-diary/public/workspaces/${workspaceId}/categories`),

  listPublicSections: (userId: string, categoryId: string) =>
    apiRequest<StudyDiarySection[]>(`/study-diary/public/${userId}/categories/${categoryId}/sections`),

  listPublicWorkspaceSections: (workspaceId: string, categoryId: string) =>
    apiRequest<StudyDiarySection[]>(`/study-diary/public/workspaces/${workspaceId}/categories/${categoryId}/sections`),

  listPublicNotes: (userId: string, sectionId: string) =>
    apiRequest<StudyDiaryNote[]>(`/study-diary/public/${userId}/sections/${sectionId}/notes`),

  listPublicWorkspaceNotes: (workspaceId: string, sectionId: string) =>
    apiRequest<StudyDiaryNote[]>(`/study-diary/public/workspaces/${workspaceId}/sections/${sectionId}/notes`),
}
