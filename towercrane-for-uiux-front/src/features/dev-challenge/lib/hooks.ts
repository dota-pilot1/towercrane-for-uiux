import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { devChallengeApi } from '../../../entities/dev-challenge/api/dev-challenge-api'
import type {
  DevChallengeAssignment,
  DevChallengeAssignmentStatus,
  DevChallengeCategory,
  DevChallengeChecklistItem,
  DevChallengeSection,
} from '../../../entities/dev-challenge/model/types'

export const DEV_CHALLENGE_KEYS = {
  all: ['dev-challenge'] as const,
  categories: () => [...DEV_CHALLENGE_KEYS.all, 'categories'] as const,
  sections: (categoryId: string) => [...DEV_CHALLENGE_KEYS.all, 'sections', categoryId] as const,
  assignments: (sectionId: string) => [...DEV_CHALLENGE_KEYS.all, 'assignments', sectionId] as const,
  assignment: (assignmentId: string) => [...DEV_CHALLENGE_KEYS.all, 'assignment', assignmentId] as const,
  mySubmission: (assignmentId: string) => [...DEV_CHALLENGE_KEYS.all, 'my-submission', assignmentId] as const,
}

export function useDevChallengeCategories() {
  return useQuery({
    queryKey: DEV_CHALLENGE_KEYS.categories(),
    queryFn: devChallengeApi.listCategories,
  })
}

export function useCreateDevChallengeCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: devChallengeApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEV_CHALLENGE_KEYS.categories() })
    },
  })
}

export function useUpdateDevChallengeCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      devChallengeApi.updateCategory(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEV_CHALLENGE_KEYS.categories() })
    },
  })
}

export function useDeleteDevChallengeCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: devChallengeApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEV_CHALLENGE_KEYS.categories() })
    },
  })
}

export function useReorderDevChallengeCategories() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: devChallengeApi.reorderCategories,
    onMutate: async (categoryIds) => {
      await queryClient.cancelQueries({ queryKey: DEV_CHALLENGE_KEYS.categories() })
      const previous = queryClient.getQueryData<DevChallengeCategory[]>(DEV_CHALLENGE_KEYS.categories())
      if (previous) {
        const next = categoryIds
          .map((id) => previous.find((category) => category.id === id))
          .filter(Boolean)
        queryClient.setQueryData(DEV_CHALLENGE_KEYS.categories(), next)
      }
      return { previous }
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(DEV_CHALLENGE_KEYS.categories(), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DEV_CHALLENGE_KEYS.categories() })
    },
  })
}

export function useDevChallengeSections(categoryId: string) {
  return useQuery({
    queryKey: DEV_CHALLENGE_KEYS.sections(categoryId),
    queryFn: () => devChallengeApi.listSections(categoryId),
    enabled: !!categoryId,
  })
}

export function useCreateDevChallengeSection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: devChallengeApi.createSection,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DEV_CHALLENGE_KEYS.sections(variables.categoryId) })
    },
  })
}

export function useUpdateDevChallengeSection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, categoryId, title }: { id: string; categoryId: string; title: string }) =>
      devChallengeApi.updateSection(id, { title }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DEV_CHALLENGE_KEYS.sections(variables.categoryId) })
    },
  })
}

export function useDeleteDevChallengeSection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; categoryId: string }) => devChallengeApi.deleteSection(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DEV_CHALLENGE_KEYS.sections(variables.categoryId) })
    },
  })
}

export function useReorderDevChallengeSections() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ categoryId, sectionIds }: { categoryId: string; sectionIds: string[] }) =>
      devChallengeApi.reorderSections(categoryId, sectionIds),
    onMutate: async ({ categoryId, sectionIds }) => {
      await queryClient.cancelQueries({ queryKey: DEV_CHALLENGE_KEYS.sections(categoryId) })
      const previous = queryClient.getQueryData<DevChallengeSection[]>(DEV_CHALLENGE_KEYS.sections(categoryId))
      if (previous) {
        const next = sectionIds
          .map((id) => previous.find((section) => section.id === id))
          .filter(Boolean)
        queryClient.setQueryData(DEV_CHALLENGE_KEYS.sections(categoryId), next)
      }
      return { previous, categoryId }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(DEV_CHALLENGE_KEYS.sections(context.categoryId), context.previous)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: DEV_CHALLENGE_KEYS.sections(variables.categoryId) })
    },
  })
}

