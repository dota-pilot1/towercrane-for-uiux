import { apiRequest } from '../../../shared/api/http'
import type {
  CreateSqlPracticeNotePayload,
  PublicSqlPracticeNote,
  SharedSqlPracticeNote,
  SqlActivateSeedResponse,
  SqlExecuteResponse,
  SqlPersonalPracticeProblem,
  SqlPersonalPracticeProblemListResponse,
  SqlPersonalPracticePublicProblemResponse,
  SqlPersonalPracticeSchemaReplaceResponse,
  SqlPersonalPracticeShare,
  SqlPersonalPracticeWorkspace,
  SqlPracticeGradePayload,
  SqlPracticeGradeResponse,
  SqlPracticeActivityResponse,
  SqlPracticeDeleteActivityResponse,
  SqlPracticeMySubmissionsResponse,
  SqlPracticeNote,
  SqlPracticeNoteFilter,
  SqlPracticeMeta,
  SqlPracticeRankingResponse,
  SqlPracticeSeedListResponse,
  SqlPracticeSeedSource,
  SqlResetResponse,
  SqlTeamPracticeMember,
  SqlTeamPracticeMemberRole,
  SqlTeamPracticeProblem,
  SqlTeamPracticeProblemListResponse,
  SqlTeamPracticeSchemaReplaceResponse,
  SqlTeamPracticeWorkspace,
  SqlUserPracticeGenerateAnswerPayload,
  SqlUserPracticeGenerateAnswerResponse,
  SqlUserPracticeGradePayload,
  SqlUserPracticeGradeResponse,
  SqlUserPracticeProblem,
  SqlUserPracticeProblemListResponse,
  SqlUserPracticeProblemPayload,
  TableInfo,
  UpdateSqlPracticeNotePayload,
} from '../model/types'

function toSearchParams(filter?: SqlPracticeNoteFilter) {
  const params = new URLSearchParams()

  if (filter?.seedFile) params.set('seedFile', filter.seedFile)
  if (filter?.exampleId) params.set('exampleId', filter.exampleId)
  if (filter?.tableName) params.set('tableName', filter.tableName)

  const query = params.toString()
  return query ? `?${query}` : ''
}

