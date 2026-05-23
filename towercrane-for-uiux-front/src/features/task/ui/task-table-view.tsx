import { useEffect, useMemo, useState } from 'react'
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
import { FileSearch, GripVertical } from 'lucide-react'
import { clsx } from 'clsx'
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_ORDER,
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
} from '../../../entities/task/model/constants'
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
          <div className="min-w-[240px]">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onOpenTask(row.original.id)
              }}
              className="line-clamp-1 text-left text-sm font-bold text-text-primary hover:text-brand-primary"
            >
              {row.original.title}
            </button>
            <p className="mt-1 line-clamp-1 text-xs text-text-muted">
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
              className="h-8 min-h-8 pl-2.5 pr-7 text-sm font-medium"
              onChange={(event) =>
                updateStatus.mutate({
                  id: row.original.id,
                  status: event.target.value as TaskStatus,
                })
              }
              aria-label="상태 변경"
            >
              {TASK_STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
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
              className="h-8 min-h-8 pl-2.5 pr-7 text-sm font-medium"
              onChange={(event) =>
                updatePriority.mutate({
                  id: row.original.id,
                  priority: event.target.value as TaskPriority,
                })
              }
              aria-label="우선순위 변경"
            >
              {TASK_PRIORITY_ORDER.map((priority) => (
                <option key={priority} value={priority}>
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
        id: 'open',
        header: '',
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 min-h-9 w-9 rounded-md"
            title="상세 보기"
            aria-label="상세 보기"
            onClick={(event) => {
              event.stopPropagation()
              onOpenTask(row.original.id)
            }}
          >
            <FileSearch className="size-4" />
          </Button>
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
      <div className="overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
            <table className="w-full min-w-[1140px] border-collapse text-left">
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
