import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  ISSUE_PRIORITY_LABELS,
  ISSUE_PRIORITY_ORDER,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_ORDER,
  ISSUE_TYPE_LABELS,
  ISSUE_TYPE_ORDER,
} from '../../../entities/issue/model/constants'
import type { IssuePriority, IssueStatus, IssueType } from '../../../entities/issue/model/types'
import type { AssignableUser } from '../../../shared/api/users'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Select } from '../../../shared/ui/select'
import { Textarea } from '../../../shared/ui/textarea'
import { useCreateIssue } from '../model/use-issue-queries'

const makeInitial = () => ({
  title: '',
  content: '',
  issueType: 'BUG' as IssueType,
  status: 'OPEN' as IssueStatus,
  priority: 'MEDIUM' as IssuePriority,
  assigneeId: '',
  dueDate: '',
})

export function IssueFormDialog({
  prototypeId,
  open,
  users,
  onOpenChange,
}: {
  prototypeId: string
  open: boolean
  users: AssignableUser[]
  onOpenChange: (open: boolean) => void
}) {
  const [form, setForm] = useState(makeInitial)
  const createIssue = useCreateIssue()

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setForm(makeInitial())
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.title.trim()) return

    await createIssue.mutateAsync({
      prototypeId,
      title: form.title.trim(),
      content: form.content,
      issueType: form.issueType,
      status: form.status,
      priority: form.priority,
      assigneeId: form.assigneeId || null,
      dueDate: form.dueDate || null,
    })
    handleOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-surface-border-soft shadow-2xl">
          <div className="flex items-start justify-between border-b border-surface-border-soft bg-surface-muted px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-black text-text-primary">새 이슈</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-text-secondary">
                발견한 이슈를 등록하고 추적합니다.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="ui-icon-button size-8" aria-label="닫기">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5">
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-text-secondary">제목</span>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="이슈 제목"
                  required
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-text-secondary">내용</span>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  className="min-h-24 resize-y"
                  placeholder="이슈 내용, 재현 방법, 기대 동작 등"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-text-secondary">유형</span>
                  <Select
                    value={form.issueType}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, issueType: e.target.value as IssueType }))
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
                      setForm((prev) => ({ ...prev, status: e.target.value as IssueStatus }))
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
                      setForm((prev) => ({ ...prev, priority: e.target.value as IssuePriority }))
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
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, assigneeId: e.target.value }))
                    }
                  >
                    <option value="">미지정</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-xs font-bold text-text-secondary">마감일</span>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-surface-border-soft pt-4">
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                취소
              </Button>
              <Button type="submit" disabled={createIssue.isPending}>
                {createIssue.isPending ? '등록 중' : '등록'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
