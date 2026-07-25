import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { apiRequest } from '../../../shared/api/http'
import { useSessionStore } from '../../../shared/store/session-store'
import type {
  AnalyzeCodeReviewPayload,
  AnalyzeGithubPrReviewPayload,
  CodeReviewDetail,
  CodeReviewListParams,
  CodeReviewListResponse,
  GithubPrReviewPreferences,
  CodeReviewRepositoryValidation,
  CreateCodeReviewPayload,
  SaveGithubPrReviewPreferencesPayload,
  UpdateCodeReviewPayload,
} from '../model/types'

export const codeReviewKeys = {
  all: ['code-reviews'] as const,
  lists: () => [...codeReviewKeys.all, 'list'] as const,
  list: (params: CodeReviewListParams) => [...codeReviewKeys.lists(), params] as const,
  taskList: (taskId: string | null) => [...codeReviewKeys.all, 'task', taskId] as const,
  detail: (reviewId: string) => [...codeReviewKeys.all, 'detail', reviewId] as const,
  githubPrPreferences: () => [...codeReviewKeys.all, 'github-pr-preferences'] as const,
}

function buildListQuery(params: CodeReviewListParams) {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  })
  if (params.q) search.set('q', params.q)
  if (params.repository) search.set('repository', params.repository)
  if (params.taskId) search.set('taskId', params.taskId)
  if (params.sourceType) search.set('sourceType', params.sourceType)
  if (params.riskLevel) search.set('riskLevel', params.riskLevel)
  return search.toString()
}

export function useCodeReviewList(params: CodeReviewListParams) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: codeReviewKeys.list(params),
    queryFn: () =>
      apiRequest<CodeReviewListResponse>(`/code-reviews?${buildListQuery(params)}`),
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  })
}

export function useTaskCodeReviewList(taskId: string | null) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: codeReviewKeys.taskList(taskId),
    queryFn: () =>
      apiRequest<CodeReviewListResponse>(
        `/code-reviews?${buildListQuery({
          taskId: taskId as string,
          page: 1,
          pageSize: 50,
        })}`,
      ),
    enabled: isAuthenticated && Boolean(taskId),
  })
}

export function useCodeReviewDetail(reviewId: string | null) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: reviewId
      ? codeReviewKeys.detail(reviewId)
      : [...codeReviewKeys.all, 'detail', 'none'],
    queryFn: () => apiRequest<CodeReviewDetail>(`/code-reviews/${reviewId}`),
    enabled: isAuthenticated && Boolean(reviewId),
  })
}

export function useAnalyzeCodeReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AnalyzeCodeReviewPayload) =>
      apiRequest<CodeReviewDetail>('/code-reviews/analyze', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (detail) => {
      queryClient.setQueryData(codeReviewKeys.detail(detail.id), detail)
      void queryClient.invalidateQueries({ queryKey: codeReviewKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: codeReviewKeys.taskList(detail.taskId) })
    },
  })
}

export function useAnalyzeGithubPrReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AnalyzeGithubPrReviewPayload) =>
      apiRequest<CodeReviewDetail>('/code-reviews/pr/analyze', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (detail) => {
      queryClient.setQueryData(codeReviewKeys.detail(detail.id), detail)
      void queryClient.invalidateQueries({ queryKey: codeReviewKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: codeReviewKeys.taskList(detail.taskId) })
    },
  })
}

export function useGithubPrReviewPreferences() {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: codeReviewKeys.githubPrPreferences(),
    queryFn: () => apiRequest<GithubPrReviewPreferences>('/code-reviews/preferences'),
    enabled: isAuthenticated,
  })
}

export function useSaveGithubPrReviewPreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SaveGithubPrReviewPreferencesPayload) =>
      apiRequest<GithubPrReviewPreferences>('/code-reviews/preferences', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: (preferences) => {
      queryClient.setQueryData(codeReviewKeys.githubPrPreferences(), preferences)
    },
  })
}

export function useCreateCodeReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateCodeReviewPayload) =>
      apiRequest<CodeReviewDetail>('/code-reviews', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (detail) => {
      queryClient.setQueryData(codeReviewKeys.detail(detail.id), detail)
      void queryClient.invalidateQueries({ queryKey: codeReviewKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: codeReviewKeys.taskList(detail.taskId) })
    },
  })
}

export function useValidateCodeReviewRepository() {
  return useMutation({
    mutationFn: (repositoryUrl: string) =>
      apiRequest<CodeReviewRepositoryValidation>('/code-reviews/repository/validate', {
        method: 'POST',
        body: JSON.stringify({ repositoryUrl }),
      }),
  })
}

export function useUpdateCodeReview(reviewId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateCodeReviewPayload) => {
      if (!reviewId) throw new Error('reviewId required')
      return apiRequest<CodeReviewDetail>(`/code-reviews/${reviewId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(codeReviewKeys.detail(detail.id), detail)
      void queryClient.invalidateQueries({ queryKey: codeReviewKeys.lists() })
    },
  })
}

export function useLinkCodeReviewToTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ reviewId, taskId }: { reviewId: string; taskId: string | null }) =>
      apiRequest<CodeReviewDetail>(`/code-reviews/${reviewId}`, {
        method: 'PATCH',
        body: JSON.stringify({ taskId }),
      }),
    onSuccess: (detail) => {
      queryClient.setQueryData(codeReviewKeys.detail(detail.id), detail)
      void queryClient.invalidateQueries({ queryKey: codeReviewKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: codeReviewKeys.all })
    },
  })
}

export function useDeleteCodeReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (reviewId: string) =>
      apiRequest<{ success: boolean; id: string }>(`/code-reviews/${reviewId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: codeReviewKeys.all })
    },
  })
}
