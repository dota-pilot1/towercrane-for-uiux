import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
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
  CreateTaskRequest,
  TaskPriority,
  TaskScope,
  TaskStatus,
  TaskType,
} from '../../../entities/task/model/types'
import type { AssignableUser } from '../../../shared/api/users'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Select } from '../../../shared/ui/select'
import { Textarea } from '../../../shared/ui/textarea'
import { useCreateTask } from '../model/use-task-queries'

type TaskFormState = Required<
  Omit<CreateTaskRequest, 'assigneeId' | 'dueDate' | 'visibility'>
> & {
  assigneeId: string
  dueDate: string
}

function getInitialForm(
  defaultScope: TaskScope,
  currentUserId?: string,
  lockAssigneeToCurrentUser?: boolean,
): TaskFormState {
  return {
    title: '',
    content: '',
    taskType: 'FEATURE',
    status: 'TODO',
    priority: 'MEDIUM',
    scope: defaultScope,
    assigneeId: lockAssigneeToCurrentUser ? (currentUserId ?? '') : '',
    dueDate: '',
  }
}

export function TaskFormDialog({
  open,
  users,
  defaultScope = 'TEAM',
  currentUserId,
  lockAssigneeToCurrentUser,
  onOpenChange,
}: {
  open: boolean
  users: AssignableUser[]
  defaultScope?: TaskScope
  currentUserId?: string
  lockAssigneeToCurrentUser?: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [form, setForm] = useState(() =>
    getInitialForm(defaultScope, currentUserId, lockAssigneeToCurrentUser),
  )
  const createTask = useCreateTask()

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setForm(getInitialForm(defaultScope, currentUserId, lockAssigneeToCurrentUser))
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.title.trim()) return

    await createTask.mutateAsync({
      title: form.title.trim(),
      content: form.content,
      taskType: form.taskType,
      status: form.status,
      priority: form.priority,
      scope: form.scope,
      assigneeId: form.assigneeId || null,
      dueDate: form.dueDate || null,
    })
    setForm(getInitialForm(defaultScope, currentUserId, lockAssigneeToCurrentUser))
    handleOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-surface-border-soft shadow-2xl">
          <div className="flex items-start justify-between border-b border-surface-border-soft bg-surface-muted px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-black text-text-primary">
                새 업무
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-text-secondary">
                {form.scope === 'PERSONAL'
                  ? '개인 업무의 제목과 완료 기준을 정리합니다.'
                  : '제목과 담당 흐름을 정리합니다.'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="ui-icon-button size-8"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5">
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-text-secondary">제목</span>
                <Input
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="업무 제목"
                  required
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-text-secondary">내용</span>
                <Textarea
                  value={form.content}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, content: event.target.value }))
                  }
                  className="min-h-28 resize-y"
                  placeholder="업무 배경, 범위, 완료 기준"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-text-secondary">업무 범위</span>
                  <Select
                    value={form.scope}
                    onChange={(event) => {
                      const scope = event.target.value as TaskScope
                      setForm((prev) => ({
                        ...prev,
                        scope,
                        assigneeId:
                          scope === 'PERSONAL'
                            ? (currentUserId ?? prev.assigneeId)
                            : prev.assigneeId,
                      }))
                    }}
                  >
                    <option value="TEAM">팀 업무</option>
                    <option value="PERSONAL">개인 업무</option>
                  </Select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-text-secondary">유형</span>
                  <Select
                    value={form.taskType}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        taskType: event.target.value as TaskType,
                      }))
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
                      setForm((prev) => ({
                        ...prev,
                        status: event.target.value as TaskStatus,
                      }))
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
                      setForm((prev) => ({
                        ...prev,
                        priority: event.target.value as TaskPriority,
                      }))
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
                  <Select
                    value={form.assigneeId}
                    disabled={lockAssigneeToCurrentUser || form.scope === 'PERSONAL'}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, assigneeId: event.target.value }))
                    }
                  >
                    <option value="">미지정</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-xs font-bold text-text-secondary">마감일</span>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, dueDate: event.target.value }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-surface-border-soft pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? '생성 중' : '생성'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
