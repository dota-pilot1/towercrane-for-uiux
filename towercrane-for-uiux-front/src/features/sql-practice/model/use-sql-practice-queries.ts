import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { sqlPracticeApi } from '../../../entities/sql-practice/api/sql-practice-api'
import type {
  CreateSqlPracticeNotePayload,
  SqlPracticeGradePayload,
  SqlPracticeNoteFilter,
  SqlPracticeSeedSource,
  SqlTeamPracticeMemberRole,
  SqlUserPracticeGenerateAnswerPayload,
  SqlUserPracticeGradePayload,
  SqlUserPracticeProblemPayload,
  UpdateSqlPracticeNotePayload,
} from '../../../entities/sql-practice/model/types'

export const sqlPracticeQueryKeys = {
  all: ['sql-practice'] as const,
  meta: ['sql-practice', 'meta'] as const,
  tables: ['sql-practice', 'tables'] as const,
  seeds: ['sql-practice', 'seeds'] as const,
  erd: (fileName: string) => ['sql-practice', 'erd', fileName] as const,
  notes: (filter?: SqlPracticeNoteFilter) => ['sql-practice', 'notes', filter ?? {}] as const,
  note: (id: string) => ['sql-practice', 'note', id] as const,
  publicNote: (token: string) => ['sql-practice', 'public-note', token] as const,
  submissions: (seedFile: string) => ['sql-practice', 'submissions', seedFile] as const,
  ranking: (seedFile: string) => ['sql-practice', 'ranking', seedFile] as const,
  activity: (seedFile: string) => ['sql-practice', 'activity', seedFile] as const,
  myActivity: (seedFile: string) => ['sql-practice', 'my-activity', seedFile] as const,
  userMeta: ['sql-practice', 'user', 'meta'] as const,
  userTables: ['sql-practice', 'user', 'tables'] as const,
  userErd: ['sql-practice', 'user', 'erd'] as const,
  userSubmissions: ['sql-practice', 'user', 'submissions'] as const,
  userProblems: (filter?: { level?: number; mine?: boolean }) =>
    ['sql-practice', 'user', 'problems', filter ?? {}] as const,
  personalWorkspaces: ['sql-practice', 'personal', 'workspaces'] as const,
  personalDefaultWorkspace: ['sql-practice', 'personal', 'workspaces', 'default'] as const,
  personalMeta: (workspaceId: string) => ['sql-practice', 'personal', workspaceId, 'meta'] as const,
  personalTables: (workspaceId: string) =>
    ['sql-practice', 'personal', workspaceId, 'tables'] as const,
  personalErd: (workspaceId: string) => ['sql-practice', 'personal', workspaceId, 'erd'] as const,
  personalProblems: (workspaceId: string, filter?: { level?: number }) =>
    ['sql-practice', 'personal', workspaceId, 'problems', filter ?? {}] as const,
  publicPersonalProblem: (token: string) => ['sql-practice', 'public-personal', token] as const,
  teamWorkspaces: ['sql-practice', 'team', 'workspaces'] as const,
  teamWorkspace: (workspaceId: string) => ['sql-practice', 'team', workspaceId] as const,
  teamMembers: (workspaceId: string) => ['sql-practice', 'team', workspaceId, 'members'] as const,
  teamMeta: (workspaceId: string) => ['sql-practice', 'team', workspaceId, 'meta'] as const,
  teamTables: (workspaceId: string) => ['sql-practice', 'team', workspaceId, 'tables'] as const,
  teamErd: (workspaceId: string) => ['sql-practice', 'team', workspaceId, 'erd'] as const,
  teamProblems: (workspaceId: string, filter?: { level?: number; mine?: boolean }) =>
    ['sql-practice', 'team', workspaceId, 'problems', filter ?? {}] as const,
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function shouldRefreshTables(type: string, schemaChanged?: boolean) {
  return schemaChanged || ['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER'].includes(type)
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
        queryClient.invalidateQueries({
          queryKey: sqlPracticeQueryKeys.tables,
        })
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
      toast.success(`내 연습 파일을 ${response.activeSeed.title}(으)로 변경했습니다.`)
      options?.onSuccess?.()
    },
    onError: (error) => toast.error(messageFromError(error, 'SQL 연습 파일 변경에 실패했습니다.')),
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
      toast.success('내 SQL 연습 DB를 초기화했습니다.')
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
      toast.success('내 SQL 연습 파일을 다시 적용했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, 'SQL 연습 파일 적용에 실패했습니다.')),
  })
}

