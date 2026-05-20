import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { studyDiaryApi } from '../../../entities/study-diary/api/study-diary-api'
import type {
  StudyDiaryCategory,
  StudyDiaryNote,
  StudyDiarySection,
  StudyDiaryVisibility,
} from '../../../entities/study-diary/model/types'
import { useSessionStore } from '../../../shared/store/session-store'

const STUDY_DIARY_KEYS = {
  all: (userId: string) => ['study-diary', userId] as const,
  me: (userId: string) => [...STUDY_DIARY_KEYS.all(userId), 'me'] as const,
  categories: (userId: string) => [...STUDY_DIARY_KEYS.all(userId), 'categories'] as const,
  sections: (userId: string, categoryId: string) =>
    [...STUDY_DIARY_KEYS.all(userId), 'sections', categoryId] as const,
  myNotes: (userId: string, sectionId: string) =>
    [...STUDY_DIARY_KEYS.all(userId), 'myNotes', sectionId] as const,
}

function useStudyDiaryUserId() {
  return useSessionStore((state) => state.userId)
}

function useStudyDiaryAuthEnabled() {
  return useSessionStore((state) => state.isAuthenticated && !!state.userId)
}

export function useStudyDiary() {
  const userId = useStudyDiaryUserId()
  const enabled = useStudyDiaryAuthEnabled()

  return useQuery({
    queryKey: STUDY_DIARY_KEYS.me(userId),
    queryFn: studyDiaryApi.getMe,
    enabled,
  })
}

export function useUpdateStudyDiary() {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: (data: { title?: string; description?: string | null; visibility?: StudyDiaryVisibility }) =>
      studyDiaryApi.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDY_DIARY_KEYS.me(userId) })
    },
  })
}

export function usePublicDiary(targetUserId: string) {
  return useQuery({
    queryKey: ['study-diary', 'public', targetUserId, 'me'],
    queryFn: () => studyDiaryApi.getPublicDiary(targetUserId),
    enabled: !!targetUserId,
  })
}

export function usePublicCategories(targetUserId: string) {
  return useQuery({
    queryKey: ['study-diary', 'public', targetUserId, 'categories'],
    queryFn: () => studyDiaryApi.listPublicCategories(targetUserId),
    enabled: !!targetUserId,
  })
}

export function usePublicSections(targetUserId: string, categoryId: string) {
  return useQuery({
    queryKey: ['study-diary', 'public', targetUserId, 'sections', categoryId],
    queryFn: () => studyDiaryApi.listPublicSections(targetUserId, categoryId),
    enabled: !!targetUserId && !!categoryId,
  })
}

export function usePublicNotes(targetUserId: string, sectionId: string) {
  return useQuery({
    queryKey: ['study-diary', 'public', targetUserId, 'notes', sectionId],
    queryFn: () => studyDiaryApi.listPublicNotes(targetUserId, sectionId),
    enabled: !!targetUserId && !!sectionId,
  })
}

export function useStudyDiaryCategories() {
  const userId = useStudyDiaryUserId()
  const enabled = useStudyDiaryAuthEnabled()

  return useQuery({
    queryKey: STUDY_DIARY_KEYS.categories(userId),
    queryFn: studyDiaryApi.listCategories,
    enabled,
  })
}

export function useCreateStudyDiaryCategory() {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: (data: { name: string }) => studyDiaryApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDY_DIARY_KEYS.categories(userId) })
    },
  })
}

export function useUpdateStudyDiaryCategory() {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      studyDiaryApi.updateCategory(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDY_DIARY_KEYS.categories(userId) })
    },
  })
}

export function useDeleteStudyDiaryCategory() {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: (id: string) => studyDiaryApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDY_DIARY_KEYS.categories(userId) })
    },
  })
}

