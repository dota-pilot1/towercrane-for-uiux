import { useState } from 'react'
import {
  ArrowLeft,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'
import { useSearch } from '@tanstack/react-router'
import { useIssues } from '../../../features/issue/model/use-issue-queries'
import { IssueKanbanView } from '../../../features/issue/ui/issue-kanban-view'
import { IssueTableView } from '../../../features/issue/ui/issue-table-view'
import { IssueFormDialog } from '../../../features/issue/ui/issue-form-dialog'
import { IssueDetailDialog } from '../../../features/issue/ui/issue-detail-dialog'
import { ISSUE_STATUS_LABELS } from '../../../entities/issue/model/constants'
import type { IssueFilters, IssueStatus } from '../../../entities/issue/model/types'
import { useAssignableUsers } from '../../../shared/api/users'
import { Button } from '../../../shared/ui/button'
import { clsx } from 'clsx'

type ViewMode = 'kanban' | 'table'

const STATUS_ORDER: IssueStatus[] = ['OPEN', 'IN_PROGRESS', 'TESTING', 'CLOSED']

export function PrototypeIssuesPage() {
  const { prototypeId } = useSearch({ strict: false }) as { prototypeId?: string }

  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [filters] = useState<Omit<IssueFilters, 'prototypeId'>>({
    page: 1,
    pageSize: 100,
    sort: 'order',
  })

  const issuesQuery = useIssues({ prototypeId: prototypeId ?? '', ...filters })
  const usersQuery = useAssignableUsers()
  const issues = issuesQuery.data?.items ?? []
  const users = usersQuery.data ?? []
  const total = issuesQuery.data?.total ?? 0

  const handleOpenDetail = (id: string) => {
    setSelectedIssueId(id)
    setIsDetailOpen(true)
  }

  const handleDetailOpenChange = (open: boolean) => {
    setIsDetailOpen(open)
    if (!open) setSelectedIssueId(null)
  }

  if (!prototypeId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-md border border-dashed border-surface-border-soft text-sm text-text-muted">
        프로토타입을 선택해주세요.
      </div>
    )
  }

  return (
    <section className="space-y-4">
      {/* 헤더 */}
      <div className="flex flex-col gap-3 rounded-md border border-surface-border-soft bg-surface-raised px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="ui-icon-button size-9 shrink-0"
            title="뒤로가기"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="ui-icon-button-brand size-10 shrink-0">
            <ShieldAlert className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black text-text-primary">이슈 관리</h2>
            <p className="mt-1 text-xs text-text-secondary">
              프로토타입 이슈를 등록하고 추적합니다.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 상태별 카운트 */}
          <div className="hidden sm:flex items-center gap-1.5">
            {STATUS_ORDER.map((status) => {
              const count = issues.filter((i) => i.status === status).length
              return (
                <span
                  key={status}
                  className="rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-1 text-[11px] font-bold text-text-secondary"
                >
                  {ISSUE_STATUS_LABELS[status]} {count}
                </span>
              )
            })}
          </div>
          <span className="text-xs font-bold text-text-muted">Total {total}</span>
        </div>
      </div>

      {/* 툴바 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-md border border-surface-border-soft bg-surface-raised p-1">
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={clsx(
              'flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-bold transition-colors',
              viewMode === 'kanban'
                ? 'bg-brand-glass text-brand-primary'
                : 'text-text-muted hover:text-text-secondary',
            )}
          >
            <LayoutGrid className="size-3.5" />
            칸반
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={clsx(
              'flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-bold transition-colors',
              viewMode === 'table'
                ? 'bg-brand-glass text-brand-primary'
                : 'text-text-muted hover:text-text-secondary',
            )}
          >
            <List className="size-3.5" />
            테이블
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => issuesQuery.refetch()}
            disabled={issuesQuery.isFetching}
            className="ui-icon-button"
            title="새로고침"
          >
            <RefreshCw className={clsx('size-4', issuesQuery.isFetching && 'animate-spin')} />
          </button>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="mr-1.5 size-4" />새 이슈
          </Button>
        </div>
      </div>

      {/* 뷰 */}
      {viewMode === 'kanban' ? (
        <IssueKanbanView issues={issues} onOpen={handleOpenDetail} />
      ) : (
        <IssueTableView issues={issues} isLoading={issuesQuery.isLoading} onOpen={handleOpenDetail} />
      )}

      {/* 다이얼로그 */}
      <IssueFormDialog
        prototypeId={prototypeId}
        open={createOpen}
        users={users}
        onOpenChange={setCreateOpen}
      />
      <IssueDetailDialog
        issueId={selectedIssueId}
        open={isDetailOpen}
        users={users}
        onOpenChange={handleDetailOpenChange}
      />
    </section>
  )
}
