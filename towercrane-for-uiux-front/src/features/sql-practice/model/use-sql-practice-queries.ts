import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { sqlPracticeApi } from '../../../entities/sql-practice/api/sql-practice-api'
import type {
  CreateSqlPracticeNotePayload,
  SqlPracticeGradePayload,
  SqlPracticeNoteFilter,
  SqlPracticeSeedSource,
  UpdateSqlPracticeNotePayload,
} from '../../../entities/sql-practice/model/types'

export const sqlPracticeQueryKeys = {
  all: ['sql-practice'] as const,
  meta: ['sql-practice', 'meta'] as const,
  tables: ['sql-practice', 'tables'] as const,
  seeds: ['sql-practice', 'seeds'] as const,
  erd: (fileName: string) => ['sql-practice', 'erd', fileName] as const,
  notes: (filter?: SqlPracticeNoteFilter) => ['sql-practice', 'notes', filter ?? {}] as const,
  submissions: (seedFile: string) => ['sql-practice', 'submissions', seedFile] as const,
  ranking: (seedFile: string) => ['sql-practice', 'ranking', seedFile] as const,
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function shouldRefreshTables(type: string, schemaChanged?: boolean) {
  return (
    schemaChanged ||
    ['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER'].includes(type)
  )
}

export function useSqlPracticeMeta() {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.meta,
    queryFn: sqlPracticeApi.getMeta,
  })
}

export function useSqlPracticeTables() {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.tables,
    queryFn: sqlPracticeApi.getTables,
  })
}

export function useSqlPracticeSeeds() {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.seeds,
    queryFn: sqlPracticeApi.getSeeds,
  })
}

export function useExecuteSqlPracticeQuery() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (query: string) => sqlPracticeApi.execute(query),
    onSuccess: (response) => {
      if (response.seedReloaded || shouldRefreshTables(response.type, response.schemaChanged)) {
        queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.meta })
        queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.tables })
        queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.seeds })
      }
    },
    onError: (error) => toast.error(messageFromError(error, 'SQL 실행에 실패했습니다.')),
  })
}

export function useActivateSqlPracticeSeed(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { source: SqlPracticeSeedSource; fileName: string }) =>
      sqlPracticeApi.activateSeed(payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.meta })
      queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.tables })
      queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.seeds })
      toast.success(`${response.activeSeed.title} 파일로 이동했습니다.`)
      options?.onSuccess?.()
    },
    onError: (error) =>
      toast.error(messageFromError(error, 'SQL 연습 파일 변경에 실패했습니다.')),
  })
}

export function useResetSqlPracticeDb() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: sqlPracticeApi.reset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.meta })
      queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.tables })
      queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.seeds })
      toast.success('SQL 연습 DB를 초기화했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, 'SQL 연습 DB 초기화에 실패했습니다.')),
  })
}

export function useSqlPracticeErd(fileName: string | undefined) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.erd(fileName ?? ''),
    queryFn: () => sqlPracticeApi.getSeedErd(fileName!),
    enabled: Boolean(fileName),
    staleTime: Infinity,
  })
}

export function useReloadSqlPracticeSeed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: sqlPracticeApi.reloadSeed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.meta })
      queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.tables })
      queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.seeds })
      toast.success('현재 SQL 연습 파일을 다시 적용했습니다.')
    },
    onError: (error) =>
      toast.error(messageFromError(error, 'SQL 연습 파일 적용에 실패했습니다.')),
  })
}

export function useSqlPracticeNotes(filter?: SqlPracticeNoteFilter, enabled = true) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.notes(filter),
    queryFn: () => sqlPracticeApi.getNotes(filter),
    enabled,
  })
}

export function useSqlPracticeMySubmissions(seedFile: string | undefined) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.submissions(seedFile ?? ''),
    queryFn: () => sqlPracticeApi.getMySubmissions(seedFile!),
    enabled: Boolean(seedFile),
  })
}

export function useSqlPracticeRanking(seedFile: string | undefined, enabled = true) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.ranking(seedFile ?? ''),
    queryFn: () => sqlPracticeApi.getRanking(seedFile!),
    enabled: Boolean(seedFile) && enabled,
  })
}

export function useGradeSqlPracticeSubmission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SqlPracticeGradePayload) => sqlPracticeApi.gradeSubmission(payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: sqlPracticeQueryKeys.submissions(response.submission.seedFile),
      })
      queryClient.invalidateQueries({
        queryKey: sqlPracticeQueryKeys.ranking(response.submission.seedFile),
      })
    },
    onError: (error) => toast.error(messageFromError(error, 'SQL 답안 채점에 실패했습니다.')),
  })
}

export function useCreateSqlPracticeNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateSqlPracticeNotePayload) => sqlPracticeApi.createNote(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...sqlPracticeQueryKeys.all, 'notes'] })
      toast.success('SQL 노트를 저장했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, 'SQL 노트 저장에 실패했습니다.')),
  })
}

export function useUpdateSqlPracticeNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateSqlPracticeNotePayload
    }) => sqlPracticeApi.updateNote(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...sqlPracticeQueryKeys.all, 'notes'] })
      toast.success('SQL 노트를 수정했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, 'SQL 노트 수정에 실패했습니다.')),
  })
}

export function useDeleteSqlPracticeNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => sqlPracticeApi.deleteNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...sqlPracticeQueryKeys.all, 'notes'] })
      toast.success('SQL 노트를 삭제했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, 'SQL 노트 삭제에 실패했습니다.')),
  })
}
