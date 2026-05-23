import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { taskApi } from '../../../entities/task/api/task-api'
import type {
  CreateTaskRequest,
  Task,
  TaskAttachment,
  TaskChecklist,
  TaskFilters,
  UpdateTaskRequest,
} from '../../../entities/task/model/types'

export const taskQueryKeys = {
  all: ['tasks'] as const,
  list: (filters: TaskFilters) => ['tasks', 'list', filters] as const,
  detail: (taskId: string | null) => ['tasks', 'detail', taskId] as const,
  checklists: (taskId: string | null) => ['tasks', 'checklists', taskId] as const,
  comments: (taskId: string | null) => ['tasks', 'comments', taskId] as const,
  activity: (taskId: string | null) => ['tasks', 'activity', taskId] as const,
  attachments: (taskId: string | null) => ['tasks', 'attachments', taskId] as const,
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: taskQueryKeys.list(filters),
    queryFn: () => taskApi.list(filters),
  })
}

export function useTaskDetail(taskId: string | null, enabled = true) {
  return useQuery({
    queryKey: taskQueryKeys.detail(taskId),
    queryFn: () => taskApi.detail(taskId as string),
    enabled: enabled && Boolean(taskId),
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateTaskRequest) => taskApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all })
      toast.success('업무가 생성되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '업무 생성에 실패했습니다.')),
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTaskRequest }) =>
      taskApi.update(id, body),
    onSuccess: (task) => {
      queryClient.setQueryData(taskQueryKeys.detail(task.id), task)
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all })
      toast.success('업무가 수정되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '업무 수정에 실패했습니다.')),
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => taskApi.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all })
      toast.success('업무가 삭제되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '업무 삭제에 실패했습니다.')),
  })
}

export function useDeleteTasks() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskIds: string[]) => Promise.all(taskIds.map((taskId) => taskApi.delete(taskId))),
    onSuccess: (_result, taskIds) => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all })
      toast.success(`${taskIds.length}개 업무가 삭제되었습니다.`)
    },
    onError: (error) => toast.error(messageFromError(error, '업무 삭제에 실패했습니다.')),
  })
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Task['status'] }) =>
      taskApi.updateStatus(id, status),
    onSuccess: (task) => {
      queryClient.setQueryData(taskQueryKeys.detail(task.id), task)
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all })
      toast.success('상태가 변경되었습니다.', { id: `task-status-${task.id}` })
    },
    onError: (error) => toast.error(messageFromError(error, '상태 변경에 실패했습니다.')),
  })
}

export function useUpdateTaskPriority() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: Task['priority'] }) =>
      taskApi.updatePriority(id, priority),
    onSuccess: (task) => {
      queryClient.setQueryData(taskQueryKeys.detail(task.id), task)
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all })
      toast.success('우선순위가 변경되었습니다.', { id: `task-priority-${task.id}` })
    },
    onError: (error) => toast.error(messageFromError(error, '우선순위 변경에 실패했습니다.')),
  })
}

export function useUpdateTaskAssignee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string | null }) =>
      taskApi.updateAssignee(id, assigneeId),
    onSuccess: (task) => {
      queryClient.setQueryData(taskQueryKeys.detail(task.id), task)
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all })
      toast.success('담당자가 변경되었습니다.', { id: `task-assignee-${task.id}` })
    },
    onError: (error) => toast.error(messageFromError(error, '담당자 변경에 실패했습니다.')),
  })
}

export function useReorderTasks() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: Array<{ id: string; orderIdx: number }>) =>
      taskApi.reorder(items),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskQueryKeys.all }),
    onError: (error) => toast.error(messageFromError(error, '순서 저장에 실패했습니다.')),
  })
}

export function useArchiveTasks() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => taskApi.archive(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all })
      toast.success('업무가 보관되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '업무 보관에 실패했습니다.')),
  })
}

export function useRestoreTasks() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => taskApi.restore(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all })
      toast.success('업무가 복원되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '업무 복원에 실패했습니다.')),
  })
}

