import { useEffect, useMemo, useState, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type RowSelectionState,
} from '@tanstack/react-table'
import { Code2, Copy, ExternalLink, FileText, GripVertical, Loader2, Search, X } from 'lucide-react'
import { clsx } from 'clsx'
import { toast } from 'sonner'
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_ORDER,
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
  TASK_STATUS_BADGE_CLASS,
  TASK_PRIORITY_BADGE_CLASS,
} from '../../../entities/task/model/constants'
import {
  useCodeReviewDetail,
  useCodeReviewList,
  useLinkCodeReviewToTask,
  useTaskCodeReviewList,
} from '../../../entities/code-review/api/code-review-api'
import type { CodeReviewDetail, CodeReviewFinding, CodeReviewSummary } from '../../../entities/code-review/model/types'
import type { Task, TaskPriority, TaskStatus } from '../../../entities/task/model/types'
import type { AssignableUser } from '../../../shared/api/users'
import { Button } from '../../../shared/ui/button'
import { CompactSelect } from '../../../shared/ui/compact-select'
import {
  useReorderTasks,
  useUpdateTaskAssignee,
  useUpdateTaskPriority,
  useUpdateTaskStatus,
} from '../model/use-task-queries'
import { TaskTypeBadge } from './task-badges'

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
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

async function copyText(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(successMessage)
  } catch {
    toast.error('복사에 실패했습니다.')
  }
}

