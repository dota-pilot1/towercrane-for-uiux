import type { TaskActivityType, TaskPriority, TaskStatus, TaskType } from './types'

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  FEATURE: '기능',
  BUG: '버그',
  DOCS: '문서',
  DESIGN: '디자인',
  REFACTOR: '리팩토링',
  QA: 'QA',
  CHORE: '기타',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: '대기',
  IN_PROGRESS: '진행 중',
  REVIEW: '검토',
  DONE: '완료',
  HOLD: '보류',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
  URGENT: '긴급',
}

export const TASK_ACTIVITY_LABELS: Record<TaskActivityType, string> = {
  CREATED: '생성',
  STATUS: '상태',
  ASSIGNEE: '담당자',
  PRIORITY: '우선순위',
  UPDATED: '수정',
  ARCHIVED: '보관',
  RESTORED: '복원',
}

export const TASK_STATUS_ORDER: TaskStatus[] = [
  'TODO',
  'IN_PROGRESS',
  'REVIEW',
  'DONE',
  'HOLD',
]

export const TASK_TYPE_ORDER: TaskType[] = [
  'FEATURE',
  'BUG',
  'DOCS',
  'DESIGN',
  'REFACTOR',
  'QA',
  'CHORE',
]

export const TASK_PRIORITY_ORDER: TaskPriority[] = [
  'URGENT',
  'HIGH',
  'MEDIUM',
  'LOW',
]

export const TASK_STATUS_BADGE_CLASS: Record<TaskStatus, string> = {
  TODO: 'border-surface-border-soft bg-surface-muted text-text-secondary',
  IN_PROGRESS: 'border-brand-border bg-brand-glass text-brand-primary',
  REVIEW: 'border-surface-border bg-surface-raised text-text-primary',
  DONE: 'border-brand-border bg-brand-glass text-brand-primary',
  HOLD: 'border-surface-border-soft bg-surface-muted text-text-muted',
}

export const TASK_PRIORITY_BADGE_CLASS: Record<TaskPriority, string> = {
  URGENT: 'border-destructive bg-danger-glass text-destructive',
  HIGH: 'border-brand-border bg-brand-glass text-brand-primary',
  MEDIUM: 'border-surface-border bg-surface-raised text-text-primary',
  LOW: 'border-surface-border-soft bg-surface-muted text-text-secondary',
}

export const TASK_TYPE_BADGE_CLASS: Record<TaskType, string> = {
  FEATURE: 'border-brand-border bg-brand-glass text-brand-primary',
  BUG: 'border-destructive bg-danger-glass text-destructive',
  DOCS: 'border-surface-border bg-surface-raised text-text-primary',
  DESIGN: 'border-surface-border bg-surface-muted text-text-secondary',
  REFACTOR: 'border-surface-border-soft bg-surface-muted text-text-muted',
  QA: 'border-surface-border bg-surface-raised text-text-primary',
  CHORE: 'border-surface-border-soft bg-surface-muted text-text-secondary',
}
