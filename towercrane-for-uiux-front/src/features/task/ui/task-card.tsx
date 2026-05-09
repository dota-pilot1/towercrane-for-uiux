import { CalendarDays, UserRound } from 'lucide-react'
import { clsx } from 'clsx'
import type { Task } from '../../../entities/task/model/types'
import { TaskPriorityBadge, TaskStatusBadge, TaskTypeBadge } from './task-badges'

function formatDate(value?: string | null) {
  if (!value) return '마감 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function isOverdue(task: Task) {
  if (!task.dueDate || task.status === 'DONE') return false
  const due = new Date(task.dueDate)
  if (Number.isNaN(due.getTime())) return false
  return due.getTime() < Date.now()
}

export function TaskCard({
  task,
  onOpen,
  className,
}: {
  task: Task
  onOpen: (taskId: string) => void
  className?: string
}) {
  const overdue = isOverdue(task)

  return (
    <button
      type="button"
      onClick={() => onOpen(task.id)}
      className={clsx(
        'w-full rounded-md border border-surface-border-soft bg-surface-raised p-3 text-left shadow-sm transition-all hover:border-brand-border hover:bg-surface-strong',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-bold leading-5 text-text-primary">
            {task.title}
          </p>
          {task.content ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">
              {task.content}
            </p>
          ) : null}
        </div>
        <TaskPriorityBadge priority={task.priority} className="shrink-0" />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <TaskStatusBadge status={task.status} />
        <TaskTypeBadge taskType={task.taskType} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1">
          <UserRound className="size-3.5" />
          {task.assigneeName ?? '미지정'}
        </span>
        <span
          className={clsx(
            'inline-flex items-center gap-1',
            overdue ? 'text-destructive' : 'text-text-muted',
          )}
        >
          <CalendarDays className="size-3.5" />
          {formatDate(task.dueDate)}
        </span>
      </div>
    </button>
  )
}
