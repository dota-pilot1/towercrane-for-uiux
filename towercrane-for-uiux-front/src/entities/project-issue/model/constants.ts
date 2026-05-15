import type {
  ProjectIssueActivityType,
  ProjectIssuePriority,
  ProjectIssueStatus,
  ProjectIssueType,
} from './types'

export const PROJECT_ISSUE_TYPE_LABELS: Record<ProjectIssueType, string> = {
  BUG: '버그',
  FEATURE: '기능',
  IMPROVEMENT: '개선',
  QUESTION: '질문',
  RISK: '리스크',
  OTHER: '기타',
}

export const PROJECT_ISSUE_STATUS_LABELS: Record<ProjectIssueStatus, string> = {
  OPEN: '등록',
  IN_PROGRESS: '진행 중',
  TESTING: '테스트',
  CLOSED: '완료',
  HOLD: '보류',
}

export const PROJECT_ISSUE_PRIORITY_LABELS: Record<
  ProjectIssuePriority,
  string
> = {
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
  URGENT: '긴급',
}

export const PROJECT_ISSUE_ACTIVITY_LABELS: Record<
  ProjectIssueActivityType,
  string
> = {
  CREATED: '생성',
  STATUS: '상태',
  ASSIGNEE: '담당자',
  PRIORITY: '우선순위',
  UPDATED: '수정',
  ARCHIVED: '보관',
  RESTORED: '복원',
}

export const PROJECT_ISSUE_STATUS_ORDER: ProjectIssueStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'TESTING',
  'CLOSED',
  'HOLD',
]

export const PROJECT_ISSUE_TYPE_ORDER: ProjectIssueType[] = [
  'BUG',
  'FEATURE',
  'IMPROVEMENT',
  'QUESTION',
  'RISK',
  'OTHER',
]

export const PROJECT_ISSUE_PRIORITY_ORDER: ProjectIssuePriority[] = [
  'URGENT',
  'HIGH',
  'MEDIUM',
  'LOW',
]

export const PROJECT_ISSUE_STATUS_BADGE_CLASS: Record<
  ProjectIssueStatus,
  string
> = {
  OPEN: 'border-surface-border-soft bg-surface-muted text-text-secondary',
  IN_PROGRESS: 'border-brand-border bg-brand-glass text-brand-primary',
  TESTING: 'border-surface-border bg-surface-raised text-text-primary',
  CLOSED: 'border-brand-border bg-brand-glass text-brand-primary',
  HOLD: 'border-surface-border-soft bg-surface-muted text-text-muted',
}

export const PROJECT_ISSUE_PRIORITY_BADGE_CLASS: Record<
  ProjectIssuePriority,
  string
> = {
  URGENT: 'border-destructive bg-danger-glass text-destructive',
  HIGH: 'border-brand-border bg-brand-glass text-brand-primary',
  MEDIUM: 'border-surface-border bg-surface-raised text-text-primary',
  LOW: 'border-surface-border-soft bg-surface-muted text-text-secondary',
}

export const PROJECT_ISSUE_TYPE_BADGE_CLASS: Record<ProjectIssueType, string> =
  {
    BUG: 'border-destructive bg-danger-glass text-destructive',
    FEATURE: 'border-brand-border bg-brand-glass text-brand-primary',
    IMPROVEMENT: 'border-surface-border bg-surface-raised text-text-primary',
    QUESTION: 'border-surface-border-soft bg-surface-muted text-text-secondary',
    RISK: 'border-destructive bg-danger-glass text-destructive',
    OTHER: 'border-surface-border-soft bg-surface-muted text-text-muted',
  }