export function useSqlPracticeNotes(filter?: SqlPracticeNoteFilter, enabled = true) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.notes(filter),
    queryFn: () => sqlPracticeApi.getNotes(filter),
    enabled,
  })
}

export function useSqlPracticeNote(id: string | undefined) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.note(id ?? ''),
    queryFn: () => sqlPracticeApi.getNote(id!),
    enabled: Boolean(id),
  })
}

export function usePublicSqlPracticeNote(token: string | undefined) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.publicNote(token ?? ''),
    queryFn: () => sqlPracticeApi.getPublicNote(token!),
    enabled: Boolean(token),
  })
}

export function useSharedSqlPracticeNoteById(id: string | undefined) {
  return useQuery({
    queryKey: ['sql-practice', 'shared-by-id', id ?? ''],
    queryFn: () => sqlPracticeApi.getNoteByIdPublic(id!),
    enabled: Boolean(id),
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
    refetchInterval: enabled ? 5000 : false,
  })
}

export function useSqlPracticeActivity(seedFile: string | undefined, enabled = true) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.activity(seedFile ?? ''),
    queryFn: () => sqlPracticeApi.getActivity(seedFile!, 30),
    enabled: Boolean(seedFile) && enabled,
    refetchInterval: enabled ? 5000 : false,
  })
}

export function useSqlPracticeMyActivity(seedFile: string | undefined, enabled = true) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.myActivity(seedFile ?? ''),
    queryFn: () => sqlPracticeApi.getMyActivity(seedFile!, 30),
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
      queryClient.invalidateQueries({
        queryKey: sqlPracticeQueryKeys.activity(response.submission.seedFile),
      })
      queryClient.invalidateQueries({
        queryKey: sqlPracticeQueryKeys.myActivity(response.submission.seedFile),
      })
    },
    onError: (error) => toast.error(messageFromError(error, 'SQL 답안 채점에 실패했습니다.')),
  })
}

function invalidateSqlPracticeLogs(
  queryClient: ReturnType<typeof useQueryClient>,
  seedFile: string,
) {
  queryClient.invalidateQueries({
    queryKey: sqlPracticeQueryKeys.activity(seedFile),
  })
  queryClient.invalidateQueries({
    queryKey: sqlPracticeQueryKeys.myActivity(seedFile),
  })
}

export function useDeleteSqlPracticeActivityItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => sqlPracticeApi.deleteMyActivityItem(id),
    onSuccess: (response) => {
      invalidateSqlPracticeLogs(queryClient, response.seedFile)
      toast.success('풀이 로그를 삭제했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '풀이 로그 삭제에 실패했습니다.')),
  })
}

export function useClearSqlPracticeMyActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (seedFile: string) => sqlPracticeApi.clearMyActivity(seedFile),
    onSuccess: (response) => {
      invalidateSqlPracticeLogs(queryClient, response.seedFile)
      toast.success('풀이 로그를 모두 삭제했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '풀이 로그 전체 삭제에 실패했습니다.')),
  })
}

export function useSqlPracticeSupplementExplanation() {
  return useMutation({
    mutationFn: (content: string) => sqlPracticeApi.geminiAsk(content, 'general'),
    onError: (error) =>
      toast.error(messageFromError(error, 'SQL 보충 설명을 생성하지 못했습니다.')),
  })
}