function TaskReviewGuideDialog({
  task,
  onOpenChange,
}: {
  task: Task | null
  onOpenChange: (open: boolean) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null)
  const reviewsQuery = useTaskCodeReviewList(task?.id ?? null)
  const reviews = reviewsQuery.data?.items ?? []
  const activeReview = reviews.find((review) => review.id === activeReviewId) ?? reviews[0] ?? null
  const detailQuery = useCodeReviewDetail(activeReview?.id ?? null)

  useEffect(() => {
    setActiveReviewId(null)
    setPickerOpen(false)
  }, [task?.id])

  useEffect(() => {
    if (!activeReviewId && reviews[0]) setActiveReviewId(reviews[0].id)
  }, [activeReviewId, reviews])

  return (
    <Dialog.Root open={Boolean(task)} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 ui-overlay" />
        <Dialog.Content className="glass-panel fixed inset-3 z-[60] flex flex-col overflow-hidden rounded-lg border border-surface-border-soft shadow-2xl md:inset-6">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft bg-surface-muted px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-black text-text-primary">
                업무 코드 리뷰
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-text-secondary">
                업무 기본 정보와 연결된 코드 리뷰를 한 화면에서 확인합니다.
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

          {task ? (
            <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-surface-border-soft overflow-hidden lg:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.4fr)] lg:divide-x lg:divide-y-0">
              <aside className="min-h-0 overflow-y-auto bg-surface-raised p-5">
                <TaskReviewTaskInfo task={task} />
              </aside>

              <main className="min-h-0 overflow-y-auto bg-background p-5">
                <TaskReviewPreview
                  task={task}
                  reviews={reviews}
                  activeReviewId={activeReview?.id ?? null}
                  detail={detailQuery.data ?? null}
                  isLoading={reviewsQuery.isLoading}
                  isDetailLoading={detailQuery.isLoading}
                  onSelectReview={setActiveReviewId}
                  onOpenPicker={() => setPickerOpen(true)}
                />
              </main>
              {pickerOpen ? (
                <CodeReviewPickerDialog
                  task={task}
                  linkedReviews={reviews}
                  onClose={() => setPickerOpen(false)}
                  onLinked={(reviewId) => {
                    setActiveReviewId(reviewId)
                    void reviewsQuery.refetch()
                  }}
                />
              ) : null}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function TaskReviewTaskInfo({ task }: { task: Task }) {
  return (
    <section className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
      <div className="flex items-center gap-2">
        <FileText className="size-4 text-brand-primary" />
        <h3 className="text-sm font-black text-text-primary">
          업무 기본 정보
        </h3>
      </div>
      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs font-bold text-text-muted">제목</p>
          <p className="mt-1 text-base font-black text-text-primary">
            {task.title}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold text-text-muted">업무 ID</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="min-w-0 flex-1 break-all rounded-md border border-surface-border-soft bg-surface-raised p-2 font-mono text-xs text-text-primary">
              {task.id}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => copyText(task.id, '업무 ID를 복사했습니다.')}
            >
              <Copy className="mr-1.5 size-3.5" />
              복사
            </Button>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border border-surface-border-soft bg-surface-raised p-3">
            <dt className="text-xs font-bold text-text-muted">상태</dt>
            <dd className="mt-1 font-bold text-text-primary">
              {TASK_STATUS_LABELS[task.status]}
            </dd>
          </div>
          <div className="rounded-md border border-surface-border-soft bg-surface-raised p-3">
            <dt className="text-xs font-bold text-text-muted">우선순위</dt>
            <dd className="mt-1 font-bold text-text-primary">
              {TASK_PRIORITY_LABELS[task.priority]}
            </dd>
          </div>
          <div className="rounded-md border border-surface-border-soft bg-surface-raised p-3">
            <dt className="text-xs font-bold text-text-muted">담당자</dt>
            <dd className="mt-1 font-bold text-text-primary">
              {task.assigneeName ?? '미지정'}
            </dd>
          </div>
          <div className="rounded-md border border-surface-border-soft bg-surface-raised p-3">
            <dt className="text-xs font-bold text-text-muted">마감일</dt>
            <dd className="mt-1 font-bold text-text-primary">
              {formatDate(task.dueDate)}
            </dd>
          </div>
        </dl>
        <div>
          <p className="text-xs font-bold text-text-muted">내용</p>
          <p className="mt-1 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-raised p-3 text-sm leading-6 text-text-secondary">
            {task.content || '업무 내용이 없습니다.'}
          </p>
        </div>
      </div>
    </section>
  )
}

function TaskReviewPreview({
  task,
  reviews,
  activeReviewId,
  detail,
  isLoading,
  isDetailLoading,
  onSelectReview,
  onOpenPicker,
}: {
  task: Task
  reviews: CodeReviewSummary[]
  activeReviewId: string | null
  detail: CodeReviewDetail | null
  isLoading: boolean
  isDetailLoading: boolean
  onSelectReview: (reviewId: string) => void
  onOpenPicker: () => void
}) {
  if (isLoading) {
    return (
      <TaskReviewPanelFrame task={task} reviewCount={0} onOpenPicker={onOpenPicker}>
        <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-text-muted">
          <Loader2 className="size-4 animate-spin" />
          코드 리뷰를 불러오는 중입니다.
        </div>
      </TaskReviewPanelFrame>
    )
  }

  if (!reviews.length) {
    return (
      <TaskReviewPanelFrame task={task} reviewCount={0} onOpenPicker={onOpenPicker}>
        <div className="flex min-h-64 items-center justify-center">
          <div className="w-full max-w-xl rounded-md border border-surface-border-soft bg-surface-muted p-6 text-center">
            <Code2 className="mx-auto size-8 text-brand-primary" />
            <h3 className="mt-3 text-base font-black text-text-primary">
              연결된 코드 리뷰가 없습니다.
            </h3>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              오른쪽 상단의 코드 리뷰 가져오기로 이미 등록된 리뷰를 이 업무와 연결하세요.
            </p>
          </div>
        </div>
      </TaskReviewPanelFrame>
    )
  }

  return (
    <TaskReviewPanelFrame task={task} reviewCount={reviews.length} onOpenPicker={onOpenPicker}>
      <div className="space-y-4">
        {reviews.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {reviews.map((review) => (
              <button
                key={review.id}
                type="button"
                onClick={() => onSelectReview(review.id)}
                className={clsx(
                  'max-w-72 truncate rounded-sm border px-3 py-1.5 text-xs font-bold transition-colors',
                  review.id === activeReviewId
                    ? 'border-brand-border bg-brand-glass text-brand-primary'
                    : 'border-surface-border-soft bg-surface-muted text-text-secondary hover:bg-surface-strong',
                )}
                title={review.title}
              >
                {review.title}
              </button>
            ))}
          </div>
        ) : null}

        {isDetailLoading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted text-sm text-text-muted">
            <Loader2 className="size-4 animate-spin" />
            코드 리뷰 상세를 불러오는 중입니다.
          </div>
        ) : detail ? (
          <TaskReviewDetailArticle detail={detail} />
        ) : (
          <div className="rounded-md border border-surface-border-soft bg-surface-muted p-8 text-center text-sm text-text-muted">
            코드 리뷰 상세를 찾을 수 없습니다.
          </div>
        )}
      </div>
    </TaskReviewPanelFrame>
  )
}

