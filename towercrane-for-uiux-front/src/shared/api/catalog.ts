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

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000/api'

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
  summary: string
  status: PrototypeStatus
  visibility: PrototypeVisibility
}

export type UpdatePrototypePayload = Partial<CreatePrototypePayload>

async function request<T>(input: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${input}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

export function useCatalogCategories() {
  return useQuery({
    queryKey: ['catalog', 'categories'],
    queryFn: () => request<ScenarioCategory[]>('/catalog/categories'),
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) =>
      request<ScenarioCategory>('/catalog/categories', {
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
      request<ScenarioCategory>(`/catalog/categories/${categoryId}`, {
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
      request<{ success: boolean; categoryId: string }>(`/catalog/categories/${categoryId}`, {
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
      request<ScenarioCategory>(`/catalog/categories/${categoryId}/prototypes`, {
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
      request<ScenarioCategory>(
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
      request<ScenarioCategory>(
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