export function useReorderStudyDiaryCategories() {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: (categoryIds: string[]) => studyDiaryApi.reorderCategories(categoryIds),
    onMutate: async (categoryIds) => {
      await queryClient.cancelQueries({ queryKey: STUDY_DIARY_KEYS.categories(userId) })
      const prev = queryClient.getQueryData<StudyDiaryCategory[]>(
        STUDY_DIARY_KEYS.categories(userId),
      )
      if (prev) {
        const reordered = categoryIds
          .map((id) => prev.find((category) => category.id === id))
          .filter((category): category is StudyDiaryCategory => Boolean(category))
        queryClient.setQueryData(STUDY_DIARY_KEYS.categories(userId), reordered)
      }
      return { prev }
    },
    onError: (_err, _ids, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(STUDY_DIARY_KEYS.categories(userId), ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: STUDY_DIARY_KEYS.categories(userId) })
    },
  })
}

export function useStudyDiarySections(categoryId: string) {
  const userId = useStudyDiaryUserId()
  const enabled = useStudyDiaryAuthEnabled()

  return useQuery({
    queryKey: STUDY_DIARY_KEYS.sections(userId, categoryId),
    queryFn: () => studyDiaryApi.listSections(categoryId),
    enabled: enabled && !!categoryId,
  })
}

export function useCreateStudyDiarySection() {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: (data: { categoryId: string; title: string }) => studyDiaryApi.createSection(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: STUDY_DIARY_KEYS.sections(userId, variables.categoryId) })
    },
  })
}

export function useUpdateStudyDiarySection() {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: ({ id, title }: { id: string; categoryId: string; title: string }) =>
      studyDiaryApi.updateSection(id, { title }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: STUDY_DIARY_KEYS.sections(userId, variables.categoryId) })
    },
  })
}

export function useDeleteStudyDiarySection() {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: ({ id }: { id: string; categoryId: string }) => studyDiaryApi.deleteSection(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: STUDY_DIARY_KEYS.sections(userId, variables.categoryId) })
    },
  })
}

export function useReorderStudyDiarySections() {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: ({ categoryId, sectionIds }: { categoryId: string; sectionIds: string[] }) =>
      studyDiaryApi.reorderSections(categoryId, sectionIds),
    onMutate: async ({ categoryId, sectionIds }) => {
      await queryClient.cancelQueries({ queryKey: STUDY_DIARY_KEYS.sections(userId, categoryId) })
      const prev = queryClient.getQueryData<StudyDiarySection[]>(
        STUDY_DIARY_KEYS.sections(userId, categoryId),
      )
      if (prev) {
        const reordered = sectionIds
          .map((id) => prev.find((section) => section.id === id))
          .filter((section): section is StudyDiarySection => Boolean(section))
        queryClient.setQueryData(STUDY_DIARY_KEYS.sections(userId, categoryId), reordered)
      }
      return { prev, categoryId }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(STUDY_DIARY_KEYS.sections(userId, ctx.categoryId), ctx.prev)
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: STUDY_DIARY_KEYS.sections(userId, variables.categoryId) })
    },
  })
}

export function useStudyDiaryMyNotes(sectionId: string) {
  const userId = useStudyDiaryUserId()
  const enabled = useStudyDiaryAuthEnabled()

  return useQuery({
    queryKey: STUDY_DIARY_KEYS.myNotes(userId, sectionId),
    queryFn: () => studyDiaryApi.listMyNotes(sectionId),
    enabled: enabled && !!sectionId,
  })
}

export function useCreateStudyDiaryNote() {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: studyDiaryApi.createNote,
    onSuccess: (data) => {
      if (data.sectionId) {
        queryClient.invalidateQueries({ queryKey: STUDY_DIARY_KEYS.myNotes(userId, data.sectionId) })
      }
    },
  })
}

export function useUpdateStudyDiaryNote() {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StudyDiaryNote> }) =>
      studyDiaryApi.updateNote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDY_DIARY_KEYS.all(userId) })
    },
  })
}

export function useDeleteStudyDiaryNote() {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: (noteId: string) => studyDiaryApi.deleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDY_DIARY_KEYS.all(userId) })
    },
  })
}
