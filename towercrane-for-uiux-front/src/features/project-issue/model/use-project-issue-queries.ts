import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectIssueApi } from '../../../entities/project-issue/api/project-issue-api'
import type {
  CreateProjectIssueCategoryRequest,
  CreateProjectIssueRequest,
  ProjectIssue,
  ProjectIssueAttachment,
  ProjectIssueChecklist,
  ProjectIssueFilters,
  UpdateProjectIssueRequest,
} from '../../../entities/project-issue/model/types'

export const projectIssueQueryKeys = {
  all: ['project-issues'] as const,
  categories: (archived = false) =>
    ['project-issues', 'categories', archived] as const,
  list: (filters: ProjectIssueFilters) =>
    ['project-issues', 'list', filters] as const,
  detail: (issueId: string | null) =>
    ['project-issues', 'detail', issueId] as const,
  checklists: (issueId: string | null) =>
    ['project-issues', 'checklists', issueId] as const,
  comments: (issueId: string | null) =>
    ['project-issues', 'comments', issueId] as const,
  activity: (issueId: string | null) =>
    ['project-issues', 'activity', issueId] as const,
  attachments: (issueId: string | null) =>
    ['project-issues', 'attachments', issueId] as const,
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function useProjectIssues(filters: ProjectIssueFilters) {
  return useQuery({
    queryKey: projectIssueQueryKeys.list(filters),
    queryFn: () => projectIssueApi.list(filters),
    enabled: Boolean(filters.projectId),
  })
}

export function useProjectIssueCategories(archived = false) {
  return useQuery({
    queryKey: projectIssueQueryKeys.categories(archived),
    queryFn: () => projectIssueApi.listCategories(archived),
  })
}

export function useCreateProjectIssueCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateProjectIssueCategoryRequest) =>
      projectIssueApi.createCategory(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectIssueQueryKeys.all })
      toast.success('이슈 카테고리가 생성되었습니다.')
    },
    onError: (error) =>
      toast.error(messageFromError(error, '카테고리 생성에 실패했습니다.')),
  })
}

export function useProjectIssueDetail(issueId: string | null, enabled = true) {
  return useQuery({
    queryKey: projectIssueQueryKeys.detail(issueId),
    queryFn: () => projectIssueApi.detail(issueId as string),
    enabled: enabled && Boolean(issueId),
  })
}

export function useCreateProjectIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateProjectIssueRequest) =>
      projectIssueApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectIssueQueryKeys.all })
      toast.success('프로젝트 이슈가 생성되었습니다.')
    },
    onError: (error) =>
      toast.error(messageFromError(error, '이슈 생성에 실패했습니다.')),
  })
}

export function useUpdateProjectIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: UpdateProjectIssueRequest
    }) => projectIssueApi.update(id, body),
    onSuccess: (issue) => {
      queryClient.setQueryData(projectIssueQueryKeys.detail(issue.id), issue)
      queryClient.invalidateQueries({ queryKey: projectIssueQueryKeys.all })
      toast.success('프로젝트 이슈가 수정되었습니다.')
    },
    onError: (error) =>
      toast.error(messageFromError(error, '이슈 수정에 실패했습니다.')),
  })
}

export function useDeleteProjectIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (issueId: string) => projectIssueApi.delete(issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectIssueQueryKeys.all })
      toast.success('프로젝트 이슈가 삭제되었습니다.')
    },
    onError: (error) =>
      toast.error(messageFromError(error, '이슈 삭제에 실패했습니다.')),
  })
}

export function useUpdateProjectIssueStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string
      status: ProjectIssue['status']
    }) => projectIssueApi.updateStatus(id, status),
    onSuccess: (issue) => {
      queryClient.setQueryData(projectIssueQueryKeys.detail(issue.id), issue)
      queryClient.invalidateQueries({ queryKey: projectIssueQueryKeys.all })
    },
    onError: (error) =>
      toast.error(messageFromError(error, '상태 변경에 실패했습니다.')),
  })
}

export function useUpdateProjectIssuePriority() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      priority,
    }: {
      id: string
      priority: ProjectIssue['priority']
    }) => projectIssueApi.updatePriority(id, priority),
    onSuccess: (issue) => {
      queryClient.setQueryData(projectIssueQueryKeys.detail(issue.id), issue)
      queryClient.invalidateQueries({ queryKey: projectIssueQueryKeys.all })
    },
    onError: (error) =>
      toast.error(messageFromError(error, '우선순위 변경에 실패했습니다.')),
  })
}

export function useUpdateProjectIssueAssignee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      assigneeId,
    }: {
      id: string
      assigneeId: string | null
    }) => projectIssueApi.updateAssignee(id, assigneeId),
    onSuccess: (issue) => {
      queryClient.setQueryData(projectIssueQueryKeys.detail(issue.id), issue)
      queryClient.invalidateQueries({ queryKey: projectIssueQueryKeys.all })
    },
    onError: (error) =>
      toast.error(messageFromError(error, '담당자 변경에 실패했습니다.')),
  })
}

export function useReorderProjectIssues() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: Array<{ id: string; orderIdx: number }>) =>
      projectIssueApi.reorder(items),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: projectIssueQueryKeys.all }),
    onError: (error) =>
      toast.error(messageFromError(error, '순서 저장에 실패했습니다.')),
  })
}

