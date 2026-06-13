import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { Archive, ArchiveRestore, Save, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_ORDER,
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
  TASK_TYPE_LABELS,
  TASK_TYPE_ORDER,
} from '../../../entities/task/model/constants'
import type {
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
} from '../../../entities/task/model/types'
import type { AssignableUser } from '../../../shared/api/users'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Select } from '../../../shared/ui/select'
import { Textarea } from '../../../shared/ui/textarea'
import { AssigneeSelect } from './assignee-select'
import {
  useArchiveTasks,
  useRestoreTasks,
  useTaskDetail,
  useUpdateTask,
} from '../model/use-task-queries'
import { TaskChecklistPanel } from './task-checklist-panel'
import { TaskCommentsPanel } from './task-comments-panel'
import { TaskActivityPanel } from './task-activity-panel'
import { TaskPriorityBadge, TaskStatusBadge, TaskTypeBadge } from './task-badges'
import { TaskAttachmentsPanel } from './task-attachments-panel'
import { TaskReferencesPanel } from './task-references-panel'

type FormState = {
  title: string
  content: string
  taskType: TaskType
  status: TaskStatus
  priority: TaskPriority
  assigneeId: string
  dueDate: string
}

function toDateInputValue(value?: string | null) {
  if (!value) return ''
  return value.slice(0, 10)
}

