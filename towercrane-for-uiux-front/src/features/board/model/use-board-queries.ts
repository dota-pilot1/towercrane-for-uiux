import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { adminBoardApi, boardApi, boardConfigApi } from '../../../entities/board/api/board-api'
import type {
  BoardFilters,
  BoardStatus,
  CreateBoardConfigRequest,
  CreateBoardRequest,
  UpdateBoardConfigRequest,
  UpdateBoardRequest,
} from '../../../entities/board/model/types'

export const boardQueryKeys = {
  all: ['boards'] as const,
  configs: () => ['boards', 'configs'] as const,
  adminConfigs: () => ['boards', 'adminConfigs'] as const,
  list: (code: string, filters: BoardFilters) => ['boards', 'list', code, filters] as const,
  adminList: (code: string, filters: BoardFilters) => ['boards', 'adminList', code, filters] as const,
  detail: (code: string, boardId: string | null) => ['boards', 'detail', code, boardId] as const,
  adminDetail: (code: string, boardId: string | null) =>
    ['boards', 'adminDetail', code, boardId] as const,
  comments: (code: string, boardId: string | null) => ['boards', 'comments', code, boardId] as const,
  unanswered: () => ['boards', 'unanswered'] as const,
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function useBoardConfigs() {
  return useQuery({
    queryKey: boardQueryKeys.configs(),
    queryFn: boardApi.listConfigs,
  })
}

export function useAdminBoardConfigs() {
  return useQuery({
    queryKey: boardQueryKeys.adminConfigs(),
    queryFn: boardConfigApi.listAdmin,
  })
}

export function useBoards(code: string, filters: BoardFilters) {
  return useQuery({
    queryKey: boardQueryKeys.list(code, filters),
    queryFn: () => boardApi.list(code, filters),
    enabled: Boolean(code),
  })
}

export function useAdminBoards(code: string, filters: BoardFilters) {
  return useQuery({
    queryKey: boardQueryKeys.adminList(code, filters),
    queryFn: () => adminBoardApi.list(code, filters),
    enabled: Boolean(code),
  })
}

export function useBoardDetail(code: string, boardId: string | null) {
  return useQuery({
    queryKey: boardQueryKeys.detail(code, boardId),
    queryFn: () => boardApi.detail(code, boardId as string),
    enabled: Boolean(code && boardId),
  })
}

export function useAdminBoardDetail(code: string, boardId: string | null) {
  return useQuery({
    queryKey: boardQueryKeys.adminDetail(code, boardId),
    queryFn: () => adminBoardApi.detail(code, boardId as string),
    enabled: Boolean(code && boardId),
  })
}

export function useBoardComments(code: string, boardId: string | null) {
  return useQuery({
    queryKey: boardQueryKeys.comments(code, boardId),
    queryFn: () => boardApi.listComments(code, boardId as string),
    enabled: Boolean(code && boardId),
  })
}

export function useUnansweredInquiryCount() {
  return useQuery({
    queryKey: boardQueryKeys.unanswered(),
    queryFn: adminBoardApi.unansweredCount,
  })
}

export function useCreateBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ code, body }: { code: string; body: CreateBoardRequest }) =>
      boardApi.create(code, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.all })
      toast.success('게시글이 등록되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '게시글 등록에 실패했습니다.')),
  })
}

export function useUpdateBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ code, boardId, body }: { code: string; boardId: string; body: UpdateBoardRequest }) =>
      boardApi.update(code, boardId, body),
    onSuccess: (board) => {
      queryClient.setQueryData(boardQueryKeys.detail(board.boardCode, board.id), board)
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.all })
      toast.success('게시글이 수정되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '게시글 수정에 실패했습니다.')),
  })
}

export function useDeleteBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ code, boardId }: { code: string; boardId: string }) =>
      boardApi.delete(code, boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.all })
      toast.success('게시글이 삭제되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '게시글 삭제에 실패했습니다.')),
  })
}

export function useCreateBoardComment(code: string, boardId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => {
      if (!boardId) throw new Error('boardId required')
      return boardApi.createComment(code, boardId, content)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.comments(code, boardId) })
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.detail(code, boardId) })
      toast.success('댓글이 등록되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '댓글 등록에 실패했습니다.')),
  })
}

export function useCreateBoardConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateBoardConfigRequest) => boardConfigApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.all })
      toast.success('게시판이 추가되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '게시판 추가에 실패했습니다.')),
  })
}

export function useUpdateBoardConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ code, body }: { code: string; body: UpdateBoardConfigRequest }) =>
      boardConfigApi.update(code, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.all })
      toast.success('게시판 설정이 저장되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '게시판 설정 저장에 실패했습니다.')),
  })
}

export function useDeactivateBoardConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => boardConfigApi.deactivate(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.all })
      toast.success('게시판이 비활성화되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '게시판 비활성화에 실패했습니다.')),
  })
}

export function useCreateAdminBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ code, body }: { code: string; body: CreateBoardRequest }) =>
      adminBoardApi.create(code, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.all })
      toast.success('관리자 게시글이 등록되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '관리자 게시글 등록에 실패했습니다.')),
  })
}

export function useUpdateAdminBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ code, boardId, body }: { code: string; boardId: string; body: UpdateBoardRequest }) =>
      adminBoardApi.update(code, boardId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.all })
      toast.success('게시글이 수정되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '게시글 수정에 실패했습니다.')),
  })
}

export function useAdminBoardAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      action,
      code,
      boardId,
      status,
    }: {
      action: 'delete' | 'pin' | 'unpin' | 'status'
      code: string
      boardId: string
      status?: BoardStatus
    }) => {
      if (action === 'delete') return adminBoardApi.delete(code, boardId)
      if (action === 'pin') return adminBoardApi.pin(code, boardId)
      if (action === 'unpin') return adminBoardApi.unpin(code, boardId)
      return adminBoardApi.updateStatus(code, boardId, status ?? 'PUBLISHED')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardQueryKeys.all }),
    onError: (error) => toast.error(messageFromError(error, '작업 처리에 실패했습니다.')),
  })
}

export function useCreateAdminReply(code: string, boardId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => {
      if (!boardId) throw new Error('boardId required')
      return adminBoardApi.reply(code, boardId, content)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.all })
      toast.success('답변이 등록되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '답변 등록에 실패했습니다.')),
  })
}