export function useArchiveProjectIssues() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => projectIssueApi.archive(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectIssueQueryKeys.all })
      toast.success('프로젝트 이슈가 보관되었습니다.')
    },
    onError: (error) =>
      toast.error(messageFromError(error, '이슈 보관에 실패했습니다.')),
  })
}

export function useRestoreProjectIssues() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => projectIssueApi.restore(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectIssueQueryKeys.all })
      toast.success('프로젝트 이슈가 복원되었습니다.')
    },
    onError: (error) =>
      toast.error(messageFromError(error, '이슈 복원에 실패했습니다.')),
  })
}

export function useProjectIssueChecklists(issueId: string | null) {
  return useQuery({
    queryKey: projectIssueQueryKeys.checklists(issueId),
    queryFn: () => projectIssueApi.listChecklists(issueId as string),
    enabled: Boolean(issueId),
  })
}

export function useCreateProjectIssueChecklist(issueId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => {
      if (!issueId) throw new Error('issueId required')
      return projectIssueApi.createChecklist(issueId, content)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: projectIssueQueryKeys.checklists(issueId),
      }),
    onError: (error) =>
      toast.error(messageFromError(error, '체크리스트 추가에 실패했습니다.')),
  })
}

export function useUpdateProjectIssueChecklist(issueId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      checklistId,
      body,
    }: {
      checklistId: string
      body: Partial<
        Pick<ProjectIssueChecklist, 'content' | 'completed' | 'orderIdx'>
      >
    }) => {
      if (!issueId) throw new Error('issueId required')
      return projectIssueApi.updateChecklist(issueId, checklistId, body)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: projectIssueQueryKeys.checklists(issueId),
      }),
    onError: (error) =>
      toast.error(messageFromError(error, '체크리스트 수정에 실패했습니다.')),
  })
}

export function useToggleProjectIssueChecklist(issueId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (checklistId: string) => {
      if (!issueId) throw new Error('issueId required')
      return projectIssueApi.toggleChecklist(issueId, checklistId)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: projectIssueQueryKeys.checklists(issueId),
      }),
    onError: (error) =>
      toast.error(messageFromError(error, '체크 상태 변경에 실패했습니다.')),
  })
}

export function useDeleteProjectIssueChecklist(issueId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (checklistId: string) => {
      if (!issueId) throw new Error('issueId required')
      return projectIssueApi.deleteChecklist(issueId, checklistId)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: projectIssueQueryKeys.checklists(issueId),
      }),
    onError: (error) =>
      toast.error(messageFromError(error, '체크리스트 삭제에 실패했습니다.')),
  })
}

export function useProjectIssueComments(issueId: string | null) {
  return useQuery({
    queryKey: projectIssueQueryKeys.comments(issueId),
    queryFn: () => projectIssueApi.listComments(issueId as string),
    enabled: Boolean(issueId),
  })
}

export function useCreateProjectIssueComment(issueId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => {
      if (!issueId) throw new Error('issueId required')
      return projectIssueApi.createComment(issueId, content)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: projectIssueQueryKeys.comments(issueId),
      }),
    onError: (error) =>
      toast.error(messageFromError(error, '댓글 등록에 실패했습니다.')),
  })
}

export function useUpdateProjectIssueComment(issueId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      commentId,
      content,
    }: {
      commentId: string
      content: string
    }) => {
      if (!issueId) throw new Error('issueId required')
      return projectIssueApi.updateComment(issueId, commentId, content)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: projectIssueQueryKeys.comments(issueId),
      }),
    onError: (error) =>
      toast.error(messageFromError(error, '댓글 수정에 실패했습니다.')),
  })
}

export function useDeleteProjectIssueComment(issueId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => {
      if (!issueId) throw new Error('issueId required')
      return projectIssueApi.deleteComment(issueId, commentId)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: projectIssueQueryKeys.comments(issueId),
      }),
    onError: (error) =>
      toast.error(messageFromError(error, '댓글 삭제에 실패했습니다.')),
  })
}

export function useProjectIssueActivity(issueId: string | null) {
  return useQuery({
    queryKey: projectIssueQueryKeys.activity(issueId),
    queryFn: () => projectIssueApi.listActivity(issueId as string),
    enabled: Boolean(issueId),
  })
}

export function useProjectIssueAttachments(issueId: string | null) {
  return useQuery({
    queryKey: projectIssueQueryKeys.attachments(issueId),
    queryFn: () => projectIssueApi.listAttachments(issueId as string),
    enabled: Boolean(issueId),
  })
}

export function useCreateProjectIssueAttachment(issueId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      body: Pick<
        ProjectIssueAttachment,
        'fileName' | 'fileUrl' | 'contentType' | 'fileSize'
      >,
    ) => {
      if (!issueId) throw new Error('issueId required')
      return projectIssueApi.createAttachment(issueId, body)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: projectIssueQueryKeys.attachments(issueId),
      }),
    onError: (error) =>
      toast.error(messageFromError(error, '첨부 추가에 실패했습니다.')),
  })
}

export function useDeleteProjectIssueAttachment(issueId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: string) => {
      if (!issueId) throw new Error('issueId required')
      return projectIssueApi.deleteAttachment(issueId, attachmentId)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: projectIssueQueryKeys.attachments(issueId),
      }),
    onError: (error) =>
      toast.error(messageFromError(error, '첨부 삭제에 실패했습니다.')),
  })
}
