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

export type PrototypeWorkspaceRole = 'owner' | 'editor' | 'member' | 'viewer'

export type PrototypeWorkspace = {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  orderIdx: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
  role: PrototypeWorkspaceRole | null
  categoryCount: number
  topicCount?: number
  prototypeCount: number
}

export type CreatePrototypeWorkspacePayload = {
  name: string
  description?: string | null
  icon?: string | null
  color?: string | null
}

export type UpdatePrototypeWorkspacePayload = Partial<CreatePrototypeWorkspacePayload>

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
  repoUrl?: string
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
    queryFn: () => apiRequest<ScenarioCategory[]>('/catalog/topics'),
  })
}

export function usePrototypeWorkspaces() {
  return useQuery({
    queryKey: ['catalog', 'workspaces'],
    queryFn: () => apiRequest<PrototypeWorkspace[]>('/catalog/workspaces'),
  })
}

export function useCreatePrototypeWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreatePrototypeWorkspacePayload) =>
      apiRequest<PrototypeWorkspace>('/catalog/workspaces', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'workspaces'] })
    },
  })
}

export function useUpdatePrototypeWorkspace(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdatePrototypeWorkspacePayload) =>
      apiRequest<PrototypeWorkspace>(`/catalog/workspaces/${workspaceId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'workspaces'] })
      void queryClient.invalidateQueries({
        queryKey: ['catalog', 'workspaces', workspaceId],
      })
    },
  })
}

export function useDeletePrototypeWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (workspaceId: string) =>
      apiRequest<{ success: boolean }>(`/catalog/workspaces/${workspaceId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'workspaces'] })
    },
  })
}

export function useReorderPrototypeWorkspaces() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (items: { id: string; orderIdx: number }[]) =>
      apiRequest<{ success: boolean }>('/catalog/workspaces/reorder', {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'workspaces'] })
    },
  })
}

export function useWorkspaceCategories(workspaceId: string | null) {
  return useQuery({
    queryKey: ['catalog', 'workspaces', workspaceId, 'categories'],
    queryFn: () =>
      apiRequest<ScenarioCategory[]>(
        `/catalog/workspaces/${workspaceId}/topics`,
      ),
    enabled: Boolean(workspaceId),
  })
}

export function useCategory(categoryId: string) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: ['catalog', 'categories', categoryId],
    queryFn: () => apiRequest<ScenarioCategory>(`/catalog/topics/${categoryId}`),
    enabled: Boolean(categoryId),
  })
}

export function useCreateWorkspaceCategory(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) =>
      apiRequest<ScenarioCategory>(`/catalog/workspaces/${workspaceId}/topics`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'workspaces'] })
      void queryClient.invalidateQueries({
        queryKey: ['catalog', 'workspaces', workspaceId, 'categories'],
      })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'prototypes'] })
    },
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) =>
      apiRequest<ScenarioCategory>('/catalog/topics', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'categories'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'workspaces'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'prototypes'] })
    },
  })
}

export function useUpdateCategory(categoryId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateCategoryPayload) =>
      apiRequest<ScenarioCategory>(`/catalog/topics/${categoryId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'categories'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'workspaces'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'prototypes'] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (categoryId: string) =>
      apiRequest<{ success: boolean; categoryId: string }>(`/catalog/topics/${categoryId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'categories'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'workspaces'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'prototypes'] })
    },
  })
}

export function useReorderWorkspaceCategories(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (items: { id: string; orderIdx: number }[]) =>
      apiRequest<{ success: boolean }>(
        `/catalog/workspaces/${workspaceId}/topics/reorder`,
        {
          method: 'POST',
          body: JSON.stringify({ items }),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['catalog', 'workspaces', workspaceId, 'categories'],
      })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'workspaces'] })
    },
  })
}

export function useReorderCategories() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (categoryIds: string[]) =>
      apiRequest<{ success: boolean }>('/catalog/topics/reorder', {
        method: 'POST',
        body: JSON.stringify({ topicIds: categoryIds }),
      }),
    onMutate: async (categoryIds) => {
      await queryClient.cancelQueries({ queryKey: ['catalog', 'categories'] })
      const previousCategories = queryClient.getQueryData<ScenarioCategory[]>(['catalog', 'categories'])
      if (previousCategories) {
        const reordered = categoryIds
          .map((id) => previousCategories.find((c) => c.id === id))
          .filter((c): c is ScenarioCategory => Boolean(c))
        queryClient.setQueryData(['catalog', 'categories'], reordered)
      }
      return { previousCategories }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['catalog', 'categories'], context.previousCategories)
      }
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
        `/catalog/topics/${categoryId}/prototypes?${qs.toString()}`,
      )
    },
    enabled: Boolean(categoryId),
    placeholderData: keepPreviousData,
  })
}

export function useCreatePrototype(categoryId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreatePrototypePayload) =>
      apiRequest<ScenarioCategory>(`/catalog/topics/${categoryId}/prototypes`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'categories'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'workspaces'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'prototypes'] })
    },
  })
}

export function useUpdatePrototype(categoryId: string, prototypeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdatePrototypePayload) =>
      apiRequest<ScenarioCategory>(
        `/catalog/topics/${categoryId}/prototypes/${prototypeId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'categories'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'workspaces'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'prototypes'] })
    },
  })
}

export function useDeletePrototype(categoryId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (prototypeId: string) =>
      apiRequest<ScenarioCategory>(
        `/catalog/topics/${categoryId}/prototypes/${prototypeId}`,
        {
          method: 'DELETE',
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'categories'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'workspaces'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'prototypes'] })
    },
  })
}