function TaskReviewPanelFrame({
  task,
  reviewCount,
  onOpenPicker,
  children,
}: {
  task: Task
  reviewCount: number
  onOpenPicker: () => void
  children: ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-black text-text-primary">
              연결된 코드 리뷰
            </h3>
            <p className="mt-1 truncate text-sm text-text-secondary">
              {task.title}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-1 text-xs font-bold text-brand-primary">
              리뷰 {reviewCount}
            </span>
            <Button type="button" variant="secondary" size="sm" onClick={onOpenPicker}>
              <Search className="mr-1.5 size-3.5" />
              코드 리뷰 가져오기
            </Button>
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}

function riskLabel(riskLevel: CodeReviewSummary['riskLevel']) {
  if (riskLevel === 'high') return '높음'
  if (riskLevel === 'medium') return '중간'
  return '낮음'
}

function riskClassName(riskLevel: CodeReviewSummary['riskLevel']) {
  if (riskLevel === 'high') return 'border-danger-border bg-danger-glass text-danger-500'
  if (riskLevel === 'medium') return 'border-brand-border bg-brand-glass text-brand-primary'
  return 'border-surface-border-soft bg-surface-raised text-text-secondary'
}

function TaskReviewDetailArticle({ detail }: { detail: CodeReviewDetail }) {
  return (
    <article className="rounded-md border border-surface-border-soft bg-surface-muted">
      <header className="border-b border-surface-border-soft p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-lg font-black text-text-primary">
              {detail.title}
            </h4>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-text-muted">
              <span>{detail.repository}</span>
              <span>{detail.createdByName}</span>
              <span>{formatDateTime(detail.createdAt)}</span>
              <span className={clsx('rounded-sm border px-2 py-0.5', riskClassName(detail.riskLevel))}>
                위험도 {riskLabel(detail.riskLevel)}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={detail.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center justify-center rounded-sm border border-surface-border-soft bg-surface-raised px-3 text-xs font-bold text-text-primary hover:bg-surface-strong"
            >
              <ExternalLink className="mr-1.5 size-3.5" />
              원본
            </a>
            <a
              href={`/code-reviews/${detail.id}`}
              className="inline-flex h-8 items-center justify-center rounded-sm border border-surface-border-soft bg-surface-raised px-3 text-xs font-bold text-text-primary hover:bg-surface-strong"
            >
              <ExternalLink className="mr-1.5 size-3.5" />
              상세
            </a>
          </div>
        </div>
      </header>
      <div className="space-y-5 p-4">
        <section>
          <h5 className="text-sm font-black text-text-primary">전체 요약</h5>
          <p className="mt-2 whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-raised p-3 text-sm leading-6 text-text-secondary">
            {detail.summary}
          </p>
        </section>
        <section>
          <h5 className="text-sm font-black text-text-primary">변경 파일</h5>
          <div className="mt-2 rounded-md border border-surface-border-soft bg-surface-raised p-3">
            {detail.changedFiles.length ? (
              <ul className="space-y-1 font-mono text-xs text-text-secondary">
                {detail.changedFiles.slice(0, 8).map((file) => (
                  <li key={file.path} className="break-all">
                    {file.path}
                    <span className="ml-2 text-text-muted">
                      +{file.additions}/-{file.deletions}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">변경 파일 정보가 없습니다.</p>
            )}
          </div>
        </section>
        <section>
          <h5 className="text-sm font-black text-text-primary">검토 항목</h5>
          <div className="mt-2 space-y-2">
            {detail.findings.length ? (
              detail.findings.slice(0, 6).map((finding, index) => (
                <TaskReviewFindingCard key={`${finding.title}-${index}`} finding={finding} />
              ))
            ) : (
              <p className="rounded-md border border-surface-border-soft bg-surface-raised p-3 text-sm text-text-muted">
                평가 항목이 없습니다.
              </p>
            )}
          </div>
        </section>
      </div>
    </article>
  )
}

function TaskReviewFindingCard({ finding }: { finding: CodeReviewFinding }) {
  return (
    <div className="rounded-md border border-surface-border-soft bg-surface-raised p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[11px] font-bold text-brand-primary">
            {finding.category ?? 'review'}
          </span>
          <h6 className="min-w-0 text-sm font-black text-text-primary">
            {finding.title}
          </h6>
        </div>
        <span className={clsx('rounded-sm border px-2 py-0.5 text-[11px] font-bold', riskClassName(finding.severity))}>
          {riskLabel(finding.severity)}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
        {finding.body}
      </p>
      <p className="mt-2 text-sm font-semibold text-text-primary">
        권장: {finding.recommendation}
      </p>
    </div>
  )
}

function CodeReviewPickerDialog({
  task,
  linkedReviews,
  onClose,
  onLinked,
}: {
  task: Task
  linkedReviews: CodeReviewSummary[]
  onClose: () => void
  onLinked: (reviewId: string) => void
}) {
  const [q, setQ] = useState('')
  const reviewsQuery = useCodeReviewList({ q, page: 1, pageSize: 20 })
  const linkMutation = useLinkCodeReviewToTask()
  const linkedIds = new Set(linkedReviews.map((review) => review.id))

  async function connect(reviewId: string) {
    await linkMutation.mutateAsync({ reviewId, taskId: task.id })
    toast.success('코드 리뷰를 업무에 연결했습니다.')
    onLinked(reviewId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 ui-overlay" onClick={onClose} />
      <div className="relative z-10 flex max-h-[min(760px,calc(100vh-2rem))] w-full max-w-3xl flex-col overflow-hidden rounded-md border border-surface-border bg-surface-raised shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-text-primary">
              코드 리뷰 가져오기
            </h2>
            <p className="mt-1 truncate text-xs text-text-muted">
              {task.title}
            </p>
          </div>
          <button type="button" onClick={onClose} className="ui-icon-button">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="flex items-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2">
            <Search className="size-4 text-text-muted" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="리뷰 제목, 저장소, 요약으로 검색"
              className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>

          <div className="space-y-2">
            {reviewsQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted p-8 text-sm text-text-muted">
                <Loader2 className="size-4 animate-spin" />
                코드 리뷰를 불러오는 중
              </div>
            ) : reviewsQuery.data?.items.length ? (
              reviewsQuery.data.items.map((review) => {
                const alreadyLinked = linkedIds.has(review.id)
                return (
                  <button
                    key={review.id}
                    type="button"
                    onClick={() => connect(review.id)}
                    disabled={alreadyLinked || linkMutation.isPending}
                    className="w-full rounded-md border border-surface-border-soft bg-surface-muted p-3 text-left transition-colors hover:border-brand-border hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-text-primary">
                          {review.title}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          {review.repository} · {formatDateTime(review.createdAt)}
                        </p>
                      </div>
                      <span className={clsx('rounded-sm border px-2 py-0.5 text-[11px] font-bold', riskClassName(review.riskLevel))}>
                        {alreadyLinked ? '연결됨' : riskLabel(review.riskLevel)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-text-muted">
                      {review.summary}
                    </p>
                  </button>
                )
              })
            ) : (
              <div className="rounded-md border border-surface-border-soft bg-surface-muted p-8 text-center text-sm text-text-muted">
                검색된 코드 리뷰가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SortableTableRow({
  row,
  canReorder,
  onOpenTask,
}: {
  row: Row<Task>
  canReorder: boolean
  onOpenTask: (taskId: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.original.id,
    disabled: !canReorder,
  })

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onClick={() => onOpenTask(row.original.id)}
      className={clsx(
        'cursor-pointer transition-colors hover:bg-surface-muted',
        row.index % 2 === 0 ? 'bg-background' : 'bg-surface-raised',
        isDragging && 'relative z-10 opacity-70 shadow-lg',
      )}
    >
      <td className="px-4 py-3 align-middle">
        <button
          type="button"
          className={clsx(
            'flex size-8 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted text-text-muted transition-colors hover:border-brand-border hover:text-brand-primary',
            !canReorder && 'cursor-not-allowed opacity-45',
          )}
          title={canReorder ? '드래그해서 순서 변경' : '수동 순서 정렬에서만 변경 가능'}
          aria-label="순서 변경"
          disabled={!canReorder}
          onClick={(event) => event.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      </td>
      {row.getVisibleCells().map((cell) => (
        <td key={cell.id} className="px-4 py-3 align-middle">
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  )
}

export function TaskTableView({
  tasks,
  users,
  canReorder,
  isLoading,
  onOpenTask,
  onSelectionChange,
}: {
  tasks: Task[]
  users: AssignableUser[]
  canReorder: boolean
  isLoading?: boolean
  onOpenTask: (taskId: string) => void
  onSelectionChange?: (ids: string[]) => void
}) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [reviewGuideTask, setReviewGuideTask] = useState<Task | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )
  const updateStatus = useUpdateTaskStatus()
  const updatePriority = useUpdateTaskPriority()
  const updateAssignee = useUpdateTaskAssignee()
  const reorderTasks = useReorderTasks()

  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <div className="flex h-full items-center justify-center">
            <input
              type="checkbox"
              className="m-0 size-4 shrink-0 align-middle accent-[var(--primary)]"
              checked={table.getIsAllRowsSelected()}
              onChange={table.getToggleAllRowsSelectedHandler()}
              aria-label="전체 선택"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex h-full items-center justify-center">
            <input
              type="checkbox"
              className="m-0 size-4 shrink-0 align-middle accent-[var(--primary)]"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
              onClick={(event) => event.stopPropagation()}
              aria-label="업무 선택"
            />
          </div>
        ),
      },
      {
        accessorKey: 'title',
        header: '업무',
        cell: ({ row }) => (
          <div className="min-w-0">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onOpenTask(row.original.id)
              }}
              className="block w-full truncate text-left text-sm font-bold text-text-primary hover:text-brand-primary"
            >
              {row.original.title}
            </button>
            <p className="mt-1 truncate text-xs text-text-muted">
              {row.original.content || row.original.id}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'taskType',
        header: '유형',
        cell: ({ row }) => <TaskTypeBadge taskType={row.original.taskType} />,
      },
      {
        accessorKey: 'status',
        header: '상태',
        cell: ({ row }) => (
          <div onClick={(event) => event.stopPropagation()}>
            <CompactSelect
              value={row.original.status}
              className={clsx(
                'h-8 min-h-8 pl-2.5 pr-7 text-xs font-black rounded-md border transition-all',
                TASK_STATUS_BADGE_CLASS[row.original.status]
              )}
              onChange={(event) =>
                updateStatus.mutate({
                  id: row.original.id,
                  status: event.target.value as TaskStatus,
                })
              }
              aria-label="상태 변경"
            >
              {TASK_STATUS_ORDER.map((status) => (
                <option key={status} value={status} className="bg-background text-text-primary">
                  {TASK_STATUS_LABELS[status]}
                </option>
              ))}
            </CompactSelect>
          </div>
        ),
      },
      {
        accessorKey: 'priority',
        header: '우선순위',
        cell: ({ row }) => (
          <div onClick={(event) => event.stopPropagation()}>
            <CompactSelect
              value={row.original.priority}
              className={clsx(
                'h-8 min-h-8 pl-2.5 pr-7 text-xs font-black rounded-md border transition-all',
                TASK_PRIORITY_BADGE_CLASS[row.original.priority]
              )}
              onChange={(event) =>
                updatePriority.mutate({
                  id: row.original.id,
                  priority: event.target.value as TaskPriority,
                })
              }
              aria-label="우선순위 변경"
            >
              {TASK_PRIORITY_ORDER.map((priority) => (
                <option key={priority} value={priority} className="bg-background text-text-primary">
                  {TASK_PRIORITY_LABELS[priority]}
                </option>
              ))}
            </CompactSelect>
          </div>
        ),
      },
      {
        accessorKey: 'assigneeName',
        header: '담당자',
        cell: ({ row }) => (
          <div onClick={(event) => event.stopPropagation()}>
            <CompactSelect
              value={row.original.assigneeId ?? ''}
              className="h-8 min-h-8 pl-2.5 pr-7 text-sm font-medium"
              onChange={(event) =>
                updateAssignee.mutate({
                  id: row.original.id,
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
          </div>
        ),
      },
      {
        accessorKey: 'dueDate',
        header: '마감일',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm font-medium text-text-primary">
            {formatDate(row.original.dueDate)}
          </span>
        ),
      },
      {
        accessorKey: 'reporterName',
        header: '작성자',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm font-medium text-text-primary">
            {row.original.reporterName ?? '-'}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: '작성일',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm font-medium text-text-primary">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '작업',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 px-3 text-xs"
              title="상세 보기"
              aria-label="상세 보기"
              onClick={(event) => {
                event.stopPropagation()
                onOpenTask(row.original.id)
              }}
            >
              상세
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 px-3 text-xs"
              title="리뷰 등록법"
              aria-label="리뷰 등록법"
              onClick={(event) => {
                event.stopPropagation()
                setReviewGuideTask(row.original)
              }}
            >
              리뷰
            </Button>
          </div>
        ),
      },
    ],
    [onOpenTask, updateAssignee, updatePriority, updateStatus, users],
  )

  const table = useReactTable({
    data: tasks,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    enableRowSelection: true,
  })

  const selectedIds = table.getSelectedRowModel().rows.map((row) => row.original.id)
  const rowIds = tasks.map((task) => task.id)
  const selectedIdKey = selectedIds.join(',')

  useEffect(() => {
    onSelectionChange?.(selectedIds)
    // Only notify the parent when the selected row id set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSelectionChange, selectedIdKey])

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id)
    const overId = event.over?.id ? String(event.over.id) : null
    if (!canReorder || !overId || activeId === overId) return

    const oldIndex = tasks.findIndex((task) => task.id === activeId)
    const newIndex = tasks.findIndex((task) => task.id === overId)
    if (oldIndex < 0 || newIndex < 0) return

    const nextTasks = [...tasks]
    const [moved] = nextTasks.splice(oldIndex, 1)
    nextTasks.splice(newIndex, 0, moved)

    const orderSlots = tasks.map((task) => task.orderIdx).sort((a, b) => a - b)
    reorderTasks.mutate(
      nextTasks.map((task, index) => ({
        id: task.id,
        orderIdx: orderSlots[index] ?? index,
      })),
    )
  }

  return (
    <div className="ui-panel overflow-hidden">
      <TaskReviewGuideDialog
        task={reviewGuideTask}
        onOpenChange={(open) => {
          if (!open) setReviewGuideTask(null)
        }}
      />
      <div className="overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
            <table className="w-full min-w-[1480px] table-fixed border-collapse text-left">
              <colgroup>
                <col className="w-16" />
                <col className="w-12" />
                <col className="w-[520px]" />
                <col className="w-20" />
                <col className="w-24" />
                <col className="w-28" />
                <col className="w-36" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-36" />
              </colgroup>
              <thead className="bg-surface-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-surface-border-soft">
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-text-muted">
                      순서
                    </th>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-text-secondary"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-surface-border-soft">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="px-4 py-16 text-center text-sm text-text-muted"
                    >
                      업무를 불러오는 중입니다.
                    </td>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="px-4 py-16 text-center text-sm text-text-muted"
                    >
                      표시할 업무가 없습니다.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <SortableTableRow
                      key={row.id}
                      row={row}
                      canReorder={canReorder && !reorderTasks.isPending}
                      onOpenTask={onOpenTask}
                    />
                  ))
                )}
              </tbody>
            </table>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}
