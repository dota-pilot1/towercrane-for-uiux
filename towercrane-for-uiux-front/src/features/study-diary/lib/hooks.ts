import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { studyDiaryApi } from '../../../entities/study-diary/api/study-diary-api'
import type {
  StudyDiaryCategory,
  StudyDiaryNote,
  StudyDiaryOrganizeMode,
  StudyDiarySection,
  StudyDiaryVisibility,
} from '../../../entities/study-diary/model/types'
import { useSessionStore } from '../../../shared/store/session-store'

const STUDY_DIARY_KEYS = {
  all: (userId: string) => ['study-diary', userId] as const,
  me: (userId: string) => [...STUDY_DIARY_KEYS.all(userId), 'me'] as const,
  workspaces: (userId: string) => [...STUDY_DIARY_KEYS.all(userId), 'workspaces'] as const,
  workspace: (userId: string, workspaceId: string) =>
    [...STUDY_DIARY_KEYS.workspaces(userId), workspaceId] as const,
  workspaceCategories: (userId: string, workspaceId: string) =>
    [...STUDY_DIARY_KEYS.workspace(userId, workspaceId), 'categories'] as const,
  workspaceSections: (userId: string, workspaceId: string, categoryId: string) =>
    [...STUDY_DIARY_KEYS.workspace(userId, workspaceId), 'sections', categoryId] as const,
  workspaceMyNotes: (userId: string, workspaceId: string, sectionId: string) =>
    [...STUDY_DIARY_KEYS.workspace(userId, workspaceId), 'myNotes', sectionId] as const,
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

export function useStudyDiaryWorkspaces() {
  const userId = useStudyDiaryUserId()
  const enabled = useStudyDiaryAuthEnabled()

  return useQuery({
    queryKey: STUDY_DIARY_KEYS.workspaces(userId),
    queryFn: studyDiaryApi.listWorkspaces,
    enabled,
  })
}

export function useCreateStudyDiaryWorkspace() {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: (data: { title: string; description?: string | null; visibility?: StudyDiaryVisibility }) =>
      studyDiaryApi.createWorkspace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDY_DIARY_KEYS.workspaces(userId) })
    },
  })
}

export function useStudyDiaryWorkspace(workspaceId: string) {
  const userId = useStudyDiaryUserId()
  const enabled = useStudyDiaryAuthEnabled()

  return useQuery({
    queryKey: STUDY_DIARY_KEYS.workspace(userId, workspaceId),
    queryFn: () => studyDiaryApi.getWorkspace(workspaceId),
    enabled: enabled && !!workspaceId,
  })
}

export function useUpdateStudyDiaryWorkspace(workspaceId: string) {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: (data: { title?: string; description?: string | null; visibility?: StudyDiaryVisibility }) =>
      studyDiaryApi.updateWorkspace(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDY_DIARY_KEYS.workspace(userId, workspaceId) })
      queryClient.invalidateQueries({ queryKey: STUDY_DIARY_KEYS.workspaces(userId) })
    },
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

export function usePublicWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: ['study-diary', 'public', 'workspace', workspaceId, 'me'],
    queryFn: () => studyDiaryApi.getPublicWorkspace(workspaceId),
    enabled: !!workspaceId,
  })
}

export function usePublicCategories(targetUserId: string) {
  return useQuery({
    queryKey: ['study-diary', 'public', targetUserId, 'categories'],
    queryFn: () => studyDiaryApi.listPublicCategories(targetUserId),
    enabled: !!targetUserId,
  })
}

export function usePublicWorkspaceCategories(workspaceId: string) {
  return useQuery({
    queryKey: ['study-diary', 'public', 'workspace', workspaceId, 'categories'],
    queryFn: () => studyDiaryApi.listPublicWorkspaceCategories(workspaceId),
    enabled: !!workspaceId,
  })
}

export function usePublicSections(targetUserId: string, categoryId: string) {
  return useQuery({
    queryKey: ['study-diary', 'public', targetUserId, 'sections', categoryId],
    queryFn: () => studyDiaryApi.listPublicSections(targetUserId, categoryId),
    enabled: !!targetUserId && !!categoryId,
  })
}