export function useCreateSqlPracticeNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateSqlPracticeNotePayload) => sqlPracticeApi.createNote(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...sqlPracticeQueryKeys.all, 'notes'],
      })
      toast.success('SQL 노트를 저장했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, 'SQL 노트 저장에 실패했습니다.')),
  })
}

export function useUpdateSqlPracticeNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSqlPracticeNotePayload }) =>
      sqlPracticeApi.updateNote(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...sqlPracticeQueryKeys.all, 'notes'],
      })
      toast.success('SQL 노트를 수정했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, 'SQL 노트 수정에 실패했습니다.')),
  })
}

export function useShareSqlPracticeNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => sqlPracticeApi.shareNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...sqlPracticeQueryKeys.all, 'notes'],
      })
      toast.success('공개 공유 링크를 만들었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '공유 링크 생성에 실패했습니다.')),
  })
}

export function useDeleteSqlPracticeNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => sqlPracticeApi.deleteNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...sqlPracticeQueryKeys.all, 'notes'],
      })
      toast.success('SQL 노트를 삭제했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, 'SQL 노트 삭제에 실패했습니다.')),
  })
}

export function useSqlUserPracticeMeta() {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.userMeta,
    queryFn: sqlPracticeApi.getUserMeta,
  })
}

export function useSqlUserPracticeTables() {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.userTables,
    queryFn: sqlPracticeApi.getUserTables,
  })
}

export function useSqlUserPracticeErd() {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.userErd,
    queryFn: sqlPracticeApi.getUserErd,
    staleTime: Infinity,
  })
}

export function useSqlUserPracticeProblems(filter?: { level?: number; mine?: boolean }) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.userProblems(filter),
    queryFn: () => sqlPracticeApi.getUserProblems(filter),
  })
}

export function useSqlUserPracticeSubmissions() {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.userSubmissions,
    queryFn: sqlPracticeApi.getUserSubmissions,
  })
}

export function useExecuteSqlUserPracticeQuery() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (query: string) => sqlPracticeApi.executeUser(query),
    onSuccess: (response) => {
      if (response.seedReloaded || shouldRefreshTables(response.type, response.schemaChanged)) {
        queryClient.invalidateQueries({
          queryKey: sqlPracticeQueryKeys.userMeta,
        })
        queryClient.invalidateQueries({
          queryKey: sqlPracticeQueryKeys.userTables,
        })
      }
    },
    onError: (error) => toast.error(messageFromError(error, 'SQL 실행에 실패했습니다.')),
  })
}

export function useResetSqlUserPracticeDb() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: sqlPracticeApi.resetUser,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: sqlPracticeQueryKeys.userMeta,
      })
      queryClient.invalidateQueries({
        queryKey: sqlPracticeQueryKeys.userTables,
      })
      toast.success('유저 SQL 연습 DB를 초기화했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, 'SQL 연습 DB 초기화에 실패했습니다.')),
  })
}

export function useCreateSqlUserPracticeProblem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SqlUserPracticeProblemPayload) =>
      sqlPracticeApi.createUserProblem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['sql-practice', 'user', 'problems'],
      })
      toast.success('문제를 등록했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '문제 등록에 실패했습니다.')),
  })
}

export function useGenerateSqlUserPracticeAnswer() {
  return useMutation({
    mutationFn: (payload: SqlUserPracticeGenerateAnswerPayload) =>
      sqlPracticeApi.generateUserProblemAnswer(payload),
    onSuccess: () => {
      toast.success('정답 SQL을 생성했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '정답 SQL 생성에 실패했습니다.')),
  })
}

export function useGradeSqlUserPracticeProblem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SqlUserPracticeGradePayload }) =>
      sqlPracticeApi.gradeUserProblem(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: sqlPracticeQueryKeys.userSubmissions,
      })
    },
    onError: (error) => toast.error(messageFromError(error, 'SQL 답안 채점에 실패했습니다.')),
  })
}

export function useSqlPersonalDefaultWorkspace() {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.personalDefaultWorkspace,
    queryFn: sqlPracticeApi.getDefaultPersonalWorkspace,
  })
}

