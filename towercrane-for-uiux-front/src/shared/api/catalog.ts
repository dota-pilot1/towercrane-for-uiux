import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  PrototypeStatus,
  PrototypeVisibility,
  ScenarioCategory,
} from '../config/catalog'
import { useSessionStore } from '../store/session-store'
import { apiRequest } from './http'

export type CreateCategoryPayload = {
  title: string
  summary: string
  group: string
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload> & {
  iconKey?: string
  tags?: string[]
  checklist?: string[]
}

export type CreatePrototypePayload = {
  title: string
  repoUrl: string
  demoUrl?: string
  figmaUrl?: string
  summary: string
  status: PrototypeStatus
  visibility: PrototypeVisibility
  tags?: string[]
  notes?: string
}

export type UpdatePrototypePayload = Partial<CreatePrototypePayload>

export function useCatalogCategories() {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: ['catalog', 'categories'],
    queryFn: () => apiRequest<ScenarioCategory[]>('/catalog/categories'),
    enabled: isAuthenticated,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) =>
      apiRequest<ScenarioCategory>('/catalog/categories', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'categories'] })
    },
  })
}

export function useUpdateCategory(categoryId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateCategoryPayload) =>
      apiRequest<ScenarioCategory>(`/catalog/categories/${categoryId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'categories'] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (categoryId: string) =>
      apiRequest<{ success: boolean; categoryId: string }>(`/catalog/categories/${categoryId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'categories'] })
    },
  })
}

export function useCreatePrototype(categoryId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreatePrototypePayload) =>
      apiRequest<ScenarioCategory>(`/catalog/categories/${categoryId}/prototypes`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'categories'] })
    },
  })
}

export function useUpdatePrototype(categoryId: string, prototypeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdatePrototypePayload) =>
      apiRequest<ScenarioCategory>(
        `/catalog/categories/${categoryId}/prototypes/${prototypeId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'categories'] })
    },
  })
}

export function useDeletePrototype(categoryId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (prototypeId: string) =>
      apiRequest<ScenarioCategory>(
        `/catalog/categories/${categoryId}/prototypes/${prototypeId}`,
        {
          method: 'DELETE',
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'categories'] })
    },
  })
}
