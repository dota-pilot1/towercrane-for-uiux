import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { aiEvaluationApi } from '../../../entities/ai-evaluation/api/ai-evaluation-api'

export const evalQueryKeys = {
  evaluatees: () => ['ai-evaluation', 'evaluatees'] as const,
  items: (evaluateeId: string) => ['ai-evaluation', 'items', evaluateeId] as const,
  summary: (evaluateeId: string) => ['ai-evaluation', 'summary', evaluateeId] as const,
}

export function useEvaluatees() {
  return useQuery({
    queryKey: evalQueryKeys.evaluatees(),
    queryFn: aiEvaluationApi.listEvaluatees,
  })
}

export function useCreateEvaluatee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: aiEvaluationApi.createEvaluatee,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: evalQueryKeys.evaluatees() })
      toast.success('대상자가 등록되었습니다.')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '등록 실패'),
  })
}

export function useDeleteEvaluatee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: aiEvaluationApi.deleteEvaluatee,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: evalQueryKeys.evaluatees() })
      toast.success('대상자가 삭제되었습니다.')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '삭제 실패'),
  })
}

export function useEvalItems(evaluateeId: string | null) {
  return useQuery({
    queryKey: evalQueryKeys.items(evaluateeId ?? ''),
    queryFn: () => aiEvaluationApi.getItems(evaluateeId!),
    enabled: Boolean(evaluateeId),
  })
}

export function useCreateEvalItem(evaluateeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { categoryId: string; title: string; description?: string }) =>
      aiEvaluationApi.createItem(evaluateeId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: evalQueryKeys.items(evaluateeId) })
      qc.invalidateQueries({ queryKey: evalQueryKeys.summary(evaluateeId) })
      toast.success('항목이 추가되었습니다.')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '추가 실패'),
  })
}

export function useDeleteEvalItem(evaluateeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: aiEvaluationApi.deleteItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: evalQueryKeys.items(evaluateeId) })
      qc.invalidateQueries({ queryKey: evalQueryKeys.summary(evaluateeId) })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '삭제 실패'),
  })
}

export function useUpsertScore(evaluateeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: { score: number; note?: string } }) =>
      aiEvaluationApi.upsertScore(itemId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: evalQueryKeys.items(evaluateeId) })
      qc.invalidateQueries({ queryKey: evalQueryKeys.summary(evaluateeId) })
    },
  })
}

export function useEvalSummary(evaluateeId: string | null) {
  return useQuery({
    queryKey: evalQueryKeys.summary(evaluateeId ?? ''),
    queryFn: () => aiEvaluationApi.getSummary(evaluateeId!),
    enabled: Boolean(evaluateeId),
  })
}
