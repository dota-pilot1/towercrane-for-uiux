import { useEffect, useMemo, useState } from 'react'
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
import { Code2, Copy, ExternalLink, FileText, GripVertical, Loader2, X } from 'lucide-react'
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
import { useTaskCodeReviewList } from '../../../entities/code-review/api/code-review-api'
import type { CodeReviewSummary } from '../../../entities/code-review/model/types'
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

const REVIEW_FOLDER_EXAMPLE =
  'docs-for-5차 mvp/코드 리뷰 폴더'

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

function buildReviewSkillPrompt(taskId: string) {
  return `/pms-task-review ${taskId} ${REVIEW_FOLDER_EXAMPLE}
현재 커밋을 기준으로 코드 리뷰를 만들고 이 업무에 연결해줘.`
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
  const prompt = task ? buildReviewSkillPrompt(task.id) : ''
  const reviewsQuery = useTaskCodeReviewList(task?.id ?? null)

  return (
    <Dialog.Root open={Boolean(task)} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 ui-overlay" />
        <Dialog.Content className="glass-panel fixed inset-3 z-[60] flex flex-col overflow-hidden rounded-lg border border-surface-border-soft shadow-2xl md:inset-6">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft bg-surface-muted px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-black text-text-primary">
                PMS 코드 리뷰 등록
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-text-secondary">
                업무 정보와 등록된 코드 리뷰를 보면서 Codex 리뷰 등록 문구를 복사합니다.
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
                <div className="space-y-4">
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
                        <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-raised p-3 text-sm leading-6 text-text-secondary">
                          {task.content || '업무 내용이 없습니다.'}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-text-primary">
                        스킬 발동 예시
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          copyText(prompt, '리뷰 스킬 발동 예시를 복사했습니다.')
                        }
                      >
                        <Copy className="mr-1.5 size-3.5" />
                        예시 복사
                      </Button>
                    </div>
                    <p className="whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-raised p-3 font-mono text-xs leading-6 text-text-primary">
                      {prompt}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-text-muted">
                      리뷰 폴더에는 `리뷰.md`, `REVIEW.md`, `review.md` 또는 HTML 리뷰 파일을 둘 수 있습니다.
                      공유 키나 스킬 설치 방법은{' '}
                      <a
                        href="mailto:terecal@daum.net"
                        className="font-bold text-brand-primary underline-offset-4 hover:underline"
                      >
                        terecal@daum.net
                      </a>
                      으로 문의하세요.
                    </p>
                  </section>
                </div>
              </aside>

              <main className="min-h-0 overflow-y-auto bg-background p-5">
                <TaskReviewPreview
                  reviews={reviewsQuery.data ?? []}
                  isLoading={reviewsQuery.isLoading}
                />
              </main>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function TaskReviewPreview({
  reviews,
  isLoading,
}: {
  reviews: CodeReviewSummary[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center gap-2 text-sm text-text-muted">
        <Loader2 className="size-4 animate-spin" />
        코드 리뷰를 불러오는 중입니다.
      </div>
    )
  }

  if (!reviews.length) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <div className="w-full max-w-xl rounded-md border border-surface-border-soft bg-surface-muted p-6 text-center">
          <Code2 className="mx-auto size-8 text-brand-primary" />
          <h3 className="mt-3 text-base font-black text-text-primary">
            등록된 코드 리뷰가 없습니다.
          </h3>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            왼쪽의 스킬 발동 예시를 복사해서 Codex에게 실행시키면 이 영역에 리뷰가 표시됩니다.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-text-primary">
              코드 리뷰
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              등록된 리뷰 {reviews.length}건을 최신순으로 표시합니다.
            </p>
          </div>
          <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-1 text-xs font-bold text-brand-primary">
            리뷰 {reviews.length}
          </span>
        </div>
      </div>

      {reviews.map((review) => (
        <TaskReviewArticle key={review.id} review={review} />
      ))}
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

function TaskReviewArticle({ review }: { review: CodeReviewSummary }) {
  return (
    <article className="rounded-md border border-surface-border-soft bg-surface-muted">
      <header className="border-b border-surface-border-soft p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-lg font-black text-text-primary">
              {review.title}
            </h4>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-text-muted">
              <span>{review.repository}</span>
              <span>{formatDateTime(review.createdAt)}</span>
              <span className={clsx('rounded-sm border px-2 py-0.5', riskClassName(review.riskLevel))}>
                위험도 {riskLabel(review.riskLevel)}
              </span>
            </div>
          </div>
          <a
            href={`/code-reviews/${review.id}`}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-sm border border-surface-border-soft bg-surface-raised px-3 text-xs font-bold text-text-primary hover:bg-surface-strong"
            onClick={(event) => event.stopPropagation()}
          >
            <ExternalLink className="mr-1.5 size-3.5" />
            열기
          </a>
        </div>
      </header>
      <div className="space-y-3 p-4">
        <p className="whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-raised p-3 text-sm leading-6 text-text-secondary">
          {review.summary}
        </p>
        <div className="flex flex-wrap gap-2 text-[11px] font-bold text-text-muted">
          <span className="rounded-sm border border-surface-border-soft bg-surface-raised px-2 py-1">
            평가 {review.findingCount}
          </span>
          <span className="rounded-sm border border-surface-border-soft bg-surface-raised px-2 py-1">
            높음 {review.highSeverityCount}
          </span>
          <span className="rounded-sm border border-surface-border-soft bg-surface-raised px-2 py-1">
            파일 {review.changedFileCount}
          </span>
        </div>
      </div>
    </article>
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