export function usePublicWorkspaceSections(workspaceId: string, categoryId: string) {
  return useQuery({
    queryKey: ['study-diary', 'public', 'workspace', workspaceId, 'sections', categoryId],
    queryFn: () => studyDiaryApi.listPublicWorkspaceSections(workspaceId, categoryId),
    enabled: !!workspaceId && !!categoryId,
  })
}

export function usePublicNotes(targetUserId: string, sectionId: string) {
  return useQuery({
    queryKey: ['study-diary', 'public', targetUserId, 'notes', sectionId],
    queryFn: () => studyDiaryApi.listPublicNotes(targetUserId, sectionId),
    enabled: !!targetUserId && !!sectionId,
  })
}

export function usePublicWorkspaceNotes(workspaceId: string, sectionId: string) {
  return useQuery({
    queryKey: ['study-diary', 'public', 'workspace', workspaceId, 'notes', sectionId],
    queryFn: () => studyDiaryApi.listPublicWorkspaceNotes(workspaceId, sectionId),
    enabled: !!workspaceId && !!sectionId,
  })
}

export function useStudyDiaryCategories(workspaceId?: string) {
  const userId = useStudyDiaryUserId()
  const enabled = useStudyDiaryAuthEnabled()

  return useQuery({
    queryKey: workspaceId
      ? STUDY_DIARY_KEYS.workspaceCategories(userId, workspaceId)
      : STUDY_DIARY_KEYS.categories(userId),
    queryFn: () => workspaceId
      ? studyDiaryApi.listWorkspaceCategories(workspaceId)
      : studyDiaryApi.listCategories(),
    enabled,
  })
}

export function useCreateStudyDiaryCategory(workspaceId?: string) {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: (data: { name: string }) => workspaceId
      ? studyDiaryApi.createWorkspaceCategory(workspaceId, data)
      : studyDiaryApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceId
          ? STUDY_DIARY_KEYS.workspaceCategories(userId, workspaceId)
          : STUDY_DIARY_KEYS.categories(userId),
      })
    },
  })
}

export function useUpdateStudyDiaryCategory(workspaceId?: string) {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      studyDiaryApi.updateCategory(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceId
          ? STUDY_DIARY_KEYS.workspaceCategories(userId, workspaceId)
          : STUDY_DIARY_KEYS.categories(userId),
      })
    },
  })
}

export function useDeleteStudyDiaryCategory(workspaceId?: string) {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: (id: string) => studyDiaryApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceId
          ? STUDY_DIARY_KEYS.workspaceCategories(userId, workspaceId)
          : STUDY_DIARY_KEYS.categories(userId),
      })
    },
  })
}

export function useReorderStudyDiaryCategories(workspaceId?: string) {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()
  const categoriesKey = workspaceId
    ? STUDY_DIARY_KEYS.workspaceCategories(userId, workspaceId)
    : STUDY_DIARY_KEYS.categories(userId)

  return useMutation({
    mutationFn: (categoryIds: string[]) => workspaceId
      ? studyDiaryApi.reorderWorkspaceCategories(workspaceId, categoryIds)
      : studyDiaryApi.reorderCategories(categoryIds),
    onMutate: async (categoryIds) => {
      await queryClient.cancelQueries({ queryKey: categoriesKey })
      const prev = queryClient.getQueryData<StudyDiaryCategory[]>(
        categoriesKey,
      )
      if (prev) {
        const reordered = categoryIds
          .map((id) => prev.find((category) => category.id === id))
          .filter((category): category is StudyDiaryCategory => Boolean(category))
        queryClient.setQueryData(categoriesKey, reordered)
      }
      return { prev }
    },
    onError: (_err, _ids, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(categoriesKey, ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoriesKey })
    },
  })
}

export function useStudyDiarySections(categoryId: string, workspaceId?: string) {
  const userId = useStudyDiaryUserId()
  const enabled = useStudyDiaryAuthEnabled()

  return useQuery({
    queryKey: workspaceId
      ? STUDY_DIARY_KEYS.workspaceSections(userId, workspaceId, categoryId)
      : STUDY_DIARY_KEYS.sections(userId, categoryId),
    queryFn: () => workspaceId
      ? studyDiaryApi.listWorkspaceSections(workspaceId, categoryId)
      : studyDiaryApi.listSections(categoryId),
    enabled: enabled && !!categoryId,
  })
}

