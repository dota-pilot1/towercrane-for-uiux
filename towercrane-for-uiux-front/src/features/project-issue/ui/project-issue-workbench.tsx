import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Activity,
  AlertTriangle,
  Archive,
  ArchiveRestore,
  CalendarDays,
  Check,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  File,
  Image as ImageIcon,
  Paperclip,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Send,
  ShieldAlert,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import {
  PROJECT_ISSUE_ACTIVITY_LABELS,
  PROJECT_ISSUE_PRIORITY_BADGE_CLASS,
  PROJECT_ISSUE_PRIORITY_LABELS,
  PROJECT_ISSUE_PRIORITY_ORDER,
  PROJECT_ISSUE_STATUS_BADGE_CLASS,
  PROJECT_ISSUE_STATUS_LABELS,
  PROJECT_ISSUE_STATUS_ORDER,
  PROJECT_ISSUE_TYPE_BADGE_CLASS,
  PROJECT_ISSUE_TYPE_LABELS,
  PROJECT_ISSUE_TYPE_ORDER,
} from '../../../entities/project-issue/model/constants'
import type {
  ProjectIssue,
  ProjectIssueFilters,
  ProjectIssuePriority,
  ProjectIssueStatus,
  ProjectIssueType,
} from '../../../entities/project-issue/model/types'
import {
  useAssignableUsers,
  type AssignableUser,
} from '../../../shared/api/users'
import { uploadFile } from '../../../shared/api/upload'
import { Button } from '../../../shared/ui/button'
import { CompactSelect } from '../../../shared/ui/compact-select'
import { Input } from '../../../shared/ui/input'
import { PageHeader } from '../../../shared/ui/page-header'
import { SearchField } from '../../../shared/ui/search-field'
import { Select } from '../../../shared/ui/select'
import { Switch } from '../../../shared/ui/switch'
import { Textarea } from '../../../shared/ui/textarea'
import { ToggleGroup } from '../../../shared/ui/toggle-group'
import {
  useArchiveProjectIssues,
  useCreateProjectIssue,
  useCreateProjectIssueAttachment,
  useCreateProjectIssueChecklist,
  useCreateProjectIssueComment,
  useDeleteProjectIssue,
  useDeleteProjectIssueAttachment,
  useDeleteProjectIssueChecklist,
  useDeleteProjectIssueComment,
  useProjectIssueActivity,
  useProjectIssueAttachments,
  useProjectIssueChecklists,
  useProjectIssueComments,
  useProjectIssueDetail,
  useProjectIssues,
  useRestoreProjectIssues,
  useToggleProjectIssueChecklist,
  useUpdateProjectIssue,
  useUpdateProjectIssueAssignee,
  useUpdateProjectIssueChecklist,
  useUpdateProjectIssueComment,
  useUpdateProjectIssuePriority,
  useUpdateProjectIssueStatus,
} from '../model/use-project-issue-queries'

type ViewMode = 'table' | 'kanban' | 'card'

type ProjectIssueWorkbenchProps = {
  workspaceId: string
  title?: string
  description?: string
}