function toFormState(task: Task): FormState {
  return {
    title: task.title,
    content: task.content,
    taskType: task.taskType,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId ?? '',
    dueDate: toDateInputValue(task.dueDate),
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function TaskDetailDialog({
  taskId,
  open,
  users,
  onOpenChange,
}: {
  taskId: string | null
  open: boolean
  users: AssignableUser[]
  onOpenChange: (open: boolean) => void
}) {
  const taskQuery = useTaskDetail(taskId, open)
  const updateTask = useUpdateTask()
  const archiveTasks = useArchiveTasks()
  const restoreTasks = useRestoreTasks()
  const task = taskQuery.data
  const [draft, setDraft] = useState<{
    taskId: string
    values: FormState
  } | null>(null)
  const form = task
    ? draft?.taskId === task.id
      ? draft.values
      : toFormState(task)
    : null

  const updateDraft = (changes: Partial<FormState>) => {
    if (!task || !form) return
    setDraft({
      taskId: task.id,
      values: {
        ...form,
        ...changes,
      },
    })
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setDraft(null)
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!task || !form || !form.title.trim()) return

    await updateTask.mutateAsync({
      id: task.id,
      body: {
        title: form.title.trim(),
        content: form.content,
        taskType: form.taskType,
        status: form.status,
        priority: form.priority,
        assigneeId: form.assigneeId || null,
        dueDate: form.dueDate || null,
      },
    })
    setDraft(null)
  }

  const handleArchive = async () => {
    if (!task) return
    if (task.archived) {
      await restoreTasks.mutateAsync([task.id])
    } else {
      await archiveTasks.mutateAsync([task.id])
    }
    setDraft(null)
    handleOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[min(960px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-surface-border-soft shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft bg-surface-muted px-5 py-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {task ? (
                  <>
                    <TaskStatusBadge status={task.status} />
                    <TaskPriorityBadge priority={task.priority} />
                    <TaskTypeBadge taskType={task.taskType} />
                  </>
                ) : null}
              </div>
              <Dialog.Title className="truncate text-lg font-black text-text-primary">
                {task?.title ?? '업무 상세'}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-text-secondary">
                작성자 {task?.reporterName ?? '-'} · 생성 {formatDateTime(task?.createdAt)}
              </Dialog.Description>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {task ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleArchive}
                  disabled={archiveTasks.isPending || restoreTasks.isPending}
                >
                  {task.archived ? (
                    <ArchiveRestore className="mr-2 size-4" />
                  ) : (
                    <Archive className="mr-2 size-4" />
                  )}
                  {task.archived ? '복원' : '보관'}
                </Button>
              ) : null}
              <Dialog.Close asChild>
                <button type="button" className="ui-icon-button size-8" aria-label="닫기">
                  <X className="size-4" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {taskQuery.isLoading || !form ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-text-muted">
              업무 상세를 불러오는 중입니다.
            </div>
          ) : !task ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-text-muted">
              업무를 찾을 수 없습니다.
            </div>
          ) : (
            <Tabs.Root defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
              <Tabs.List className="flex shrink-0 gap-1 border-b border-surface-border-soft bg-surface-raised px-4 pt-3">
                {[
                  ['overview', '개요'],
                  ['checklist', '체크리스트'],
                  ['references', '참고'],
                  ['attachments', '첨부'],
                  ['comments', '댓글'],
                  ['activity', '활동'],
                ].map(([value, label]) => (
                  <Tabs.Trigger
                    key={value}
                    value={value}
                    className="rounded-t-md border border-transparent px-4 py-2 text-sm font-bold text-text-secondary transition-colors data-[state=active]:border-surface-border-soft data-[state=active]:bg-background data-[state=active]:text-text-primary"
                  >
                    {label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <Tabs.Content value="overview">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold text-text-secondary">제목</span>
                      <Input
                        value={form.title}
                        onChange={(event) =>
                          updateDraft({ title: event.target.value })
                        }
                      />
                    </label>

                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold text-text-secondary">내용</span>
                      <Textarea
                        value={form.content}
                        onChange={(event) =>
                          updateDraft({ content: event.target.value })
                        }
                        className="min-h-36 resize-y"
                      />
                    </label>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block space-y-1.5">
                        <span className="text-xs font-bold text-text-secondary">유형</span>
                        <Select
                          value={form.taskType}
                          onChange={(event) =>
                            updateDraft({ taskType: event.target.value as TaskType })
                          }
                        >
                          {TASK_TYPE_ORDER.map((type) => (
                            <option key={type} value={type}>
                              {TASK_TYPE_LABELS[type]}
                            </option>
                          ))}
                        </Select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs font-bold text-text-secondary">상태</span>
                        <Select
                          value={form.status}
                          onChange={(event) =>
                            updateDraft({ status: event.target.value as TaskStatus })
                          }
                        >
                          {TASK_STATUS_ORDER.map((status) => (
                            <option key={status} value={status}>
                              {TASK_STATUS_LABELS[status]}
                            </option>
                          ))}
                        </Select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs font-bold text-text-secondary">우선순위</span>
                        <Select
                          value={form.priority}
                          onChange={(event) =>
                            updateDraft({
                              priority: event.target.value as TaskPriority,
                            })
                          }
                        >
                          {TASK_PRIORITY_ORDER.map((priority) => (
                            <option key={priority} value={priority}>
                              {TASK_PRIORITY_LABELS[priority]}
                            </option>
                          ))}
                        </Select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs font-bold text-text-secondary">담당자</span>
                        <AssigneeSelect
                          value={form.assigneeId}
                          users={users}
                          onChange={(assigneeId) =>
                            updateDraft({ assigneeId })
                          }
                        />
                      </label>

                      <label className="block space-y-1.5 md:col-span-2">
                        <span className="text-xs font-bold text-text-secondary">마감일</span>
                        <Input
                          type="date"
                          value={form.dueDate}
                          onChange={(event) =>
                            updateDraft({ dueDate: event.target.value })
                          }
                        />
                      </label>
                    </div>

                    <div className="flex justify-end border-t border-surface-border-soft pt-4">
                      <Button type="submit" disabled={updateTask.isPending}>
                        <Save className="mr-2 size-4" />
                        저장
                      </Button>
                    </div>
                  </form>
                </Tabs.Content>

                <Tabs.Content value="checklist">
                  <TaskChecklistPanel taskId={task.id} />
                </Tabs.Content>
                <Tabs.Content value="references">
                  <TaskReferencesPanel taskId={task.id} />
                </Tabs.Content>
                <Tabs.Content value="attachments">
                  <TaskAttachmentsPanel task={task} />
                </Tabs.Content>
                <Tabs.Content value="comments">
                  <TaskCommentsPanel taskId={task.id} />
                </Tabs.Content>
                <Tabs.Content value="activity">
                  <TaskActivityPanel taskId={task.id} />
                </Tabs.Content>
              </div>
            </Tabs.Root>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