export function useSqlPersonalPracticeMeta(workspaceId: string | undefined) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.personalMeta(workspaceId ?? ''),
    queryFn: () => sqlPracticeApi.getPersonalMeta(workspaceId!),
    enabled: Boolean(workspaceId),
  })
}

export function useSqlPersonalPracticeTables(workspaceId: string | undefined) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.personalTables(workspaceId ?? ''),
    queryFn: () => sqlPracticeApi.getPersonalTables(workspaceId!),
    enabled: Boolean(workspaceId),
  })
}

export function useSqlPersonalPracticeErd(workspaceId: string | undefined) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.personalErd(workspaceId ?? ''),
    queryFn: () => sqlPracticeApi.getPersonalErd(workspaceId!),
    enabled: Boolean(workspaceId),
    staleTime: Infinity,
  })
}

export function useSqlPersonalPracticeProblems(
  workspaceId: string | undefined,
  filter?: { level?: number },
) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.personalProblems(workspaceId ?? '', filter),
    queryFn: () => sqlPracticeApi.getPersonalProblems(workspaceId!, filter),
    enabled: Boolean(workspaceId),
  })
}

function invalidatePersonalPractice(
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string,
) {
  queryClient.invalidateQueries({
    queryKey: ['sql-practice', 'personal', workspaceId],
  })
}

export function useCreateSqlPersonalPracticeProblem(workspaceId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SqlUserPracticeProblemPayload) =>
      sqlPracticeApi.createPersonalProblem(workspaceId!, payload),
    onSuccess: () => {
      if (workspaceId) invalidatePersonalPractice(queryClient, workspaceId)
      toast.success('개인 문제를 등록했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '개인 문제 등록에 실패했습니다.')),
  })
}

export function useGenerateSqlPersonalPracticeAnswer(workspaceId: string | undefined) {
  return useMutation({
    mutationFn: (payload: SqlUserPracticeGenerateAnswerPayload) =>
      sqlPracticeApi.generatePersonalProblemAnswer(workspaceId!, payload),
    onSuccess: () => toast.success('정답 SQL을 생성했습니다.'),
    onError: (error) => toast.error(messageFromError(error, '정답 SQL 생성에 실패했습니다.')),
  })
}

export function useGradeSqlPersonalPracticeProblem(workspaceId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SqlUserPracticeGradePayload }) =>
      sqlPracticeApi.gradePersonalProblem(workspaceId!, id, payload),
    onSuccess: () => {
      if (workspaceId) invalidatePersonalPractice(queryClient, workspaceId)
    },
    onError: (error) => toast.error(messageFromError(error, 'SQL 답안 채점에 실패했습니다.')),
  })
}

export function useShareSqlPersonalPracticeProblem(workspaceId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => sqlPracticeApi.sharePersonalProblem(workspaceId!, id),
    onSuccess: () => {
      if (workspaceId) invalidatePersonalPractice(queryClient, workspaceId)
      toast.success('공유 링크를 만들었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '공유 링크 생성에 실패했습니다.')),
  })
}

export function useUnshareSqlPersonalPracticeProblem(workspaceId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => sqlPracticeApi.unsharePersonalProblem(workspaceId!, id),
    onSuccess: () => {
      if (workspaceId) invalidatePersonalPractice(queryClient, workspaceId)
      toast.success('공유 링크를 해제했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '공유 링크 해제에 실패했습니다.')),
  })
}

export function useDeleteSqlPersonalPracticeProblem(workspaceId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => sqlPracticeApi.deletePersonalProblem(workspaceId!, id),
    onSuccess: () => {
      if (workspaceId) invalidatePersonalPractice(queryClient, workspaceId)
      toast.success('개인 문제를 삭제했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '개인 문제 삭제에 실패했습니다.')),
  })
}

