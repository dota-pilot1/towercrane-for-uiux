import type { IssueType, IssueStatus, IssuePriority } from './types'

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  BUG: '버그',
  FEATURE: '기능 요청',
  IMPROVEMENT: '개선',
  QUESTION: '질문',
  OTHER: '기타',
}

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  OPEN: '이슈 등록',
  IN_PROGRESS: '해결 진행',
  TESTING: '테스트',
  CLOSED: '완료',
}

export const ISSUE_PRIORITY_LABELS: Record<IssuePriority, string> = {
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
  URGENT: '긴급',
}

export const ISSUE_STATUS_ORDER: IssueStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'TESTING',
  'CLOSED',
]

export const ISSUE_TYPE_ORDER: IssueType[] = [
  'BUG',
  'FEATURE',
  'IMPROVEMENT',
  'QUESTION',
  'OTHER',
]

export const ISSUE_PRIORITY_ORDER: IssuePriority[] = [
  'URGENT',
  'HIGH',
  'MEDIUM',
  'LOW',
]

export const ISSUE_STATUS_BADGE_CLASS: Record<IssueStatus, string> = {
  OPEN: 'border-surface-border-soft bg-surface-muted text-text-secondary',
  IN_PROGRESS: 'border-brand-border bg-brand-glass text-brand-primary',
  TESTING: 'border-surface-border bg-surface-raised text-text-primary',
  CLOSED: 'border-brand-border bg-brand-glass text-brand-primary',
}

export const ISSUE_PRIORITY_BADGE_CLASS: Record<IssuePriority, string> = {
  URGENT: 'border-destructive bg-danger-glass text-destructive',
  HIGH: 'border-brand-border bg-brand-glass text-brand-primary',
  MEDIUM: 'border-surface-border bg-surface-raised text-text-primary',
  LOW: 'border-surface-border-soft bg-surface-muted text-text-secondary',
}

export const ISSUE_TYPE_BADGE_CLASS: Record<IssueType, string> = {
  BUG: 'border-destructive bg-danger-glass text-destructive',
  FEATURE: 'border-brand-border bg-brand-glass text-brand-primary',
  IMPROVEMENT: 'border-surface-border bg-surface-raised text-text-primary',
  QUESTION: 'border-surface-border-soft bg-surface-muted text-text-secondary',
  OTHER: 'border-surface-border-soft bg-surface-muted text-text-muted',
}