function formatDate(value?: string | null, fallback = '-') {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR').format(date)
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function isOverdue(issue: ProjectIssue) {
  if (!issue.dueDate || issue.status === 'CLOSED') return false
  const due = new Date(issue.dueDate)
  if (Number.isNaN(due.getTime())) return false
  return due.getTime() < Date.now()
}

function updateFilter<T extends keyof ProjectIssueFilters>(
  filters: ProjectIssueFilters,
  key: T,
  value: ProjectIssueFilters[T] | '',
) {
  return {
    ...filters,
    page: 1,
    [key]: value === '' ? undefined : value,
  }
}

function Badge({
  className,
  children,
}: {
  className?: string
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

function StatusBadge({ status }: { status: ProjectIssueStatus }) {
  return (
    <Badge className={PROJECT_ISSUE_STATUS_BADGE_CLASS[status]}>
      {PROJECT_ISSUE_STATUS_LABELS[status]}
    </Badge>
  )
}

function PriorityBadge({ priority }: { priority: ProjectIssuePriority }) {
  return (
    <Badge className={PROJECT_ISSUE_PRIORITY_BADGE_CLASS[priority]}>
      {PROJECT_ISSUE_PRIORITY_LABELS[priority]}
    </Badge>
  )
}

function TypeBadge({ issueType }: { issueType: ProjectIssueType }) {
  return (
    <Badge className={PROJECT_ISSUE_TYPE_BADGE_CLASS[issueType]}>
      {PROJECT_ISSUE_TYPE_LABELS[issueType]}
    </Badge>
  )
}

function IssueCard({
  issue,
  onOpen,
}: {
  issue: ProjectIssue
  onOpen: (issueId: string) => void
}) {
  const overdue = isOverdue(issue)

  return (
    <button
      type="button"
      onClick={() => onOpen(issue.id)}
      className="w-full rounded-md border border-surface-border-soft bg-surface-raised p-3 text-left shadow-sm transition-all hover:border-brand-border hover:bg-surface-strong"
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
        <PriorityBadge priority={issue.priority} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <StatusBadge status={issue.status} />
        <TypeBadge issueType={issue.issueType} />
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
          {formatDate(issue.dueDate, '마감 없음')}
        </span>
      </div>
    </button>
  )
}

function IssueToolbar({
  filters,
  users,
  isFetching,
  onFiltersChange,
  onCreate,
  onRefresh,
}: {
  filters: ProjectIssueFilters
  users: AssignableUser[]
  isFetching?: boolean
  onFiltersChange: (filters: ProjectIssueFilters) => void
  onCreate: () => void
  onRefresh: () => void
}) {
  return (
    <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="grid flex-1 gap-3 md:grid-cols-[minmax(200px,1fr)_repeat(4,minmax(120px,auto))]">
          <SearchField
            value={filters.q ?? ''}
            onChange={(event) =>
              onFiltersChange(updateFilter(filters, 'q', event.target.value))
            }
            placeholder="제목 또는 내용 검색"
            hint="Search"
          />
          <CompactSelect
            value={filters.issueType ?? ''}
            onChange={(event) =>
              onFiltersChange(
                updateFilter(
                  filters,
                  'issueType',
                  event.target.value as ProjectIssueType | '',
                ),
              )
            }
            aria-label="이슈 유형 필터"
          >
            <option value="">전체 유형</option>
            {PROJECT_ISSUE_TYPE_ORDER.map((type) => (
              <option key={type} value={type}>
                {PROJECT_ISSUE_TYPE_LABELS[type]}
              </option>
            ))}
          </CompactSelect>
          <CompactSelect
            value={filters.priority ?? ''}
            onChange={(event) =>
              onFiltersChange(
                updateFilter(
                  filters,
                  'priority',
                  event.target.value as ProjectIssuePriority | '',
                ),
              )
            }
            aria-label="우선순위 필터"
          >
            <option value="">전체 우선순위</option>
            {PROJECT_ISSUE_PRIORITY_ORDER.map((priority) => (
              <option key={priority} value={priority}>
                {PROJECT_ISSUE_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </CompactSelect>
          <CompactSelect
            value={filters.assigneeId ?? ''}
            onChange={(event) =>
              onFiltersChange(
                updateFilter(filters, 'assigneeId', event.target.value),
              )
            }
            aria-label="담당자 필터"
          >
            <option value="">전체 담당자</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </CompactSelect>
          <CompactSelect
            value={filters.sort ?? 'order'}
            onChange={(event) =>
              onFiltersChange(
                updateFilter(
                  filters,
                  'sort',
                  event.target.value as ProjectIssueFilters['sort'],
                ),
              )
            }
            aria-label="정렬"
          >
            <option value="order">수동 순서</option>
            <option value="recent">최근 수정</option>
            <option value="oldest">오래된 순</option>
            <option value="dueDate">마감일</option>
            <option value="priority">우선순위</option>
          </CompactSelect>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="새로고침"
            aria-label="새로고침"
            onClick={onRefresh}
            disabled={isFetching}
          >
            <RefreshCcw
              className={clsx('size-4', isFetching && 'animate-spin')}
            />
          </Button>
          <Button type="button" className="h-9" onClick={onCreate}>
            <Plus className="mr-2 size-4" />새 이슈
          </Button>
        </div>
      </div>
    </div>
  )
}

function IssueTable({
  issues,
  users,
  selectedIds,
  onSelectedIdsChange,
  onOpen,
}: {
  issues: ProjectIssue[]
  users: AssignableUser[]
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  onOpen: (issueId: string) => void
}) {
  const updateStatus = useUpdateProjectIssueStatus()
  const updatePriority = useUpdateProjectIssuePriority()
  const updateAssignee = useUpdateProjectIssueAssignee()
  const allSelected = issues.length > 0 && selectedIds.length === issues.length

  const toggleOne = (issueId: string) => {
    onSelectedIdsChange(
      selectedIds.includes(issueId)
        ? selectedIds.filter((id) => id !== issueId)
        : [...selectedIds, issueId],
    )
  }

  return (
    <div className="overflow-hidden rounded-md border border-surface-border-soft">
      <table className="w-full min-w-[980px] border-collapse bg-background text-left">
        <thead className="bg-surface-muted text-xs font-bold text-text-muted">
          <tr>
            <th className="w-12 px-4 py-3">
              <input
                type="checkbox"
                className="size-4 accent-[var(--primary)]"
                checked={allSelected}
                onChange={() =>
                  onSelectedIdsChange(
                    allSelected ? [] : issues.map((issue) => issue.id),
                  )
                }
                aria-label="전체 선택"
              />
            </th>
            <th className="px-4 py-3">이슈</th>
            <th className="px-4 py-3">유형</th>
            <th className="px-4 py-3">상태</th>
            <th className="px-4 py-3">우선순위</th>
            <th className="px-4 py-3">담당자</th>
            <th className="px-4 py-3">마감일</th>
            <th className="px-4 py-3">작성자</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--surface-border-soft)]">
          {issues.map((issue, index) => (
            <tr
              key={issue.id}
              onClick={() => onOpen(issue.id)}
              className={clsx(
                'cursor-pointer transition-colors hover:bg-surface-muted',
                index % 2 === 0 ? 'bg-background' : 'bg-surface-raised',
              )}
            >
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--primary)]"
                  checked={selectedIds.includes(issue.id)}
                  onChange={() => toggleOne(issue.id)}
                  onClick={(event) => event.stopPropagation()}
                  aria-label="이슈 선택"
                />
              </td>
              <td className="px-4 py-3">
                <div className="min-w-[240px]">
                  <p className="line-clamp-1 text-sm font-bold text-text-primary">
                    {issue.title}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-text-muted">
                    {issue.content || issue.id}
                  </p>
                </div>
              </td>
              <td className="px-4 py-3">
                <TypeBadge issueType={issue.issueType} />
              </td>
              <td
                className="px-4 py-3"
                onClick={(event) => event.stopPropagation()}
              >
                <CompactSelect
                  value={issue.status}
                  onChange={(event) =>
                    updateStatus.mutate({
                      id: issue.id,
                      status: event.target.value as ProjectIssueStatus,
                    })
                  }
                  aria-label="상태 변경"
                >
                  {PROJECT_ISSUE_STATUS_ORDER.map((status) => (
                    <option key={status} value={status}>
                      {PROJECT_ISSUE_STATUS_LABELS[status]}
                    </option>
                  ))}
                </CompactSelect>
              </td>
              <td
                className="px-4 py-3"
                onClick={(event) => event.stopPropagation()}
              >
                <CompactSelect
                  value={issue.priority}
                  onChange={(event) =>
                    updatePriority.mutate({
                      id: issue.id,
                      priority: event.target.value as ProjectIssuePriority,
                    })
                  }
                  aria-label="우선순위 변경"
                >
                  {PROJECT_ISSUE_PRIORITY_ORDER.map((priority) => (
                    <option key={priority} value={priority}>
                      {PROJECT_ISSUE_PRIORITY_LABELS[priority]}
                    </option>
                  ))}
                </CompactSelect>
              </td>
              <td
                className="px-4 py-3"
                onClick={(event) => event.stopPropagation()}
              >
                <CompactSelect
                  value={issue.assigneeId ?? ''}
                  onChange={(event) =>
                    updateAssignee.mutate({
                      id: issue.id,
                      assigneeId: event.target.value || null,
                    })
                  }
                  aria-label="담당자 변경"
                >
                  <option value="">미지정</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </CompactSelect>
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary">
                {formatDate(issue.dueDate)}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary">
                {issue.reporterName ?? '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DraggableIssueCard({
  issue,
  onOpen,
}: {
  issue: ProjectIssue
  onOpen: (issueId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: issue.id,
      data: { issue },
    })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={clsx(isDragging && 'opacity-40')}
      {...attributes}
      {...listeners}
    >
      <IssueCard issue={issue} onOpen={onOpen} />
    </div>
  )
}

function KanbanColumn({
  status,
  issues,
  onOpen,
}: {
  status: ProjectIssueStatus
  issues: ProjectIssue[]
  onOpen: (issueId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        'flex min-h-[440px] min-w-[240px] flex-col rounded-md border border-surface-border-soft bg-surface-muted p-3 transition-colors',
        isOver && 'border-brand-border bg-brand-glass',
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-black text-text-primary">
          {PROJECT_ISSUE_STATUS_LABELS[status]}
        </h3>
        <span className="rounded-sm border border-surface-border-soft bg-surface-raised px-2 py-0.5 text-xs font-bold text-text-secondary">
          {issues.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {issues.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-md border border-dashed border-surface-border-soft text-xs text-text-muted">
            이슈 없음
          </div>
        ) : (
          issues.map((issue) => (
            <DraggableIssueCard key={issue.id} issue={issue} onOpen={onOpen} />
          ))
        )}
      </div>
    </section>
  )
}

function IssueKanban({
  issues,
  onOpen,
}: {
  issues: ProjectIssue[]
  onOpen: (issueId: string) => void
}) {
  const [activeIssue, setActiveIssue] = useState<ProjectIssue | null>(null)
  const updateStatus = useUpdateProjectIssueStatus()
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )
  const issuesByStatus = useMemo(
    () =>
      PROJECT_ISSUE_STATUS_ORDER.reduce<
        Record<ProjectIssueStatus, ProjectIssue[]>
      >(
        (acc, status) => {
          acc[status] = issues.filter((issue) => issue.status === status)
          return acc
        },
        { OPEN: [], IN_PROGRESS: [], TESTING: [], CLOSED: [], HOLD: [] },
      ),
    [issues],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const issue = event.active.data.current?.issue as ProjectIssue | undefined
    const targetStatus = event.over?.id as ProjectIssueStatus | undefined
    setActiveIssue(null)
    if (!issue || !targetStatus || issue.status === targetStatus) return
    updateStatus.mutate({ id: issue.id, status: targetStatus })
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => {
        const issue = event.active.data.current?.issue as
          | ProjectIssue
          | undefined
        setActiveIssue(issue ?? null)
      }}
      onDragCancel={() => setActiveIssue(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-3 overflow-x-auto pb-2 xl:grid-cols-5">
        {PROJECT_ISSUE_STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            issues={issuesByStatus[status]}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay>
        {activeIssue ? (
          <div className="w-[260px]">
            <IssueCard issue={activeIssue} onOpen={() => undefined} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function IssueCardGrid({
  issues,
  onOpen,
}: {
  issues: ProjectIssue[]
  onOpen: (issueId: string) => void
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {issues.map((issue) => (
        <IssueCard key={issue.id} issue={issue} onOpen={onOpen} />
      ))}
    </div>
  )
}

function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number
  pageSize: number
  total: number
  onChange: (next: Pick<ProjectIssueFilters, 'page' | 'pageSize'>) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end = Math.min(safePage * pageSize, total)

  return (
    <div className="flex flex-col gap-3 rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-text-secondary">
        <span className="font-bold text-text-primary">
          {start}-{end}
        </span>
        <span> / {total}개</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CompactSelect
          value={String(pageSize)}
          wrapperClassName="w-28"
          className="h-9 pl-3 pr-9 text-sm font-bold"
          onChange={(event) =>
            onChange({ page: 1, pageSize: Number(event.target.value) })
          }
          aria-label="페이지 크기"
        >
          {[10, 20, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size}개씩
            </option>
          ))}
        </CompactSelect>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange({ page: 1, pageSize })}
            disabled={safePage <= 1}
            aria-label="첫 페이지"
          >
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange({ page: safePage - 1, pageSize })}
            disabled={safePage <= 1}
            aria-label="이전 페이지"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="flex h-9 min-w-20 items-center justify-center rounded-md border border-surface-border-soft bg-surface-raised px-3 text-xs font-bold text-text-secondary">
            {safePage} / {totalPages}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange({ page: safePage + 1, pageSize })}
            disabled={safePage >= totalPages}
            aria-label="다음 페이지"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange({ page: totalPages, pageSize })}
            disabled={safePage >= totalPages}
            aria-label="마지막 페이지"
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function IssueFormDialog({
  workspaceId,
  open,
  users,
  onOpenChange,
}: {
  workspaceId: string
  open: boolean
  users: AssignableUser[]
  onOpenChange: (open: boolean) => void
}) {
  const createIssue = useCreateProjectIssue()
  const [form, setForm] = useState({
    title: '',
    content: '',
    issueType: 'BUG' as ProjectIssueType,
    status: 'OPEN' as ProjectIssueStatus,
    priority: 'MEDIUM' as ProjectIssuePriority,
    assigneeId: '',
    dueDate: '',
  })

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.title.trim()) return
    await createIssue.mutateAsync({
      projectId: workspaceId,
      title: form.title.trim(),
      content: form.content,
      issueType: form.issueType,
      status: form.status,
      priority: form.priority,
      assigneeId: form.assigneeId || null,
      dueDate: form.dueDate || null,
    })
    setForm({
      title: '',
      content: '',
      issueType: 'BUG',
      status: 'OPEN',
      priority: 'MEDIUM',
      assigneeId: '',
      dueDate: '',
    })
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-50 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-surface-border-soft p-5 shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-lg font-black text-text-primary">
                새 프로젝트 이슈
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-text-secondary">
                프로젝트 단위로 추적할 이슈를 등록합니다.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="ui-icon-button size-8"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-text-secondary">
                제목
              </span>
              <Input
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                autoFocus
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-text-secondary">
                내용
              </span>
              <Textarea
                value={form.content}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, content: event.target.value }))
                }
                className="min-h-32"
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                label="유형"
                value={form.issueType}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    issueType: value as ProjectIssueType,
                  }))
                }
              >
                {PROJECT_ISSUE_TYPE_ORDER.map((type) => (
                  <option key={type} value={type}>
                    {PROJECT_ISSUE_TYPE_LABELS[type]}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="상태"
                value={form.status}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    status: value as ProjectIssueStatus,
                  }))
                }
              >
                {PROJECT_ISSUE_STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {PROJECT_ISSUE_STATUS_LABELS[status]}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="우선순위"
                value={form.priority}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    priority: value as ProjectIssuePriority,
                  }))
                }
              >
                {PROJECT_ISSUE_PRIORITY_ORDER.map((priority) => (
                  <option key={priority} value={priority}>
                    {PROJECT_ISSUE_PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="담당자"
                value={form.assigneeId}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, assigneeId: value }))
                }
              >
                <option value="">미지정</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </SelectField>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-text-secondary">
                  마감일
                </span>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      dueDate: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={createIssue.isPending}>
                등록
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-text-secondary">{label}</span>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </Select>
    </label>
  )
}