export function useReplaceSqlPersonalPracticeSchemaVersion(workspaceId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { file: File; title?: string; description?: string }) =>
      sqlPracticeApi.replacePersonalSchemaVersion(workspaceId!, payload),
    onSuccess: () => {
      if (workspaceId) {
        queryClient.invalidateQueries({
          queryKey: sqlPracticeQueryKeys.personalDefaultWorkspace,
        })
        invalidatePersonalPractice(queryClient, workspaceId)
      }
      toast.success('SQL 파일을 교체했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, 'SQL 파일 교체에 실패했습니다.')),
  })
}

export function usePublicSqlPersonalPracticeProblem(token: string | undefined) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.publicPersonalProblem(token ?? ''),
    queryFn: () => sqlPracticeApi.getPublicPersonalProblem(token!),
    enabled: Boolean(token),
  })
}

export function useGradePublicSqlPersonalPracticeProblem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ token, payload }: { token: string; payload: SqlUserPracticeGradePayload }) =>
      sqlPracticeApi.gradePublicPersonalProblem(token, payload),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: sqlPracticeQueryKeys.publicPersonalProblem(variables.token),
      })
    },
    onError: (error) => toast.error(messageFromError(error, 'SQL 답안 채점에 실패했습니다.')),
  })
}

export function useSqlTeamPracticeWorkspaces() {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.teamWorkspaces,
    queryFn: sqlPracticeApi.getTeamWorkspaces,
  })
}

export function useCreateSqlTeamPracticeWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { title: string; description?: string }) =>
      sqlPracticeApi.createTeamWorkspace(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.teamWorkspaces })
      toast.success('팀 SQL 연습장을 만들었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '팀 SQL 연습장 생성에 실패했습니다.')),
  })
}

export function useSqlTeamPracticeWorkspace(workspaceId: string | undefined) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.teamWorkspace(workspaceId ?? ''),
    queryFn: () => sqlPracticeApi.getTeamWorkspace(workspaceId!),
    enabled: Boolean(workspaceId),
  })
}

export function useSqlTeamPracticeMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.teamMembers(workspaceId ?? ''),
    queryFn: () => sqlPracticeApi.getTeamMembers(workspaceId!),
    enabled: Boolean(workspaceId),
  })
}

export function useAddSqlTeamPracticeMember(workspaceId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { userId: string; role: SqlTeamPracticeMemberRole }) =>
      sqlPracticeApi.addTeamMember(workspaceId!, payload),
    onSuccess: () => {
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.teamMembers(workspaceId) })
        queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.teamWorkspace(workspaceId) })
        queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.teamWorkspaces })
      }
      toast.success('팀 멤버를 추가했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '팀 멤버 추가에 실패했습니다.')),
  })
}

export function useUpdateSqlTeamPracticeMember(workspaceId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      memberId,
      role,
    }: {
      memberId: string
      role: SqlTeamPracticeMemberRole
    }) => sqlPracticeApi.updateTeamMember(workspaceId!, memberId, { role }),
    onSuccess: () => {
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.teamMembers(workspaceId) })
        queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.teamWorkspace(workspaceId) })
      }
      toast.success('팀 멤버 권한을 변경했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '팀 멤버 권한 변경에 실패했습니다.')),
  })
}

export function useRemoveSqlTeamPracticeMember(workspaceId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (memberId: string) => sqlPracticeApi.removeTeamMember(workspaceId!, memberId),
    onSuccess: () => {
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.teamMembers(workspaceId) })
        queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.teamWorkspace(workspaceId) })
        queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.teamWorkspaces })
      }
      toast.success('팀 멤버를 제거했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '팀 멤버 제거에 실패했습니다.')),
  })
}

export function useSqlTeamPracticeMeta(workspaceId: string | undefined) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.teamMeta(workspaceId ?? ''),
    queryFn: () => sqlPracticeApi.getTeamMeta(workspaceId!),
    enabled: Boolean(workspaceId),
  })
}

