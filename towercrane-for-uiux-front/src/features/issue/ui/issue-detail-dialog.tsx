import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { Save, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  ISSUE_PRIORITY_LABELS,
  ISSUE_PRIORITY_ORDER,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_ORDER,
  ISSUE_TYPE_LABELS,
  ISSUE_TYPE_ORDER,
} from '../../../entities/issue/model/constants'
import type { Issue, IssuePriority, IssueStatus, IssueType } from '../../../entities/issue/model/types'
import type { AssignableUser } from '../../../shared/api/users'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Select } from '../../../shared/ui/select'
import { Textarea } from '../../../shared/ui/textarea'
import {
  useDeleteIssue,
  useIssueDetail,
  useUpdateIssue,
} from '../model/use-issue-queries'
import { IssueCommentsPanel } from './issue-comments-panel'
import { IssuePriorityBadge, IssueStatusBadge, IssueTypeBadge } from './issue-badges'

type FormState = {
  title: string
  content: string
  issueType: IssueType
  status: IssueStatus
  priority: IssuePriority
  assigneeId: string
  dueDate: string
}

function toDateInputValue(value?: string | null) {
  if (!value) return ''
  return value.slice(0, 10)
}

function toFormState(issue: Issue): FormState {
  return {
    title: issue.title,
    content: issue.content,
    issueType: issue.issueType,
    status: issue.status,
    priority: issue.priority,
    assigneeId: issue.assigneeId ?? '',
    dueDate: toDateInputValue(issue.dueDate),
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function IssueDetailDialog({
  issueId,
  open,
  users,
  onOpenChange,
}: {
  issueId: string | null
  open: boolean
  users: AssignableUser[]
  onOpenChange: (open: boolean) => void
}) {
  const issueQuery = useIssueDetail(issueId, open)
  const updateIssue = useUpdateIssue()
  const deleteIssue = useDeleteIssue()
  const issue = issueQuery.data
  const [draft, setDraft] = useState<{ issueId: string; values: FormState } | null>(null)
  const form = issue
    ? draft?.issueId === issue.id
      ? draft.values
      : toFormState(issue)
    : null

  const updateDraft = (changes: Partial<FormState>) => {
    if (!issue || !form) return
    setDraft({ issueId: issue.id, values: { ...form, ...changes } })
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setDraft(null)
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!issue || !form || !form.title.trim()) return

    await updateIssue.mutateAsync({
      id: issue.id,
      body: {
        title: form.title.trim(),
        content: form.content,
        issueType: form.issueType,
        status: form.status,
        priority: form.priority,
        assigneeId: form.assigneeId || null,
        dueDate: form.dueDate || null,
      },
    })
    setDraft(null)
  }

  const handleDelete = async () => {
    if (!issue) return
    if (!confirm('이슈를 삭제하시겠습니까?')) return
    await deleteIssue.mutateAsync(issue.id)
    handleOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[min(960px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-surface-border-soft shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft bg-surface-muted px-5 py-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {issue ? (
                  <>
                    <IssueStatusBadge status={issue.status} />
                    <IssuePriorityBadge priority={issue.priority} />
                    <IssueTypeBadge issueType={issue.issueType} />
                  </>
                ) : null}
              </div>
              <Dialog.Title className="truncate text-lg font-black text-text-primary">
                {issue?.title ?? '이슈 상세'}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-text-secondary">
                작성자 {issue?.reporterName ?? '-'} · 생성 {formatDateTime(issue?.createdAt)}
              </Dialog.Description>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {issue ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  tone="danger"
                  onClick={handleDelete}
                  disabled={deleteIssue.isPending}
                >
                  <Trash2 className="mr-2 size-4" />
                  삭제
                </Button>
              ) : null}
              <Dialog.Close asChild>
                <button type="button" className="ui-icon-button size-8" aria-label="닫기">
                  <X className="size-4" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {issueQuery.isLoading || !form ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-text-muted">
              이슈를 불러오는 중입니다.
            </div>
          ) : !issue ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-text-muted">
              이슈를 찾을 수 없습니다.
            </div>
          ) : (
            <Tabs.Root defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
              <Tabs.List className="flex shrink-0 gap-1 border-b border-surface-border-soft bg-surface-raised px-4 pt-3">
                {[
                  ['overview', '개요'],
                  ['comments', '댓글'],
                ].map(([value, label]) => (
                  <Tabs.Trigger
                    key={value}
                    value={value}
                    className="rounded-t-md border border-transparent px-4 py-2 text-sm font-bold text-text-secondary transition-colors data-[state=active]:border-surface-border-soft data-[state=active]:bg-background data-[state=active]:text-text-primary"
                  >
                    {label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <Tabs.Content value="overview">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold text-text-secondary">제목</span>
                      <Input
                        value={form.title}
                        onChange={(e) => updateDraft({ title: e.target.value })}
                      />
                    </label>

                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold text-text-secondary">내용</span>
                      <Textarea
                        value={form.content}
                        onChange={(e) => updateDraft({ content: e.target.value })}
                        className="min-h-36 resize-y"
                      />
                    </label>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block space-y-1.5">
                        <span className="text-xs font-bold text-text-secondary">유형</span>
                        <Select
                          value={form.issueType}
                          onChange={(e) =>
                            updateDraft({ issueType: e.target.value as IssueType })
                          }
                        >
                          {ISSUE_TYPE_ORDER.map((type) => (
                            <option key={type} value={type}>
                              {ISSUE_TYPE_LABELS[type]}
                            </option>
                          ))}
                        </Select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs font-bold text-text-secondary">상태</span>
                        <Select
                          value={form.status}
                          onChange={(e) =>
                            updateDraft({ status: e.target.value as IssueStatus })
                          }
                        >
                          {ISSUE_STATUS_ORDER.map((status) => (
                            <option key={status} value={status}>
                              {ISSUE_STATUS_LABELS[status]}
                            </option>
                          ))}
                        </Select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs font-bold text-text-secondary">우선순위</span>
                        <Select
                          value={form.priority}
                          onChange={(e) =>
                            updateDraft({ priority: e.target.value as IssuePriority })
                          }
                        >
                          {ISSUE_PRIORITY_ORDER.map((priority) => (
                            <option key={priority} value={priority}>
                              {ISSUE_PRIORITY_LABELS[priority]}
                            </option>
                          ))}
                        </Select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs font-bold text-text-secondary">담당자</span>
                        <Select
                          value={form.assigneeId}
                          onChange={(e) => updateDraft({ assigneeId: e.target.value })}
                        >
                          <option value="">미지정</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </Select>
                      </label>

                      <label className="block space-y-1.5 md:col-span-2">
                        <span className="text-xs font-bold text-text-secondary">마감일</span>
                        <Input
                          type="date"
                          value={form.dueDate}
                          onChange={(e) => updateDraft({ dueDate: e.target.value })}
                        />
                      </label>
                    </div>

                    <div className="flex justify-end border-t border-surface-border-soft pt-4">
                      <Button type="submit" disabled={updateIssue.isPending}>
                        <Save className="mr-2 size-4" />
                        저장
                      </Button>
                    </div>
                  </form>
                </Tabs.Content>

                <Tabs.Content value="comments">
                  <IssueCommentsPanel issueId={issue.id} />
                </Tabs.Content>
              </div>
            </Tabs.Root>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