function ChecklistPanel({ issueId }: { issueId: string | null }) {
  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const checklistsQuery = useProjectIssueChecklists(issueId)
  const createChecklist = useCreateProjectIssueChecklist(issueId)
  const updateChecklist = useUpdateProjectIssueChecklist(issueId)
  const toggleChecklist = useToggleProjectIssueChecklist(issueId)
  const deleteChecklist = useDeleteProjectIssueChecklist(issueId)
  const items = checklistsQuery.data ?? []

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!content.trim()) return
    await createChecklist.mutateAsync(content.trim())
    setContent('')
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="체크리스트 추가"
        />
        <Button type="submit" size="icon" aria-label="추가">
          <Plus className="size-4" />
        </Button>
      </form>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-surface-border-soft px-3 py-8 text-center text-sm text-text-muted">
            체크리스트가 없습니다.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-md border border-surface-border-soft bg-surface-raised px-3 py-2"
            >
              <button
                type="button"
                onClick={() => toggleChecklist.mutate(item.id)}
                className="flex size-6 shrink-0 items-center justify-center rounded-sm border border-surface-border-soft bg-surface-muted text-brand-primary"
                aria-label="체크 토글"
              >
                {item.completed ? <Check className="size-4" /> : null}
              </button>
              {editingId === item.id ? (
                <Input
                  value={editingContent}
                  onChange={(event) => setEditingContent(event.target.value)}
                  className="h-9 flex-1"
                />
              ) : (
                <span
                  className={clsx(
                    'min-w-0 flex-1 text-sm',
                    item.completed
                      ? 'text-text-muted line-through'
                      : 'text-text-primary',
                  )}
                >
                  {item.content}
                </span>
              )}
              {editingId === item.id ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm-icon"
                  onClick={() => {
                    if (!editingContent.trim()) return
                    updateChecklist.mutate({
                      checklistId: item.id,
                      body: { content: editingContent.trim() },
                    })
                    setEditingId(null)
                    setEditingContent('')
                  }}
                  aria-label="저장"
                >
                  <Check className="size-3.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm-icon"
                  onClick={() => {
                    setEditingId(item.id)
                    setEditingContent(item.content)
                  }}
                  aria-label="수정"
                >
                  <Pencil className="size-3.5" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm-icon"
                tone="danger"
                onClick={() => deleteChecklist.mutate(item.id)}
                aria-label="삭제"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function CommentsPanel({ issueId }: { issueId: string | null }) {
  const [content, setContent] = useState('')
  const commentsQuery = useProjectIssueComments(issueId)
  const createComment = useCreateProjectIssueComment(issueId)
  const updateComment = useUpdateProjectIssueComment(issueId)
  const deleteComment = useDeleteProjectIssueComment(issueId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const comments = commentsQuery.data ?? []

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!content.trim()) return
    await createComment.mutateAsync(content.trim())
    setContent('')
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="min-h-28"
          placeholder="댓글을 입력하세요."
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={createComment.isPending}>
            <Send className="mr-2 size-4" />
            등록
          </Button>
        </div>
      </form>
      <div className="space-y-3">
        {comments.length === 0 ? (
          <div className="rounded-md border border-dashed border-surface-border-soft px-3 py-8 text-center text-sm text-text-muted">
            댓글이 없습니다.
          </div>
        ) : (
          comments.map((comment) => (
            <article
              key={comment.id}
              className="rounded-md border border-surface-border-soft bg-surface-raised p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-text-primary">
                    {comment.userName ?? '알 수 없음'}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatDateTime(comment.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm-icon"
                    onClick={() => {
                      setEditingId(comment.id)
                      setEditingContent(comment.content)
                    }}
                    aria-label="수정"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm-icon"
                    tone="danger"
                    onClick={() => deleteComment.mutate(comment.id)}
                    aria-label="삭제"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              {editingId === comment.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editingContent}
                    onChange={(event) => setEditingContent(event.target.value)}
                    className="min-h-24"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      취소
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (!editingContent.trim()) return
                        updateComment.mutate({
                          commentId: comment.id,
                          content: editingContent.trim(),
                        })
                        setEditingId(null)
                        setEditingContent('')
                      }}
                    >
                      저장
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                  {comment.content}
                </p>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  )
}

function AttachmentsPanel({ issueId }: { issueId: string | null }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const attachmentsQuery = useProjectIssueAttachments(issueId)
  const createAttachment = useCreateProjectIssueAttachment(issueId)
  const deleteAttachment = useDeleteProjectIssueAttachment(issueId)
  const attachments = attachmentsQuery.data ?? []

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setIsUploading(true)
    try {
      for (const file of Array.from(files)) {
        const fileUrl = await uploadFile(file)
        await createAttachment.mutateAsync({
          fileName: file.name,
          fileUrl,
          contentType: file.type || 'application/octet-stream',
          fileSize: file.size,
        })
      }
      toast.success('첨부가 업로드되었습니다.')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '첨부 업로드에 실패했습니다.',
      )
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="mr-2 size-4" />
          {isUploading ? '업로드 중' : '첨부 추가'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => handleUpload(event.target.files)}
        />
      </div>
      {attachments.length === 0 ? (
        <div className="rounded-md border border-dashed border-surface-border-soft px-3 py-8 text-center text-sm text-text-muted">
          첨부된 파일이 없습니다.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {attachments.map((attachment) => {
            const isImage = attachment.contentType.startsWith('image/')
            return (
              <article
                key={attachment.id}
                className="overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised"
              >
                {isImage ? (
                  <img
                    src={attachment.fileUrl}
                    alt={attachment.fileName}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-surface-muted text-text-muted">
                    <File className="size-10" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-3 p-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted text-brand-primary">
                      {isImage ? (
                        <ImageIcon className="size-4" />
                      ) : (
                        <Paperclip className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-text-primary">
                        {attachment.fileName}
                      </p>
                      <p className="text-xs text-text-muted">
                        {formatDateTime(attachment.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm-icon"
                    tone="danger"
                    onClick={() => deleteAttachment.mutate(attachment.id)}
                    aria-label="첨부 삭제"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ActivityPanel({ issueId }: { issueId: string | null }) {
  const activityQuery = useProjectIssueActivity(issueId)
  const activities = activityQuery.data ?? []
  return (
    <div className="space-y-3">
      {activities.length === 0 ? (
        <div className="rounded-md border border-dashed border-surface-border-soft px-3 py-8 text-center text-sm text-text-muted">
          활동 로그가 없습니다.
        </div>
      ) : (
        activities.map((activity) => (
          <div
            key={activity.id}
            className="flex gap-3 rounded-md border border-surface-border-soft bg-surface-raised p-3"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
              <Activity className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-text-secondary">
                  {PROJECT_ISSUE_ACTIVITY_LABELS[activity.activityType]}
                </span>
                <span className="text-xs text-text-muted">
                  {formatDateTime(activity.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-sm text-text-primary">
                {activity.message ?? '프로젝트 이슈 이력이 기록되었습니다.'}
              </p>
              {activity.fromValue || activity.toValue ? (
                <p className="mt-1 text-xs text-text-secondary">
                  {activity.fromValue ?? '-'} → {activity.toValue ?? '-'}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-text-muted">
                {activity.actorName ?? '시스템'}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function DetailDialog({
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
  const issueQuery = useProjectIssueDetail(issueId, open)
  const updateIssue = useUpdateProjectIssue()
  const deleteIssue = useDeleteProjectIssue()
  const archiveIssues = useArchiveProjectIssues()
  const restoreIssues = useRestoreProjectIssues()
  const issue = issueQuery.data
  const [draft, setDraft] = useState<{
    issueId: string
    values: {
      title: string
      content: string
      issueType: ProjectIssueType
      status: ProjectIssueStatus
      priority: ProjectIssuePriority
      assigneeId: string
      dueDate: string
    }
  } | null>(null)
  const form = issue
    ? draft?.issueId === issue.id
      ? draft.values
      : {
          title: issue.title,
          content: issue.content,
          issueType: issue.issueType,
          status: issue.status,
          priority: issue.priority,
          assigneeId: issue.assigneeId ?? '',
          dueDate: issue.dueDate?.slice(0, 10) ?? '',
        }
    : null

  const updateDraft = (changes: Partial<NonNullable<typeof form>>) => {
    if (!issue || !form) return
    setDraft({ issueId: issue.id, values: { ...form, ...changes } })
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

  const handleArchive = async () => {
    if (!issue) return
    if (issue.archived) await restoreIssues.mutateAsync([issue.id])
    else await archiveIssues.mutateAsync([issue.id])
    setDraft(null)
    onOpenChange(false)
  }

  const handleDelete = async () => {
    if (!issue) return
    await deleteIssue.mutateAsync(issue.id)
    setDraft(null)
    onOpenChange(false)
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setDraft(null)
        onOpenChange(next)
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[min(960px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-surface-border-soft shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft bg-surface-muted px-5 py-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {issue ? (
                  <>
                    <StatusBadge status={issue.status} />
                    <PriorityBadge priority={issue.priority} />
                    <TypeBadge issueType={issue.issueType} />
                  </>
                ) : null}
              </div>
              <Dialog.Title className="truncate text-lg font-black text-text-primary">
                {issue?.title ?? '프로젝트 이슈 상세'}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-text-secondary">
                작성자 {issue?.reporterName ?? '-'} · 생성{' '}
                {formatDateTime(issue?.createdAt)}
              </Dialog.Description>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {issue ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleArchive}
                  >
                    {issue.archived ? (
                      <ArchiveRestore className="mr-2 size-4" />
                    ) : (
                      <Archive className="mr-2 size-4" />
                    )}
                    {issue.archived ? '복원' : '보관'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm-icon"
                    tone="danger"
                    onClick={handleDelete}
                    aria-label="삭제"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              ) : null}
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="ui-icon-button size-8"
                  aria-label="닫기"
                >
                  <X className="size-4" />
                </button>
              </Dialog.Close>
            </div>
          </div>
          {issueQuery.isLoading || !form ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-text-muted">
              프로젝트 이슈 상세를 불러오는 중입니다.
            </div>
          ) : !issue ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-text-muted">
              프로젝트 이슈를 찾을 수 없습니다.
            </div>
          ) : (
            <Tabs.Root
              defaultValue="overview"
              className="flex min-h-0 flex-1 flex-col"
            >
              <Tabs.List className="flex shrink-0 gap-1 border-b border-surface-border-soft bg-surface-raised px-4 pt-3">
                {[
                  ['overview', '개요'],
                  ['checklist', '체크리스트'],
                  ['attachments', '첨부'],
                  ['comments', '댓글'],
                  ['activity', '활동'],
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
                      <span className="text-xs font-bold text-text-secondary">
                        제목
                      </span>
                      <Input
                        value={form.title}
                        onChange={(event) =>
                          updateDraft({ title: event.target.value })
                        }
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold text-text-secondary">
                        내용
                      </span>
                      <Textarea
                        value={form.content}
                        onChange={(event) =>
                          updateDraft({ content: event.target.value })
                        }
                        className="min-h-36 resize-y"
                      />
                    </label>
                    <div className="grid gap-3 md:grid-cols-2">
                      <SelectField
                        label="유형"
                        value={form.issueType}
                        onChange={(value) =>
                          updateDraft({ issueType: value as ProjectIssueType })
                        }
                      >
                        {PROJECT_ISSUE_TYPE_ORDER.map((type) => (
                          <option key={type} value={type}>
                            {PROJECT_ISSUE_TYPE_LABELS[type]}
                          </option>
                        ))}
                      </SelectField>
                      <SelectField
                        label="상태"
                        value={form.status}
                        onChange={(value) =>
                          updateDraft({ status: value as ProjectIssueStatus })
                        }
                      >
                        {PROJECT_ISSUE_STATUS_ORDER.map((status) => (
                          <option key={status} value={status}>
                            {PROJECT_ISSUE_STATUS_LABELS[status]}
                          </option>
                        ))}
                      </SelectField>
                      <SelectField
                        label="우선순위"
                        value={form.priority}
                        onChange={(value) =>
                          updateDraft({
                            priority: value as ProjectIssuePriority,
                          })
                        }
                      >
                        {PROJECT_ISSUE_PRIORITY_ORDER.map((priority) => (
                          <option key={priority} value={priority}>
                            {PROJECT_ISSUE_PRIORITY_LABELS[priority]}
                          </option>
                        ))}
                      </SelectField>
                      <SelectField
                        label="담당자"
                        value={form.assigneeId}
                        onChange={(value) => updateDraft({ assigneeId: value })}
                      >
                        <option value="">미지정</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </SelectField>
                      <label className="block space-y-1.5">
                        <span className="text-xs font-bold text-text-secondary">
                          마감일
                        </span>
                        <Input
                          type="date"
                          value={form.dueDate}
                          onChange={(event) =>
                            updateDraft({ dueDate: event.target.value })
                          }
                        />
                      </label>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={updateIssue.isPending}>
                        <Save className="mr-2 size-4" />
                        저장
                      </Button>
                    </div>
                  </form>
                </Tabs.Content>
                <Tabs.Content value="checklist">
                  <ChecklistPanel issueId={issue.id} />
                </Tabs.Content>
                <Tabs.Content value="attachments">
                  <AttachmentsPanel issueId={issue.id} />
                </Tabs.Content>
                <Tabs.Content value="comments">
                  <CommentsPanel issueId={issue.id} />
                </Tabs.Content>
                <Tabs.Content value="activity">
                  <ActivityPanel issueId={issue.id} />
                </Tabs.Content>
              </div>
            </Tabs.Root>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function ProjectIssueWorkbench({
  workspaceId,
  title = '프로젝트 이슈',
  description = '프로젝트 전체 이슈, 담당자, 체크리스트와 댓글을 관리합니다.',
}: ProjectIssueWorkbenchProps) {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [filters, setFilters] = useState<ProjectIssueFilters>({
    projectId: workspaceId,
    archived: false,
    sort: 'order',
    page: 1,
    pageSize: 50,
  })
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const normalizedFilters = useMemo(
    () => ({ ...filters, projectId: workspaceId }),
    [filters, workspaceId],
  )
  const issuesQuery = useProjectIssues(normalizedFilters)
  const usersQuery = useAssignableUsers()
  const archiveIssues = useArchiveProjectIssues()
  const restoreIssues = useRestoreProjectIssues()
  const issues = issuesQuery.data?.items ?? []
  const total = issuesQuery.data?.total ?? 0
  const users = usersQuery.data ?? []
  const page = normalizedFilters.page ?? 1
  const pageSize = normalizedFilters.pageSize ?? 50

  const statusCounts = PROJECT_ISSUE_STATUS_ORDER.reduce<
    Record<ProjectIssueStatus, number>
  >(
    (acc, status) => {
      acc[status] = issues.filter((issue) => issue.status === status).length
      return acc
    },
    { OPEN: 0, IN_PROGRESS: 0, TESTING: 0, CLOSED: 0, HOLD: 0 },
  )

  const openDetail = (issueId: string) => {
    setSelectedIssueId(issueId)
    setDetailOpen(true)
  }

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) return
    const action = normalizedFilters.archived ? restoreIssues : archiveIssues
    await action.mutateAsync(selectedIds)
    setSelectedIds([])
  }

  return (
    <section className="space-y-4 ui-page-bg pb-8">
      <PageHeader
        icon={ShieldAlert}
        title={title}
        description={description}
        actions={
          <button
            type="button"
            className="inline-flex h-8 items-center justify-center rounded-sm border border-background bg-background px-3 text-sm font-semibold text-text-primary transition hover:bg-surface-raised"
            onClick={() => navigate({ to: '/project-issues', search: {} })}
          >
            <ChevronLeft className="mr-1.5 size-4" />
            워크스페이스
          </button>
        }
      />
      <IssueToolbar
        filters={normalizedFilters}
        users={users}
        isFetching={issuesQuery.isFetching}
        onFiltersChange={setFilters}
        onCreate={() => setCreateOpen(true)}
        onRefresh={() => issuesQuery.refetch()}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({ ...prev, status: undefined, page: 1 }))
            }
            className={clsx(
              'inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-md border px-3 text-xs font-bold transition-colors',
              !normalizedFilters.status
                ? 'border-text-primary bg-text-primary text-background'
                : 'border-surface-border bg-background text-text-secondary hover:bg-surface-muted',
            )}
          >
            전체 {total}
          </button>
          {PROJECT_ISSUE_STATUS_ORDER.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  status: prev.status === status ? undefined : status,
                  page: 1,
                }))
              }
              className={clsx(
                'inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-3 text-xs transition-colors',
                normalizedFilters.status === status
                  ? 'border-text-primary bg-text-primary font-bold text-background'
                  : 'border-surface-border bg-background text-text-secondary hover:bg-surface-muted',
              )}
            >
              {PROJECT_ISSUE_STATUS_LABELS[status]}
              <span className="font-black">{statusCounts[status]}</span>
            </button>
          ))}
          <div className="ml-1 border-l border-surface-border-soft pl-3">
            <Switch
              checked={Boolean(normalizedFilters.archived)}
              onCheckedChange={(checked) =>
                setFilters((prev) => ({ ...prev, archived: checked, page: 1 }))
              }
              label={
                normalizedFilters.archived ? '보관함 보기' : '진행 이슈 보기'
              }
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9"
            disabled={selectedIds.length === 0}
            onClick={handleBulkAction}
          >
            {normalizedFilters.archived ? (
              <ArchiveRestore className="mr-1.5 size-3.5" />
            ) : (
              <Archive className="mr-1.5 size-3.5" />
            )}
            {selectedIds.length > 0 ? `${selectedIds.length}개 ` : ''}
            {normalizedFilters.archived ? '선택 복원' : '선택 보관'}
          </Button>
          <ToggleGroup<ViewMode>
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: 'table', label: '테이블' },
              { value: 'kanban', label: '칸반' },
              { value: 'card', label: '카드' },
            ]}
          />
        </div>
      </div>

      {issuesQuery.error ? (
        <div className="flex items-start gap-3 rounded-md border border-destructive bg-danger-glass px-4 py-3 text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold">
              프로젝트 이슈를 불러오지 못했습니다.
            </p>
            <p className="mt-1 text-xs">
              {issuesQuery.error instanceof Error
                ? issuesQuery.error.message
                : '잠시 후 다시 시도하세요.'}
            </p>
          </div>
        </div>
      ) : null}

      {!issuesQuery.isLoading && !issuesQuery.error && issues.length === 0 ? (
        <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted px-4 py-16 text-center">
          <p className="text-sm text-text-muted">
            {normalizedFilters.archived
              ? '보관된 프로젝트 이슈가 없습니다.'
              : '등록된 프로젝트 이슈가 없습니다.'}
          </p>
          {!normalizedFilters.archived ? (
            <Button
              type="button"
              className="mt-4"
              onClick={() => setCreateOpen(true)}
            >
              새 이슈 만들기
            </Button>
          ) : null}
        </div>
      ) : null}

      {issues.length > 0 ? (
        <>
          {viewMode === 'table' ? (
            <IssueTable
              issues={issues}
              users={users}
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
              onOpen={openDetail}
            />
          ) : null}
          {viewMode === 'kanban' ? (
            <IssueKanban issues={issues} onOpen={openDetail} />
          ) : null}
          {viewMode === 'card' ? (
            <IssueCardGrid issues={issues} onOpen={openDetail} />
          ) : null}
        </>
      ) : null}

      {total > 0 ? (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
        />
      ) : null}

      <IssueFormDialog
        workspaceId={workspaceId}
        open={createOpen}
        users={users}
        onOpenChange={setCreateOpen}
      />
      <DetailDialog
        issueId={selectedIssueId}
        open={detailOpen}
        users={users}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setSelectedIssueId(null)
        }}
      />
    </section>
  )
}
