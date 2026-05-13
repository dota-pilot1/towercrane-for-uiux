import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../../shared/api/http'

const CHALLENGE_KEYS = {
  all: ['challenge'] as const,
  categories: () => [...CHALLENGE_KEYS.all, 'categories'] as const,
  sections: (categoryId: string) => [...CHALLENGE_KEYS.all, 'sections', categoryId] as const,
  topics: (sectionId: string) => [...CHALLENGE_KEYS.all, 'topics', sectionId] as const,
  topic: (id: string) => [...CHALLENGE_KEYS.all, 'topic', id] as const,
  mySubmission: (topicId: string) => [...CHALLENGE_KEYS.all, 'mySubmission', topicId] as const,
  gptThreads: (sectionId: string) => [...CHALLENGE_KEYS.all, 'gptThreads', sectionId] as const,
  gptMessages: (threadId: string) => [...CHALLENGE_KEYS.all, 'gptMessages', threadId] as const,
  myNotes: (sectionId: string) => [...CHALLENGE_KEYS.all, 'myNotes', sectionId] as const,
  sharedNotes: (sectionId: string) => [...CHALLENGE_KEYS.all, 'sharedNotes', sectionId] as const,
}

// Categories
export function useCategories() {
  return useQuery({
    queryKey: CHALLENGE_KEYS.categories(),
    queryFn: () => apiRequest<any[]>('/challenge/categories'),
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string }) =>
      apiRequest('/challenge/categories', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.categories() })
    },
  })
}

// Sections
export function useSectionsByCategory(categoryId: string) {
  return useQuery({
    queryKey: CHALLENGE_KEYS.sections(categoryId),
    queryFn: () => apiRequest<any[]>(`/challenge/categories/${categoryId}/sections`),
    enabled: !!categoryId,
  })
}

export function useCreateSection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { categoryId: string; title: string }) =>
      apiRequest('/challenge/sections', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.sections(variables.categoryId) })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiRequest(`/challenge/categories/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.categories() })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/challenge/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.categories() })
    },
  })
}

export function useReorderCategories() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (categoryIds: string[]) =>
      apiRequest('/challenge/categories/reorder', { method: 'POST', body: JSON.stringify({ categoryIds }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.categories() })
    },
  })
}

export function useReorderSections() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ categoryId, sectionIds }: { categoryId: string; sectionIds: string[] }) =>
      apiRequest('/challenge/sections/reorder', { method: 'POST', body: JSON.stringify({ categoryId, sectionIds }) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.sections(variables.categoryId) })
    },
  })
}

export function useUpdateSection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, categoryId, title }: { id: string; categoryId: string; title: string }) =>
      apiRequest(`/challenge/sections/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.sections(variables.categoryId) })
    },
  })
}

export function useDeleteSection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, categoryId }: { id: string; categoryId: string }) =>
      apiRequest(`/challenge/sections/${id}`, { method: 'DELETE' }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.sections(variables.categoryId) })
    },
  })
}

// Topics
export function useTopicsBySection(sectionId: string) {
  return useQuery({
    queryKey: CHALLENGE_KEYS.topics(sectionId),
    queryFn: () => apiRequest<any[]>(`/challenge/sections/${sectionId}/topics`),
    enabled: !!sectionId,
  })
}

export function useTopicById(topicId: string) {
  return useQuery({
    queryKey: CHALLENGE_KEYS.topic(topicId),
    queryFn: () => apiRequest<any>(`/challenge/topics/${topicId}`),
    enabled: !!topicId,
  })
}

export function useCreateTopic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { sectionId: string; blockType: string; blockTitle: string; content?: string }) =>
      apiRequest('/challenge/topics', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.topics(variables.sectionId) })
    },
  })
}

// Submissions
export function useMySubmission(topicId: string) {
  return useQuery({
    queryKey: CHALLENGE_KEYS.mySubmission(topicId),
    queryFn: () => apiRequest<any>(`/challenge/topics/${topicId}/submissions/my`),
    enabled: !!topicId,
  })
}

export function useCreateSubmission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { topicId: string; content: string; checkedItems: string[] }) =>
      apiRequest('/challenge/submissions', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.mySubmission(variables.topicId) })
    },
  })
}

export function useUpdateSubmission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { content?: string; checkedItems?: string[] } }) =>
      apiRequest(`/challenge/submissions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.all })
    },
  })
}

// GPT Threads
export function useGptThreads(sectionId: string) {
  return useQuery({
    queryKey: CHALLENGE_KEYS.gptThreads(sectionId),
    queryFn: () => apiRequest<any[]>(`/challenge/sections/${sectionId}/gpt/threads`),
    enabled: !!sectionId,
  })
}

export function useCreateGptThread() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { sectionId: string; title: string; model?: string }) =>
      apiRequest('/challenge/gpt/threads', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.gptThreads(variables.sectionId) })
    },
  })
}

export function useGptMessages(threadId: string) {
  return useQuery({
    queryKey: CHALLENGE_KEYS.gptMessages(threadId),
    queryFn: () => apiRequest<any[]>(`/challenge/gpt/threads/${threadId}/messages`),
    enabled: !!threadId,
    refetchInterval: 2000,
  })
}

export function useSendGptMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ threadId, content }: { threadId: string; content: string }) =>
      apiRequest(`/challenge/gpt/threads/${threadId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.gptMessages(variables.threadId) })
    },
  })
}

// User Notes
export function useMyNotes(sectionId: string) {
  return useQuery({
    queryKey: CHALLENGE_KEYS.myNotes(sectionId),
    queryFn: () => apiRequest<any[]>(`/challenge/sections/${sectionId}/notes/mine`),
    enabled: !!sectionId,
  })
}

export function useSharedNotes(sectionId: string) {
  return useQuery({
    queryKey: CHALLENGE_KEYS.sharedNotes(sectionId),
    queryFn: () => apiRequest<any[]>(`/challenge/sections/${sectionId}/notes/shared`),
    enabled: !!sectionId,
  })
}

export function useCreateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      sectionId?: string
      topicId?: string
      title?: string
      content: string
      visibility: string
      pinned: boolean
    }) => apiRequest('/challenge/notes', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (data: any) => {
      if (data?.sectionId) {
        queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.myNotes(data.sectionId) })
      }
    },
  })
}

export function useUpdateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ title?: string; content: string; visibility: string; pinned: boolean }> }) =>
      apiRequest(`/challenge/notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.all })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (noteId: string) => apiRequest(`/challenge/notes/${noteId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.all })
    },
    onError: (error: Error) => {
      console.error('[useDeleteNote]', error.message)
    },
  })
}
