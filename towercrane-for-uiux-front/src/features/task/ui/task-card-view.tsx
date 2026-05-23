import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
} from '../../../entities/task/model/constants'
import type { Task, TaskStatus } from '../../../entities/task/model/types'
import { Button } from '../../../shared/ui/button'
import { useUpdateTaskStatus } from '../model/use-task-queries'
import { TaskCard } from './task-card'

function SelectableTaskCard({
  task,
  selected,
  onSelectedChange,
  onOpenTask,
}: {
  task: Task
  selected: boolean
  onSelectedChange: (taskId: string, selected: boolean) => void
  onOpenTask: (taskId: string) => void
}) {
  return (
    <div className="flex items-start gap-2">
      <label
        className={clsx(
          'mt-3 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors',
          selected
            ? 'border-brand-border bg-brand-glass text-brand-primary'
            : 'border-surface-border-soft bg-surface-raised text-text-muted hover:border-brand-border',
        )}
        title="이동할 업무 선택"
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={selected}
          onChange={(event) => onSelectedChange(task.id, event.target.checked)}
        />
        {selected ? <Check className="size-4" /> : null}
      </label>
      <div className="min-w-0 flex-1">
        <TaskCard task={task} onOpen={onOpenTask} />
      </div>
    </div>
  )
}

function DropGroup({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section
      className="min-h-[420px] rounded-md border border-surface-border-soft bg-surface-muted p-4"
    >
      <div className="mb-4">
        <h3 className="text-base font-black text-text-primary">{title}</h3>
        <p className="mt-1 text-xs text-text-secondary">{description}</p>
      </div>
      {children}
    </section>
  )
}

export function TaskCardView({
  tasks,
  onOpenTask,
}: {
  tasks: Task[]
  onOpenTask: (taskId: string) => void
}) {
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(() => new Set())
  const [collapsed, setCollapsed] = useState<Record<TaskStatus, boolean>>({
    TODO: false,
    IN_PROGRESS: false,
    REVIEW: false,
    DONE: false,
    HOLD: false,
  })
  const updateStatus = useUpdateTaskStatus()

  const openTasks = useMemo(
    () => tasks.filter((task) => task.status !== 'DONE'),
    [tasks],
  )
  const doneTasks = useMemo(
    () => tasks.filter((task) => task.status === 'DONE'),
    [tasks],
  )

  const tasksByStatus = useMemo(
    () =>
      TASK_STATUS_ORDER.reduce<Record<TaskStatus, Task[]>>(
        (acc, status) => {
          acc[status] = tasks.filter((task) => task.status === status)
          return acc
        },
        {
          TODO: [],
          IN_PROGRESS: [],
          REVIEW: [],
          DONE: [],
          HOLD: [],
        },
      ),
    [tasks],
  )

  const selectedOpenTaskIds = openTasks
    .filter((task) => selectedTaskIds.has(task.id))
    .map((task) => task.id)
  const selectedDoneTaskIds = doneTasks
    .filter((task) => selectedTaskIds.has(task.id))
    .map((task) => task.id)

  const handleSelectedChange = (taskId: string, selected: boolean) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(taskId)
      } else {
        next.delete(taskId)
      }
      return next
    })
  }

  const moveSelectedTasks = (taskIds: string[], status: TaskStatus) => {
    taskIds.forEach((id) => updateStatus.mutate({ id, status }))
    setSelectedTaskIds((prev) => {
      const next = new Set(prev)
      taskIds.forEach((id) => next.delete(id))
      return next
    })
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_4rem_minmax(0,1fr)]">
      <DropGroup
        title={`미완료 업무 ${openTasks.length}`}
        description="진행 중인 업무를 상태별로 확인합니다."
      >
        <div className="space-y-3">
          {TASK_STATUS_ORDER.filter((status) => status !== 'DONE').map((status) => (
            <div
              key={status}
              className="rounded-md border border-surface-border-soft bg-surface-raised"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left"
                onClick={() =>
                  setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }))
                }
              >
                <span className="text-sm font-bold text-text-primary">
                  {TASK_STATUS_LABELS[status]}
                </span>
                <span className="flex items-center gap-2 text-xs text-text-muted">
                  {tasksByStatus[status].length}
                  {collapsed[status] ? (
                    <ChevronRight className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </span>
              </button>
              {!collapsed[status] ? (
                <div className="grid gap-2 border-t border-surface-border-soft p-2 min-[900px]:grid-cols-2">
                  {tasksByStatus[status].length === 0 ? (
                    <div className="rounded-md border border-dashed border-surface-border-soft px-3 py-6 text-center text-xs text-text-muted min-[900px]:col-span-2">
                      업무 없음
                    </div>
                  ) : (
                    tasksByStatus[status].map((task) => (
                      <SelectableTaskCard
                        key={task.id}
                        task={task}
                        selected={selectedTaskIds.has(task.id)}
                        onSelectedChange={handleSelectedChange}
                        onOpenTask={onOpenTask}
                      />
                    ))
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </DropGroup>

      <div className="flex items-center justify-center xl:py-20">
        <div className="flex items-center gap-2 xl:h-full xl:flex-col">
          <div className="hidden w-px flex-1 bg-surface-border-soft xl:block" />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            title="체크한 업무를 완료로 이동"
            aria-label="체크한 업무를 완료로 이동"
            disabled={selectedOpenTaskIds.length === 0 || updateStatus.isPending}
            onClick={() => moveSelectedTasks(selectedOpenTaskIds, 'DONE')}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            title="체크한 완료 업무를 대기로 이동"
            aria-label="체크한 완료 업무를 대기로 이동"
            disabled={selectedDoneTaskIds.length === 0 || updateStatus.isPending}
            onClick={() => moveSelectedTasks(selectedDoneTaskIds, 'TODO')}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="hidden w-px flex-1 bg-surface-border-soft xl:block" />
        </div>
      </div>

      <DropGroup
        title={`완료 업무 ${doneTasks.length}`}
        description="체크한 업무를 가운데 버튼으로 완료 영역에 옮깁니다."
      >
        <div className="grid gap-2 min-[900px]:grid-cols-2">
          {doneTasks.length === 0 ? (
            <div className="rounded-md border border-dashed border-surface-border-soft px-3 py-12 text-center text-sm text-text-muted min-[900px]:col-span-2">
              완료된 업무가 없습니다.
            </div>
          ) : (
            doneTasks.map((task) => (
              <div key={task.id} className="space-y-2">
                <SelectableTaskCard
                  task={task}
                  selected={selectedTaskIds.has(task.id)}
                  onSelectedChange={handleSelectedChange}
                  onOpenTask={onOpenTask}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updateStatus.mutate({ id: task.id, status: 'TODO' })}
                >
                  대기로 되돌리기
                </Button>
              </div>
            ))
          )}
        </div>
      </DropGroup>
    </div>
  )
}
