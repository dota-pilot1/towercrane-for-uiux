import { clsx } from 'clsx'
import type { ReactNode } from 'react'
import {
  ISSUE_PRIORITY_BADGE_CLASS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUS_BADGE_CLASS,
  ISSUE_STATUS_LABELS,
  ISSUE_TYPE_BADGE_CLASS,
  ISSUE_TYPE_LABELS,
} from '../../../entities/issue/model/constants'
import type { IssuePriority, IssueStatus, IssueType } from '../../../entities/issue/model/types'

type BadgeProps = { className?: string }

function Badge({ className, children }: BadgeProps & { children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex h-6 items-center rounded-sm border px-2 text-[11px] font-bold leading-none',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function IssueStatusBadge({ status, className }: BadgeProps & { status: IssueStatus }) {
  return (
    <Badge className={clsx(ISSUE_STATUS_BADGE_CLASS[status], className)}>
      {ISSUE_STATUS_LABELS[status]}
    </Badge>
  )
}

export function IssuePriorityBadge({ priority, className }: BadgeProps & { priority: IssuePriority }) {
  return (
    <Badge className={clsx(ISSUE_PRIORITY_BADGE_CLASS[priority], className)}>
      {ISSUE_PRIORITY_LABELS[priority]}
    </Badge>
  )
}

export function IssueTypeBadge({ issueType, className }: BadgeProps & { issueType: IssueType }) {
  return (
    <Badge className={clsx(ISSUE_TYPE_BADGE_CLASS[issueType], className)}>
      {ISSUE_TYPE_LABELS[issueType]}
    </Badge>
  )
}
