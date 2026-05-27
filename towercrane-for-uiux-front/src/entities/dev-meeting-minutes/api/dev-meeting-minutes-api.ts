import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { apiRequest } from '../../../shared/api/http'
import { useSessionStore } from '../../../shared/store/session-store'
import type {
  DevMeetingMinutesDetail,
  DevMeetingMinutesListParams,
  DevMeetingMinutesListResponse,
  UpdateDevMeetingMinutesPayload,
} from '../model/types'

export const devMeetingMinutesKeys = {
  all: ['dev-meeting-minutes'] as const,
  lists: () => [...devMeetingMinutesKeys.all, 'list'] as const,
  list: (params: DevMeetingMinutesListParams) =>
    [...devMeetingMinutesKeys.lists(), params] as const,
  detail: (minutesId: string) =>
    [...devMeetingMinutesKeys.all, 'detail', minutesId] as const,
}

function buildListQuery(params: DevMeetingMinutesListParams) {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  })
  if (params.q) search.set('q', params.q)
  if (params.roomId) search.set('roomId', params.roomId)
  return search.toString()
}

export function useDevMeetingMinutesList(params: DevMeetingMinutesListParams) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: devMeetingMinutesKeys.list(params),
    queryFn: () =>
      apiRequest<DevMeetingMinutesListResponse>(
        `/dev-meeting-minutes?${buildListQuery(params)}`,
      ),
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  })
}

export function useDevMeetingMinutesDetail(minutesId: string | null) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: minutesId
      ? devMeetingMinutesKeys.detail(minutesId)
      : [...devMeetingMinutesKeys.all, 'detail', 'none'],
    queryFn: () =>
      apiRequest<DevMeetingMinutesDetail>(`/dev-meeting-minutes/${minutesId}`),
    enabled: isAuthenticated && Boolean(minutesId),
  })
}

export function useUpdateDevMeetingMinutes(minutesId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateDevMeetingMinutesPayload) => {
      if (!minutesId) throw new Error('minutesId required')
      return apiRequest<DevMeetingMinutesDetail>(
        `/dev-meeting-minutes/${minutesId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      )
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(devMeetingMinutesKeys.detail(detail.id), detail)
      void queryClient.invalidateQueries({
        queryKey: devMeetingMinutesKeys.lists(),
      })
    },
  })
}

export function useDeleteDevMeetingMinutes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (minutesId: string) =>
      apiRequest<{ success: boolean; id: string }>(
        `/dev-meeting-minutes/${minutesId}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: devMeetingMinutesKeys.all,
      })
    },
  })
}