export function useSqlTeamPracticeTables(workspaceId: string | undefined) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.teamTables(workspaceId ?? ''),
    queryFn: () => sqlPracticeApi.getTeamTables(workspaceId!),
    enabled: Boolean(workspaceId),
  })
}

export function useSqlTeamPracticeErd(workspaceId: string | undefined) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.teamErd(workspaceId ?? ''),
    queryFn: () => sqlPracticeApi.getTeamErd(workspaceId!),
    enabled: Boolean(workspaceId),
    staleTime: Infinity,
  })
}

export function useExecuteSqlTeamPractice(workspaceId: string | undefined) {
  return useMutation({
    mutationFn: (query: string) => sqlPracticeApi.executeTeam(workspaceId!, query),
    onError: (error) => toast.error(messageFromError(error, '팀 SQL 실행에 실패했습니다.')),
  })
}

export function useSqlTeamPracticeProblems(
  workspaceId: string | undefined,
  filter?: { level?: number; mine?: boolean },
) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.teamProblems(workspaceId ?? '', filter),
    queryFn: () => sqlPracticeApi.getTeamProblems(workspaceId!, filter),
    enabled: Boolean(workspaceId),
  })
}

function invalidateTeamPractice(
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string,
) {
  queryClient.invalidateQueries({ queryKey: ['sql-practice', 'team', workspaceId] })
  queryClient.invalidateQueries({ queryKey: sqlPracticeQueryKeys.teamWorkspaces })
}

export function useCreateSqlTeamPracticeProblem(workspaceId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SqlUserPracticeProblemPayload) =>
      sqlPracticeApi.createTeamProblem(workspaceId!, payload),
    onSuccess: () => {
      if (workspaceId) invalidateTeamPractice(queryClient, workspaceId)
      toast.success('팀 문제를 등록했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '팀 문제 등록에 실패했습니다.')),
  })
}

export function useGenerateSqlTeamPracticeAnswer(workspaceId: string | undefined) {
  return useMutation({
    mutationFn: (payload: SqlUserPracticeGenerateAnswerPayload) =>
      sqlPracticeApi.generateTeamProblemAnswer(workspaceId!, payload),
    onSuccess: () => toast.success('정답 SQL을 생성했습니다.'),
    onError: (error) => toast.error(messageFromError(error, '정답 SQL 생성에 실패했습니다.')),
  })
}

export function useGradeSqlTeamPracticeProblem(workspaceId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SqlUserPracticeGradePayload }) =>
      sqlPracticeApi.gradeTeamProblem(workspaceId!, id, payload),
    onSuccess: () => {
      if (workspaceId) invalidateTeamPractice(queryClient, workspaceId)
    },
    onError: (error) => toast.error(messageFromError(error, 'SQL 답안 채점에 실패했습니다.')),
  })
}

export function useUpdateSqlTeamPracticeProblem(workspaceId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Partial<SqlUserPracticeProblemPayload>
    }) => sqlPracticeApi.updateTeamProblem(workspaceId!, id, payload),
    onSuccess: () => {
      if (workspaceId) invalidateTeamPractice(queryClient, workspaceId)
      toast.success('팀 문제를 수정했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '팀 문제 수정에 실패했습니다.')),
  })
}

export function useDeleteSqlTeamPracticeProblem(workspaceId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => sqlPracticeApi.deleteTeamProblem(workspaceId!, id),
    onSuccess: () => {
      if (workspaceId) invalidateTeamPractice(queryClient, workspaceId)
      toast.success('팀 문제를 삭제했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '팀 문제 삭제에 실패했습니다.')),
  })
}

export function useReplaceSqlTeamPracticeSchemaVersion(workspaceId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { file: File; title?: string; description?: string }) =>
      sqlPracticeApi.replaceTeamSchemaVersion(workspaceId!, payload),
    onSuccess: () => {
      if (workspaceId) invalidateTeamPractice(queryClient, workspaceId)
      toast.success('팀 SQL 파일을 교체했습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '팀 SQL 파일 교체에 실패했습니다.')),
  })
}