export const sqlPracticeApi = {
  getMeta: () => apiRequest<SqlPracticeMeta>('/sql/meta'),
  getSeeds: () => apiRequest<SqlPracticeSeedListResponse>('/sql/seeds'),
  getTables: () => apiRequest<TableInfo[]>('/sql/tables'),
  getTable: (tableName: string) =>
    apiRequest<TableInfo>(`/sql/tables/${encodeURIComponent(tableName)}`),
  activateSeed: (payload: { source: SqlPracticeSeedSource; fileName: string }) =>
    apiRequest<SqlActivateSeedResponse>('/sql/seeds/activate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  execute: (query: string) =>
    apiRequest<SqlExecuteResponse>('/sql/execute', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
  reset: () =>
    apiRequest<SqlResetResponse>('/sql/reset', {
      method: 'POST',
    }),
  reloadSeed: () =>
    apiRequest<SqlResetResponse>('/sql/reload-seed', {
      method: 'POST',
    }),
  getSeedErd: (fileName: string) =>
    apiRequest<{ mmd: string | null }>(`/sql/seeds/${encodeURIComponent(fileName)}/erd`),
  geminiAsk: (content: string, mode: 'sql' | 'general' | 'grading') =>
    apiRequest<{ answer: string }>('/sql/gemini', {
      method: 'POST',
      body: JSON.stringify({ content, mode }),
    }),
  gradeSubmission: (payload: SqlPracticeGradePayload) =>
    apiRequest<SqlPracticeGradeResponse>('/sql/submissions/grade', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMySubmissions: (seedFile: string) =>
    apiRequest<SqlPracticeMySubmissionsResponse>(
      `/sql/submissions/mine?seedFile=${encodeURIComponent(seedFile)}`,
    ),
  getRanking: (seedFile: string) =>
    apiRequest<SqlPracticeRankingResponse>(
      `/sql/submissions/ranking?seedFile=${encodeURIComponent(seedFile)}`,
    ),
  getActivity: (seedFile: string, limit = 30) =>
    apiRequest<SqlPracticeActivityResponse>(
      `/sql/submissions/activity?seedFile=${encodeURIComponent(seedFile)}&limit=${limit}`,
    ),
  getMyActivity: (seedFile: string, limit = 30) =>
    apiRequest<SqlPracticeActivityResponse>(
      `/sql/submissions/activity/mine?seedFile=${encodeURIComponent(seedFile)}&limit=${limit}`,
    ),
  deleteMyActivityItem: (id: string) =>
    apiRequest<SqlPracticeDeleteActivityResponse>(
      `/sql/submissions/activity/mine/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      },
    ),
  clearMyActivity: (seedFile: string) =>
    apiRequest<SqlPracticeDeleteActivityResponse>(
      `/sql/submissions/activity/mine?seedFile=${encodeURIComponent(seedFile)}`,
      { method: 'DELETE' },
    ),
  getNotes: (filter?: SqlPracticeNoteFilter) =>
    apiRequest<SqlPracticeNote[]>(`/sql/notes/mine${toSearchParams(filter)}`),
  getNote: (id: string) =>
    apiRequest<SqlPracticeNote | null>(`/sql/notes/${encodeURIComponent(id)}`),
  getPublicNote: (token: string) =>
    apiRequest<PublicSqlPracticeNote | null>(`/public/sql/notes/${encodeURIComponent(token)}`, {
      skipAuth: true,
    }),
  getNoteByIdPublic: (id: string) =>
    apiRequest<SharedSqlPracticeNote | null>(`/public/sql/notes/by-id/${encodeURIComponent(id)}`, {
      skipAuth: true,
    }),
  shareNote: (id: string) =>
    apiRequest<SqlPracticeNote>(`/sql/notes/${encodeURIComponent(id)}/share`, {
      method: 'POST',
    }),
  createNote: (payload: CreateSqlPracticeNotePayload) =>
    apiRequest<SqlPracticeNote>('/sql/notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateNote: (id: string, payload: UpdateSqlPracticeNotePayload) =>
    apiRequest<SqlPracticeNote>(`/sql/notes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteNote: (id: string) =>
    apiRequest<void>(`/sql/notes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  getUserMeta: () => apiRequest<SqlPracticeMeta>('/sql/user/meta'),
  getUserTables: () => apiRequest<TableInfo[]>('/sql/user/tables'),
  executeUser: (query: string) =>
    apiRequest<SqlExecuteResponse>('/sql/user/execute', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
  resetUser: () =>
    apiRequest<SqlResetResponse>('/sql/user/reset', {
      method: 'POST',
    }),
  getUserErd: () => apiRequest<{ mmd: string | null }>('/sql/user/erd'),
  getUserSubmissions: () =>
    apiRequest<SqlPracticeMySubmissionsResponse>('/sql/user/submissions/mine'),
  getUserProblems: (filter?: { level?: number; mine?: boolean }) => {
    const params = new URLSearchParams()
    if (filter?.level) params.set('level', String(filter.level))
    if (filter?.mine) params.set('mine', 'true')
    const query = params.toString()
    return apiRequest<SqlUserPracticeProblemListResponse>(
      `/sql/user/problems${query ? `?${query}` : ''}`,
    )
  },
  getUserProblem: (id: string) =>
    apiRequest<SqlUserPracticeProblem | null>(`/sql/user/problems/${encodeURIComponent(id)}`),
  createUserProblem: (payload: SqlUserPracticeProblemPayload) =>
    apiRequest<SqlUserPracticeProblem>('/sql/user/problems', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  generateUserProblemAnswer: (payload: SqlUserPracticeGenerateAnswerPayload) =>
    apiRequest<SqlUserPracticeGenerateAnswerResponse>('/sql/user/problems/generate-answer', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  gradeUserProblem: (id: string, payload: SqlUserPracticeGradePayload) =>
    apiRequest<SqlUserPracticeGradeResponse>(`/sql/user/problems/${encodeURIComponent(id)}/grade`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateUserProblem: (id: string, payload: Partial<SqlUserPracticeProblemPayload>) =>
    apiRequest<SqlUserPracticeProblem>(`/sql/user/problems/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteUserProblem: (id: string) =>
    apiRequest<void>(`/sql/user/problems/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  getPersonalWorkspaces: () =>
    apiRequest<SqlPersonalPracticeWorkspace[]>('/sql/personal/workspaces'),
  getDefaultPersonalWorkspace: () =>
    apiRequest<SqlPersonalPracticeWorkspace>('/sql/personal/workspaces/default'),
  getPersonalMeta: (workspaceId: string) =>
    apiRequest<SqlPracticeMeta>(`/sql/personal/workspaces/${encodeURIComponent(workspaceId)}/meta`),
  getPersonalTables: (workspaceId: string) =>
    apiRequest<TableInfo[]>(`/sql/personal/workspaces/${encodeURIComponent(workspaceId)}/tables`),
  getPersonalTableRows: (workspaceId: string, tableName: string) =>
    apiRequest<SqlExecuteResponse>(
      `/sql/personal/workspaces/${encodeURIComponent(workspaceId)}/tables/${encodeURIComponent(tableName)}/rows`,
    ),
  replacePersonalSchemaVersion: (
    workspaceId: string,
    payload: { file: File; title?: string; description?: string },
  ) => {
    const formData = new FormData()
    formData.append('file', payload.file)
    if (payload.title?.trim()) formData.append('title', payload.title.trim())
    if (payload.description?.trim()) {
      formData.append('description', payload.description.trim())
    }

    return apiRequest<SqlPersonalPracticeSchemaReplaceResponse>(
      `/sql/personal/workspaces/${encodeURIComponent(workspaceId)}/schema-versions/replace`,
      {
        method: 'POST',
        body: formData,
      },
    )
  },
  getPersonalErd: (workspaceId: string) =>
    apiRequest<{ mmd: string | null }>(
      `/sql/personal/workspaces/${encodeURIComponent(workspaceId)}/erd`,
    ),
  getPersonalProblems: (workspaceId: string, filter?: { level?: number }) => {
    const params = new URLSearchParams()
    if (filter?.level) params.set('level', String(filter.level))
    const query = params.toString()
    return apiRequest<SqlPersonalPracticeProblemListResponse>(
      `/sql/personal/workspaces/${encodeURIComponent(workspaceId)}/problems${query ? `?${query}` : ''}`,
    )
  },
  createPersonalProblem: (workspaceId: string, payload: SqlUserPracticeProblemPayload) =>
    apiRequest<SqlPersonalPracticeProblem>(
      `/sql/personal/workspaces/${encodeURIComponent(workspaceId)}/problems`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),
  generatePersonalProblemAnswer: (
    workspaceId: string,
    payload: SqlUserPracticeGenerateAnswerPayload,
  ) =>
    apiRequest<SqlUserPracticeGenerateAnswerResponse>(
      `/sql/personal/workspaces/${encodeURIComponent(workspaceId)}/problems/generate-answer`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),
  gradePersonalProblem: (workspaceId: string, id: string, payload: SqlUserPracticeGradePayload) =>
    apiRequest<SqlUserPracticeGradeResponse>(
      `/sql/personal/workspaces/${encodeURIComponent(workspaceId)}/problems/${encodeURIComponent(id)}/grade`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),
  updatePersonalProblem: (
    workspaceId: string,
    id: string,
    payload: Partial<SqlUserPracticeProblemPayload>,
  ) =>
    apiRequest<SqlPersonalPracticeProblem>(
      `/sql/personal/workspaces/${encodeURIComponent(workspaceId)}/problems/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    ),
  deletePersonalProblem: (workspaceId: string, id: string) =>
    apiRequest<void>(
      `/sql/personal/workspaces/${encodeURIComponent(workspaceId)}/problems/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      },
    ),
  sharePersonalProblem: (workspaceId: string, id: string) =>
    apiRequest<SqlPersonalPracticeShare>(
      `/sql/personal/workspaces/${encodeURIComponent(workspaceId)}/problems/${encodeURIComponent(id)}/share`,
      { method: 'POST' },
    ),
  unsharePersonalProblem: (workspaceId: string, id: string) =>
    apiRequest<void>(
      `/sql/personal/workspaces/${encodeURIComponent(workspaceId)}/problems/${encodeURIComponent(id)}/unshare`,
      { method: 'POST' },
    ),
  getPublicPersonalProblem: (token: string) =>
    apiRequest<SqlPersonalPracticePublicProblemResponse | null>(
      `/public/sql/personal/${encodeURIComponent(token)}`,
    ),
  getPublicPersonalTableRows: (token: string, tableName: string) =>
    apiRequest<SqlExecuteResponse>(
      `/public/sql/personal/${encodeURIComponent(token)}/tables/${encodeURIComponent(tableName)}/rows`,
      { skipAuth: true },
    ),
  gradePublicPersonalProblem: (token: string, payload: SqlUserPracticeGradePayload) =>
    apiRequest<SqlUserPracticeGradeResponse>(
      `/public/sql/personal/${encodeURIComponent(token)}/grade`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),
  getTeamWorkspaces: () => apiRequest<SqlTeamPracticeWorkspace[]>('/sql/team/workspaces'),
  createTeamWorkspace: (payload: { title: string; description?: string }) =>
    apiRequest<SqlTeamPracticeWorkspace>('/sql/team/workspaces', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getTeamWorkspace: (workspaceId: string) =>
    apiRequest<SqlTeamPracticeWorkspace>(
      `/sql/team/workspaces/${encodeURIComponent(workspaceId)}`,
    ),
  updateTeamWorkspace: (
    workspaceId: string,
    payload: Partial<{ title: string; description: string }>,
  ) =>
    apiRequest<SqlTeamPracticeWorkspace>(
      `/sql/team/workspaces/${encodeURIComponent(workspaceId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    ),
  archiveTeamWorkspace: (workspaceId: string) =>
    apiRequest<void>(`/sql/team/workspaces/${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
    }),
  getTeamMembers: (workspaceId: string) =>
    apiRequest<SqlTeamPracticeMember[]>(
      `/sql/team/workspaces/${encodeURIComponent(workspaceId)}/members`,
    ),
  addTeamMember: (
    workspaceId: string,
    payload: { userId: string; role: SqlTeamPracticeMemberRole },
  ) =>
    apiRequest<SqlTeamPracticeMember[]>(
      `/sql/team/workspaces/${encodeURIComponent(workspaceId)}/members`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),
  updateTeamMember: (
    workspaceId: string,
    memberId: string,
    payload: { role: SqlTeamPracticeMemberRole },
  ) =>
    apiRequest<SqlTeamPracticeMember[]>(
      `/sql/team/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(memberId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    ),
  removeTeamMember: (workspaceId: string, memberId: string) =>
    apiRequest<void>(
      `/sql/team/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(memberId)}`,
      { method: 'DELETE' },
    ),
  getTeamMeta: (workspaceId: string) =>
    apiRequest<SqlPracticeMeta>(`/sql/team/workspaces/${encodeURIComponent(workspaceId)}/meta`),
  getTeamTables: (workspaceId: string) =>
    apiRequest<TableInfo[]>(`/sql/team/workspaces/${encodeURIComponent(workspaceId)}/tables`),
  getTeamTableRows: (workspaceId: string, tableName: string) =>
    apiRequest<SqlExecuteResponse>(
      `/sql/team/workspaces/${encodeURIComponent(workspaceId)}/tables/${encodeURIComponent(tableName)}/rows`,
    ),
  executeTeam: (workspaceId: string, query: string) =>
    apiRequest<SqlExecuteResponse>(`/sql/team/workspaces/${encodeURIComponent(workspaceId)}/execute`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
  replaceTeamSchemaVersion: (
    workspaceId: string,
    payload: { file: File; title?: string; description?: string },
  ) => {
    const formData = new FormData()
    formData.append('file', payload.file)
    if (payload.title?.trim()) formData.append('title', payload.title.trim())
    if (payload.description?.trim()) formData.append('description', payload.description.trim())

    return apiRequest<SqlTeamPracticeSchemaReplaceResponse>(
      `/sql/team/workspaces/${encodeURIComponent(workspaceId)}/schema-versions/replace`,
      {
        method: 'POST',
        body: formData,
      },
    )
  },
  getTeamErd: (workspaceId: string) =>
    apiRequest<{ mmd: string | null }>(
      `/sql/team/workspaces/${encodeURIComponent(workspaceId)}/erd`,
    ),
  getTeamProblems: (workspaceId: string, filter?: { level?: number; mine?: boolean }) => {
    const params = new URLSearchParams()
    if (filter?.level) params.set('level', String(filter.level))
    if (filter?.mine) params.set('mine', 'true')
    const query = params.toString()
    return apiRequest<SqlTeamPracticeProblemListResponse>(
      `/sql/team/workspaces/${encodeURIComponent(workspaceId)}/problems${query ? `?${query}` : ''}`,
    )
  },
  createTeamProblem: (workspaceId: string, payload: SqlUserPracticeProblemPayload) =>
    apiRequest<SqlTeamPracticeProblem>(
      `/sql/team/workspaces/${encodeURIComponent(workspaceId)}/problems`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),
  generateTeamProblemAnswer: (
    workspaceId: string,
    payload: SqlUserPracticeGenerateAnswerPayload,
  ) =>
    apiRequest<SqlUserPracticeGenerateAnswerResponse>(
      `/sql/team/workspaces/${encodeURIComponent(workspaceId)}/problems/generate-answer`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),
  gradeTeamProblem: (workspaceId: string, id: string, payload: SqlUserPracticeGradePayload) =>
    apiRequest<SqlUserPracticeGradeResponse>(
      `/sql/team/workspaces/${encodeURIComponent(workspaceId)}/problems/${encodeURIComponent(id)}/grade`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),
  updateTeamProblem: (
    workspaceId: string,
    id: string,
    payload: Partial<SqlUserPracticeProblemPayload>,
  ) =>
    apiRequest<SqlTeamPracticeProblem>(
      `/sql/team/workspaces/${encodeURIComponent(workspaceId)}/problems/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    ),
  deleteTeamProblem: (workspaceId: string, id: string) =>
    apiRequest<void>(
      `/sql/team/workspaces/${encodeURIComponent(workspaceId)}/problems/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      },
    ),
}
