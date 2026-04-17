import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { apiRequest } from './http'
import { useSessionStore } from '../store/session-store'

export type ReviewStats = {
  avgRating: number
  count: number
  distribution: Record<string, number>
}

export type Review = {
  id: string
  prototypeId: string
  userId: string
  userName: string
  rating: number
  content: string
  createdAt: string
  updatedAt: string
  isMine: boolean
}

export type ReviewListResponse = {
  items: Review[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  stats: ReviewStats
}

export type MyReview = {
  id: string
  prototypeId: string
  userId: string
  rating: number
  content: string
  createdAt: string
  updatedAt: string
} | null

const reviewsKey = (prototypeId: string) => ['reviews', prototypeId] as const
const myReviewKey = (prototypeId: string) => ['reviews', prototypeId, 'me'] as const

export function useReviewList(
  prototypeId: string | null,
  params: { page: number; pageSize: number },
) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: prototypeId
      ? [...reviewsKey(prototypeId), params.page, params.pageSize]
      : ['reviews', 'none'],
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize),
      })
      return apiRequest<ReviewListResponse>(
        `/prototypes/${prototypeId}/reviews?${qs.toString()}`,
      )
    },
    enabled: isAuthenticated && Boolean(prototypeId),
    placeholderData: keepPreviousData,
  })
}

export function useMyReview(prototypeId: string | null) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: prototypeId ? myReviewKey(prototypeId) : ['reviews', 'me', 'none'],
    queryFn: () =>
      apiRequest<MyReview>(`/prototypes/${prototypeId}/reviews/me`),
    enabled: isAuthenticated && Boolean(prototypeId),
  })
}

export function useCreateReview(prototypeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { rating: number; content: string }) =>
      apiRequest<MyReview>(`/prototypes/${prototypeId}/reviews`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewsKey(prototypeId) })
      void queryClient.invalidateQueries({ queryKey: myReviewKey(prototypeId) })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'prototypes'] })
    },
  })
}

export function useUpdateMyReview(prototypeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { rating?: number; content?: string }) =>
      apiRequest<MyReview>(`/prototypes/${prototypeId}/reviews/me`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewsKey(prototypeId) })
      void queryClient.invalidateQueries({ queryKey: myReviewKey(prototypeId) })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'prototypes'] })
    },
  })
}

export function useDeleteMyReview(prototypeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiRequest<{ success: boolean }>(`/prototypes/${prototypeId}/reviews/me`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewsKey(prototypeId) })
      void queryClient.invalidateQueries({ queryKey: myReviewKey(prototypeId) })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'prototypes'] })
    },
  })
}
