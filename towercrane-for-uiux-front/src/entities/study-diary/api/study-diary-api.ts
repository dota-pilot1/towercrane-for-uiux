import { apiRequest } from '../../../shared/api/http'
import type {
  StudyDiary,
  StudyDiaryCategory,
  StudyDiaryNote,
  StudyDiarySection,
  StudyDiaryVisibility,
} from '../model/types'

export const studyDiaryApi = {
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

  deleteNote: (id: string) =>
    apiRequest<void>(`/study-diary/notes/${id}`, { method: 'DELETE' }),

  getPublicDiary: (userId: string) =>
    apiRequest<StudyDiary>(`/study-diary/public/${userId}`),

  listPublicCategories: (userId: string) =>
    apiRequest<StudyDiaryCategory[]>(`/study-diary/public/${userId}/categories`),

  listPublicSections: (userId: string, categoryId: string) =>
    apiRequest<StudyDiarySection[]>(`/study-diary/public/${userId}/categories/${categoryId}/sections`),

  listPublicNotes: (userId: string, sectionId: string) =>
    apiRequest<StudyDiaryNote[]>(`/study-diary/public/${userId}/sections/${sectionId}/notes`),
}
