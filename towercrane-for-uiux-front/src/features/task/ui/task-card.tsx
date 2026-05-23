import { CalendarDays, ExternalLink, UserRound } from 'lucide-react'
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
  const handleOpenDetail = () => {
    if (typeof window === 'undefined') {
      onOpen(task.id)
      return
    }
    window.open(`/task/${task.id}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <article
      className={clsx(
        'group relative w-full overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised p-3 text-left shadow-sm transition-all hover:border-brand-border hover:bg-surface-strong hover:shadow-md',
        className,
      )}
    >
      <div className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-brand-primary opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-3 pl-1">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-black leading-5 text-text-primary">
            {task.title}
          </p>
          {task.content ? (
            <p className="mt-2 line-clamp-2 min-h-8 text-xs leading-5 text-text-secondary">
              {task.content}
            </p>
          ) : (
            <p className="mt-2 min-h-8 text-xs leading-5 text-text-muted">설명이 없습니다.</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <TaskPriorityBadge priority={task.priority} />
          <TaskStatusBadge status={task.status} />
          <TaskTypeBadge taskType={task.taskType} />
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3 border-t border-surface-border-soft pt-3">
        <div className="min-w-0 space-y-1 text-xs text-text-muted">
          <span className="flex min-w-0 items-center gap-1.5">
            <UserRound className="size-3.5 shrink-0" />
            <span className="truncate">{task.assigneeName ?? '미지정'}</span>
          </span>
          <span
            className={clsx(
              'flex items-center gap-1.5',
              overdue ? 'text-destructive' : 'text-text-muted',
            )}
          >
            <CalendarDays className="size-3.5 shrink-0" />
            {formatDate(task.dueDate)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenDetail}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-surface-border bg-background px-2.5 text-xs font-bold text-text-primary transition-colors hover:border-brand-border hover:bg-brand-glass hover:text-brand-primary"
          title="상세 새탭으로 열기"
          aria-label="상세 새탭으로 열기"
        >
          상세
          <ExternalLink className="size-3.5" />
        </button>
      </div>
    </article>
  )
}
