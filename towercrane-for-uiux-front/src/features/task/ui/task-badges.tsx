import { clsx } from 'clsx'
import type { ReactNode } from 'react'
import {
  TASK_PRIORITY_BADGE_CLASS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_BADGE_CLASS,
  TASK_STATUS_LABELS,
  TASK_TYPE_BADGE_CLASS,
  TASK_TYPE_LABELS,
} from '../../../entities/task/model/constants'
import type { TaskPriority, TaskStatus, TaskType } from '../../../entities/task/model/types'

type BadgeProps = {
  className?: string
}

function Badge({
  className,
  children,
}: BadgeProps & {
  children: ReactNode
}) {
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

export function TaskStatusBadge({
  status,
  className,
}: BadgeProps & {
  status: TaskStatus
}) {
  return (
    <Badge className={clsx(TASK_STATUS_BADGE_CLASS[status], className)}>
      {TASK_STATUS_LABELS[status]}
    </Badge>
  )
}

export function TaskPriorityBadge({
  priority,
  className,
}: BadgeProps & {
  priority: TaskPriority
}) {
  return (
    <Badge className={clsx(TASK_PRIORITY_BADGE_CLASS[priority], className)}>
      {TASK_PRIORITY_LABELS[priority]}
    </Badge>
  )
}

export function TaskTypeBadge({
  taskType,
  className,
}: BadgeProps & {
  taskType: TaskType
}) {
  return (
    <Badge className={clsx(TASK_TYPE_BADGE_CLASS[taskType], className)}>
      {TASK_TYPE_LABELS[taskType]}
    </Badge>
  )
}