export function useDevChallengeAssignments(sectionId: string) {
  return useQuery({
    queryKey: DEV_CHALLENGE_KEYS.assignments(sectionId),
    queryFn: () => devChallengeApi.listAssignments(sectionId),
    enabled: !!sectionId,
  })
}

export function useDevChallengeAssignment(assignmentId: string) {
  return useQuery({
    queryKey: DEV_CHALLENGE_KEYS.assignment(assignmentId),
    queryFn: () => devChallengeApi.getAssignment(assignmentId),
    enabled: !!assignmentId,
  })
}

export function useCreateDevChallengeAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: devChallengeApi.createAssignment,
    onSuccess: (assignment) => {
      queryClient.invalidateQueries({ queryKey: DEV_CHALLENGE_KEYS.assignments(assignment.sectionId) })
      queryClient.setQueryData(DEV_CHALLENGE_KEYS.assignment(assignment.id), assignment)
    },
  })
}

export function useUpdateDevChallengeAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      sectionId,
      data,
    }: {
      id: string
      sectionId: string
      data: Partial<{ title: string; summary: string; difficulty: string; status: DevChallengeAssignmentStatus }>
    }) => devChallengeApi.updateAssignment(id, data),
    onSuccess: (assignment, variables) => {
      queryClient.invalidateQueries({ queryKey: DEV_CHALLENGE_KEYS.assignments(variables.sectionId) })
      queryClient.setQueryData(DEV_CHALLENGE_KEYS.assignment(assignment.id), assignment)
    },
  })
}

export function useDeleteDevChallengeAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; sectionId: string }) => devChallengeApi.deleteAssignment(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DEV_CHALLENGE_KEYS.assignments(variables.sectionId) })
      queryClient.removeQueries({ queryKey: DEV_CHALLENGE_KEYS.assignment(variables.id) })
    },
  })
}

export function useReorderDevChallengeAssignments() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sectionId, assignmentIds }: { sectionId: string; assignmentIds: string[] }) =>
      devChallengeApi.reorderAssignments(sectionId, assignmentIds),
    onMutate: async ({ sectionId, assignmentIds }) => {
      await queryClient.cancelQueries({ queryKey: DEV_CHALLENGE_KEYS.assignments(sectionId) })
      const previous = queryClient.getQueryData<DevChallengeAssignment[]>(DEV_CHALLENGE_KEYS.assignments(sectionId))
      if (previous) {
        const next = assignmentIds
          .map((id) => previous.find((assignment) => assignment.id === id))
          .filter(Boolean)
        queryClient.setQueryData(DEV_CHALLENGE_KEYS.assignments(sectionId), next)
      }
      return { previous, sectionId }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(DEV_CHALLENGE_KEYS.assignments(context.sectionId), context.previous)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: DEV_CHALLENGE_KEYS.assignments(variables.sectionId) })
    },
  })
}

export function buildChecklistItems(value: string): DevChallengeChecklistItem[] {
  return value
    .split('\n')
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .filter(Boolean)
    .map((label, index) => ({
      id: `${index + 1}-${label.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-+|-+$/g, '') || 'item'}`,
      label,
    }))
}

export function useMyDevChallengeSubmission(assignmentId: string) {
  return useQuery({
    queryKey: DEV_CHALLENGE_KEYS.mySubmission(assignmentId),
    queryFn: () => devChallengeApi.getMySubmission(assignmentId),
    enabled: !!assignmentId,
    retry: false,
  })
}

export function useCreateDevChallengeSubmission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: devChallengeApi.createSubmission,
    onSuccess: (submission) => {
      queryClient.setQueryData(DEV_CHALLENGE_KEYS.mySubmission(submission.assignmentId), submission)
      queryClient.invalidateQueries({ queryKey: DEV_CHALLENGE_KEYS.mySubmission(submission.assignmentId) })
    },
  })
}

export function useUpdateDevChallengeSubmission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      assignmentId,
      data,
    }: {
      id: string
      assignmentId: string
      data: { comment: string; githubUrl?: string; checkedItems: string[] }
    }) => devChallengeApi.updateSubmission(id, data),
    onSuccess: (submission, variables) => {
      queryClient.setQueryData(DEV_CHALLENGE_KEYS.mySubmission(variables.assignmentId), submission)
      queryClient.invalidateQueries({ queryKey: DEV_CHALLENGE_KEYS.mySubmission(variables.assignmentId) })
    },
  })
}