export function useCreateStudyDiarySection(workspaceId?: string) {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: (data: { categoryId: string; title: string }) => studyDiaryApi.createSection(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workspaceId
          ? STUDY_DIARY_KEYS.workspaceSections(userId, workspaceId, variables.categoryId)
          : STUDY_DIARY_KEYS.sections(userId, variables.categoryId),
      })
    },
  })
}

export function useUpdateStudyDiarySection(workspaceId?: string) {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: ({ id, title }: { id: string; categoryId: string; title: string }) =>
      studyDiaryApi.updateSection(id, { title }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workspaceId
          ? STUDY_DIARY_KEYS.workspaceSections(userId, workspaceId, variables.categoryId)
          : STUDY_DIARY_KEYS.sections(userId, variables.categoryId),
      })
    },
  })
}

export function useDeleteStudyDiarySection(workspaceId?: string) {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: ({ id }: { id: string; categoryId: string }) => studyDiaryApi.deleteSection(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workspaceId
          ? STUDY_DIARY_KEYS.workspaceSections(userId, workspaceId, variables.categoryId)
          : STUDY_DIARY_KEYS.sections(userId, variables.categoryId),
      })
    },
  })
}

export function useReorderStudyDiarySections(workspaceId?: string) {
  const queryClient = useQueryClient()
  const userId = useStudyDiaryUserId()

  return useMutation({
    mutationFn: ({ categoryId, sectionIds }: { categoryId: string; sectionIds: string[] }) =>
      studyDiaryApi.reorderSections(categoryId, sectionIds),
    onMutate: async ({ categoryId, sectionIds }) => {
      const sectionsKey = workspaceId
        ? STUDY_DIARY_KEYS.workspaceSections(userId, workspaceId, categoryId)
        : STUDY_DIARY_KEYS.sections(userId, categoryId)
      await queryClient.cancelQueries({ queryKey: sectionsKey })
      const prev = queryClient.getQueryData<StudyDiarySection[]>(
        sectionsKey,
      )
      if (prev) {
        const reordered = sectionIds
          .map((id) => prev.find((section) => section.id === id))
          .filter((section): section is StudyDiarySection => Boolean(section))
        queryClient.setQueryData(sectionsKey, reordered)
      }
      return { prev, categoryId }
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx?.prev) return
      const sectionsKey = workspaceId
        ? STUDY_DIARY_KEYS.workspaceSections(userId, workspaceId, ctx.categoryId)
        : STUDY_DIARY_KEYS.sections(userId, ctx.categoryId)
      queryClient.setQueryData(sectionsKey, ctx.prev)
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({
        queryKey: workspaceId
          ? STUDY_DIARY_KEYS.workspaceSections(userId, workspaceId, variables.categoryId)
          : STUDY_DIARY_KEYS.sections(userId, variables.categoryId),
      })
    },
  })
}

export function useStudyDiaryMyNotes(sectionId: string, workspaceId?: string) {
  const userId = useStudyDiaryUserId()
  const enabled = useStudyDiaryAuthEnabled()

  return useQuery({
    queryKey: workspaceId
      ? STUDY_DIARY_KEYS.workspaceMyNotes(userId, workspaceId, sectionId)
      : STUDY_DIARY_KEYS.myNotes(userId, sectionId),
    queryFn: () => workspaceId
      ? studyDiaryApi.listWorkspaceMyNotes(workspaceId, sectionId)
      : studyDiaryApi.listMyNotes(sectionId),
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
        queryClient.invalidateQueries({ queryKey: STUDY_DIARY_KEYS.all(userId) })
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

export function useOrganizeStudyDiaryNote() {
  return useMutation({
    mutationFn: (data: { title?: string; content: string; mode?: StudyDiaryOrganizeMode }) =>
      studyDiaryApi.organizeNote(data),
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
