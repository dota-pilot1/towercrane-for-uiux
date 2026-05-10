import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { issueApi } from '../../../entities/issue/api/issue-api'
import type {
  CreateIssueRequest,
  Issue,
  IssueFilters,
  UpdateIssueRequest,
} from '../../../entities/issue/model/types'

export const issueQueryKeys = {
  all: ['issues'] as const,
  list: (filters: IssueFilters) => ['issues', 'list', filters] as const,
  detail: (issueId: string | null) => ['issues', 'detail', issueId] as const,
  comments: (issueId: string | null) => ['issues', 'comments', issueId] as const,
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function useIssues(filters: IssueFilters) {
  return useQuery({
    queryKey: issueQueryKeys.list(filters),
    queryFn: () => issueApi.list(filters),
    enabled: Boolean(filters.prototypeId),
  })
}

export function useIssueDetail(issueId: string | null, enabled = true) {
  return useQuery({
    queryKey: issueQueryKeys.detail(issueId),
    queryFn: () => issueApi.detail(issueId as string),
    enabled: enabled && Boolean(issueId),
  })
}

export function useCreateIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateIssueRequest) => issueApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: issueQueryKeys.all })
      toast.success('이슈가 등록되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '이슈 등록에 실패했습니다.')),
  })
}

export function useUpdateIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateIssueRequest }) =>
      issueApi.update(id, body),
    onSuccess: (issue) => {
      queryClient.setQueryData(issueQueryKeys.detail(issue.id), issue)
      queryClient.invalidateQueries({ queryKey: issueQueryKeys.all })
      toast.success('이슈가 수정되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '이슈 수정에 실패했습니다.')),
  })
}

export function useDeleteIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (issueId: string) => issueApi.delete(issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: issueQueryKeys.all })
      toast.success('이슈가 삭제되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '이슈 삭제에 실패했습니다.')),
  })
}

export function useUpdateIssueStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Issue['status'] }) =>
      issueApi.updateStatus(id, status),
    onSuccess: (issue) => {
      queryClient.setQueryData(issueQueryKeys.detail(issue.id), issue)
      queryClient.invalidateQueries({ queryKey: issueQueryKeys.all })
    },
    onError: (error) => toast.error(messageFromError(error, '상태 변경에 실패했습니다.')),
  })
}

export function useReorderIssues() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: Array<{ id: string; orderIdx: number }>) =>
      issueApi.reorder(items),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: issueQueryKeys.all }),
    onError: (error) => toast.error(messageFromError(error, '순서 저장에 실패했습니다.')),
  })
}

export function useIssueComments(issueId: string | null) {
  return useQuery({
    queryKey: issueQueryKeys.comments(issueId),
    queryFn: () => issueApi.listComments(issueId as string),
    enabled: Boolean(issueId),
  })
}

export function useCreateIssueComment(issueId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => {
      if (!issueId) throw new Error('issueId required')
      return issueApi.createComment(issueId, content)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: issueQueryKeys.comments(issueId) }),
    onError: (error) => toast.error(messageFromError(error, '댓글 등록에 실패했습니다.')),
  })
}

export function useUpdateIssueComment(issueId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) => {
      if (!issueId) throw new Error('issueId required')
      return issueApi.updateComment(issueId, commentId, content)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: issueQueryKeys.comments(issueId) }),
    onError: (error) => toast.error(messageFromError(error, '댓글 수정에 실패했습니다.')),
  })
}

export function useDeleteIssueComment(issueId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => {
      if (!issueId) throw new Error('issueId required')
      return issueApi.deleteComment(issueId, commentId)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: issueQueryKeys.comments(issueId) }),
    onError: (error) => toast.error(messageFromError(error, '댓글 삭제에 실패했습니다.')),
  })
}
