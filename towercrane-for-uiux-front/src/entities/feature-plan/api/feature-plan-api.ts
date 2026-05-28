import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { apiRequest } from '../../../shared/api/http'
import { useSessionStore } from '../../../shared/store/session-store'
import type {
  CreateFeaturePlanPayload,
  FeaturePlanDetail,
  FeaturePlanListParams,
  FeaturePlanListResponse,
  RegisterFeaturePlanTaskResponse,
  UpdateFeaturePlanPayload,
} from '../model/types'

export const featurePlanKeys = {
  all: ['feature-plans'] as const,
  lists: () => [...featurePlanKeys.all, 'list'] as const,
  list: (params: FeaturePlanListParams) => [...featurePlanKeys.lists(), params] as const,
  taskList: (taskId: string | null) => [...featurePlanKeys.all, 'task', taskId] as const,
  detail: (planId: string) => [...featurePlanKeys.all, 'detail', planId] as const,
}

function buildListQuery(params: FeaturePlanListParams) {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  })
  if (params.q) search.set('q', params.q)
  if (params.taskId) search.set('taskId', params.taskId)
  return search.toString()
}

export function useFeaturePlanList(params: FeaturePlanListParams) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: featurePlanKeys.list(params),
    queryFn: () =>
      apiRequest<FeaturePlanListResponse>(`/feature-plans?${buildListQuery(params)}`),
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  })
}

export function useTaskFeaturePlanList(taskId: string | null) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: featurePlanKeys.taskList(taskId),
    queryFn: () =>
      apiRequest<FeaturePlanListResponse>(
        `/feature-plans?${buildListQuery({
          taskId: taskId as string,
          page: 1,
          pageSize: 50,
        })}`,
      ),
    enabled: isAuthenticated && Boolean(taskId),
  })
}

export function useFeaturePlanDetail(planId: string | null) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: planId
      ? featurePlanKeys.detail(planId)
      : [...featurePlanKeys.all, 'detail', 'none'],
    queryFn: () => apiRequest<FeaturePlanDetail>(`/feature-plans/${planId}`),
    enabled: isAuthenticated && Boolean(planId),
  })
}

export function useCreateFeaturePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateFeaturePlanPayload) =>
      apiRequest<FeaturePlanDetail>('/feature-plans', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (detail) => {
      queryClient.setQueryData(featurePlanKeys.detail(detail.id), detail)
      void queryClient.invalidateQueries({ queryKey: featurePlanKeys.lists() })
    },
  })
}

export function useUpdateFeaturePlan(planId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateFeaturePlanPayload) => {
      if (!planId) throw new Error('planId required')
      return apiRequest<FeaturePlanDetail>(`/feature-plans/${planId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(featurePlanKeys.detail(detail.id), detail)
      void queryClient.invalidateQueries({ queryKey: featurePlanKeys.lists() })
    },
  })
}

export function useLinkFeaturePlanToTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ planId, taskId }: { planId: string; taskId: string | null }) =>
      apiRequest<FeaturePlanDetail>(`/feature-plans/${planId}`, {
        method: 'PATCH',
        body: JSON.stringify({ linkedTaskId: taskId }),
      }),
    onSuccess: (detail) => {
      queryClient.setQueryData(featurePlanKeys.detail(detail.id), detail)
      void queryClient.invalidateQueries({ queryKey: featurePlanKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: featurePlanKeys.all })
    },
  })
}

export function useDeleteFeaturePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (planId: string) =>
      apiRequest<{ success: boolean; id: string }>(`/feature-plans/${planId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: featurePlanKeys.all })
    },
  })
}

export function useRegisterFeaturePlanTask(planId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      if (!planId) throw new Error('planId required')
      return apiRequest<RegisterFeaturePlanTaskResponse>(
        `/feature-plans/${planId}/register-task`,
        { method: 'POST' },
      )
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(featurePlanKeys.detail(detail.id), detail)
      void queryClient.invalidateQueries({ queryKey: featurePlanKeys.lists() })
    },
  })
}