export function useTaskChecklists(taskId: string | null) {
  return useQuery({
    queryKey: taskQueryKeys.checklists(taskId),
    queryFn: () => taskApi.listChecklists(taskId as string),
    enabled: Boolean(taskId),
  })
}

export function useCreateTaskChecklist(taskId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => {
      if (!taskId) throw new Error('taskId required')
      return taskApi.createChecklist(taskId, content)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.checklists(taskId) })
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all })
    },
    onError: (error) => toast.error(messageFromError(error, '체크리스트 추가에 실패했습니다.')),
  })
}

export function useUpdateTaskChecklist(taskId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      checklistId,
      body,
    }: {
      checklistId: string
      body: Partial<Pick<TaskChecklist, 'content' | 'completed' | 'orderIdx'>>
    }) => {
      if (!taskId) throw new Error('taskId required')
      return taskApi.updateChecklist(taskId, checklistId, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.checklists(taskId) })
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all })
    },
    onError: (error) => toast.error(messageFromError(error, '체크리스트 수정에 실패했습니다.')),
  })
}

export function useToggleTaskChecklist(taskId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (checklistId: string) => {
      if (!taskId) throw new Error('taskId required')
      return taskApi.toggleChecklist(taskId, checklistId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.checklists(taskId) })
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all })
    },
    onError: (error) => toast.error(messageFromError(error, '체크 상태 변경에 실패했습니다.')),
  })
}

export function useDeleteTaskChecklist(taskId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (checklistId: string) => {
      if (!taskId) throw new Error('taskId required')
      return taskApi.deleteChecklist(taskId, checklistId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.checklists(taskId) })
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all })
    },
    onError: (error) => toast.error(messageFromError(error, '체크리스트 삭제에 실패했습니다.')),
  })
}

export function useTaskComments(taskId: string | null) {
  return useQuery({
    queryKey: taskQueryKeys.comments(taskId),
    queryFn: () => taskApi.listComments(taskId as string),
    enabled: Boolean(taskId),
  })
}

export function useCreateTaskComment(taskId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => {
      if (!taskId) throw new Error('taskId required')
      return taskApi.createComment(taskId, content)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskQueryKeys.comments(taskId) }),
    onError: (error) => toast.error(messageFromError(error, '댓글 등록에 실패했습니다.')),
  })
}

export function useUpdateTaskComment(taskId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) => {
      if (!taskId) throw new Error('taskId required')
      return taskApi.updateComment(taskId, commentId, content)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskQueryKeys.comments(taskId) }),
    onError: (error) => toast.error(messageFromError(error, '댓글 수정에 실패했습니다.')),
  })
}

export function useDeleteTaskComment(taskId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => {
      if (!taskId) throw new Error('taskId required')
      return taskApi.deleteComment(taskId, commentId)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskQueryKeys.comments(taskId) }),
    onError: (error) => toast.error(messageFromError(error, '댓글 삭제에 실패했습니다.')),
  })
}

export function useTaskActivity(taskId: string | null) {
  return useQuery({
    queryKey: taskQueryKeys.activity(taskId),
    queryFn: () => taskApi.listActivity(taskId as string),
    enabled: Boolean(taskId),
    refetchInterval: 15_000,
  })
}

export function useTaskAttachments(taskId: string | null) {
  return useQuery({
    queryKey: taskQueryKeys.attachments(taskId),
    queryFn: () => taskApi.listAttachments(taskId as string),
    enabled: Boolean(taskId),
  })
}

export function useCreateTaskAttachment(taskId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      body: Pick<TaskAttachment, 'fileName' | 'fileUrl' | 'contentType' | 'fileSize'>,
    ) => {
      if (!taskId) throw new Error('taskId required')
      return taskApi.createAttachment(taskId, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.attachments(taskId) })
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all })
    },
    onError: (error) => toast.error(messageFromError(error, '첨부 저장에 실패했습니다.')),
  })
}

export function useDeleteTaskAttachment(taskId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: string) => {
      if (!taskId) throw new Error('taskId required')
      return taskApi.deleteAttachment(taskId, attachmentId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.attachments(taskId) })
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all })
    },
    onError: (error) => toast.error(messageFromError(error, '첨부 삭제에 실패했습니다.')),
  })
}
