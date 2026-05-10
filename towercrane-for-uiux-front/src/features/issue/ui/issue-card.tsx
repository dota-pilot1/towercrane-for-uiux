import { CalendarDays, UserRound } from 'lucide-react'
import { clsx } from 'clsx'
import type { Issue } from '../../../entities/issue/model/types'
import { IssuePriorityBadge, IssueStatusBadge, IssueTypeBadge } from './issue-badges'

function formatDate(value?: string | null) {
  if (!value) return '마감 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit' }).format(date)
}

function isOverdue(issue: Issue) {
  if (!issue.dueDate || issue.status === 'CLOSED') return false
  const due = new Date(issue.dueDate)
  if (Number.isNaN(due.getTime())) return false
  return due.getTime() < Date.now()
}

export function IssueCard({
  issue,
  onOpen,
  className,
}: {
  issue: Issue
  onOpen: (issueId: string) => void
  className?: string
}) {
  const overdue = isOverdue(issue)

  return (
    <button
      type="button"
      onClick={() => onOpen(issue.id)}
      className={clsx(
        'w-full rounded-md border border-surface-border-soft bg-surface-raised p-3 text-left shadow-sm transition-all hover:border-brand-border hover:bg-surface-strong',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-bold leading-5 text-text-primary">
            {issue.title}
          </p>
          {issue.content ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">
              {issue.content}
            </p>
          ) : null}
        </div>
        <IssuePriorityBadge priority={issue.priority} className="shrink-0" />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <IssueStatusBadge status={issue.status} />
        <IssueTypeBadge issueType={issue.issueType} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1">
          <UserRound className="size-3.5" />
          {issue.assigneeName ?? '미지정'}
        </span>
        <span
          className={clsx(
            'inline-flex items-center gap-1',
            overdue ? 'text-destructive' : 'text-text-muted',
          )}
        >
          <CalendarDays className="size-3.5" />
          {formatDate(issue.dueDate)}
        </span>
      </div>
    </button>
  )
}
