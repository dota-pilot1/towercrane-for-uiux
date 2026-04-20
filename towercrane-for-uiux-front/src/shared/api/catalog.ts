import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import type {
  PrototypeItem,
  PrototypeStatus,
  PrototypeVisibility,
  ScenarioCategory,
} from '../config/catalog'
import { useSessionStore } from '../store/session-store'
import { apiRequest } from './http'

export type PrototypeListSort = 'recent' | 'oldest' | 'title'

export type PrototypeListParams = {
  page: number
  pageSize: number
  q: string
  sort: PrototypeListSort
}

export type PrototypeListItem = PrototypeItem & {
  categoryId: string
  notes: string | null
  tags: string[]
  createdAt: string
  avgRating: number
  reviewCount: number
}

export type PrototypeListResponse = {
  items: PrototypeListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  query: { q: string; sort: PrototypeListSort }
}

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
  images?: string[]
  checklist?: string[]
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

export function useCategory(categoryId: string) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: ['catalog', 'categories', categoryId],
    queryFn: () => apiRequest<ScenarioCategory>(`/catalog/categories/${categoryId}`),
    enabled: isAuthenticated && Boolean(categoryId),
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
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'prototypes'] })
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
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'prototypes'] })
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
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'prototypes'] })
    },
  })
}

export function useReorderCategories() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (categoryIds: string[]) =>
      apiRequest<{ success: boolean }>('/catalog/categories/reorder', {
        method: 'POST',
        body: JSON.stringify({ categoryIds }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'categories'] })
    },
  })
}

export function useCategoryPrototypes(
  categoryId: string | null,
  params: PrototypeListParams,
) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: [
      'catalog',
      'prototypes',
      categoryId,
      params.page,
      params.pageSize,
      params.q,
      params.sort,
    ],
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize),
        sort: params.sort,
      })
      if (params.q.trim()) qs.set('q', params.q.trim())
      return apiRequest<PrototypeListResponse>(
        `/catalog/categories/${categoryId}/prototypes?${qs.toString()}`,
      )
    },
    enabled: isAuthenticated && Boolean(categoryId),
    placeholderData: keepPreviousData,
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
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'prototypes'] })
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
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'prototypes'] })
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
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'prototypes'] })
    },
  })
}
