import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { ExternalLink } from 'lucide-react'
import { clsx } from 'clsx'
import {
  ISSUE_PRIORITY_LABELS,
  ISSUE_PRIORITY_ORDER,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_ORDER,
} from '../../../entities/issue/model/constants'
import type { Issue, IssuePriority, IssueStatus } from '../../../entities/issue/model/types'
import { CompactSelect } from '../../../shared/ui/compact-select'
import { useUpdateIssueStatus } from '../model/use-issue-queries'
import { IssueTypeBadge } from './issue-badges'

function formatDate(value?: string | null, fallback = '-') {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR').format(date)
}

export function IssueTableView({
  issues,
  isLoading,
  onOpen,
}: {
  issues: Issue[]
  isLoading: boolean
  onOpen: (id: string) => void
}) {
  const updateStatus = useUpdateIssueStatus()

  const columns: ColumnDef<Issue>[] = [
    {
      header: '업무',
      accessorKey: 'title',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-text-primary">{row.original.title}</p>
          {row.original.content ? (
            <p className="truncate text-xs text-text-muted">{row.original.content}</p>
          ) : null}
        </div>
      ),
    },
    {
      header: '유형',
      accessorKey: 'issueType',
      cell: ({ row }) => <IssueTypeBadge issueType={row.original.issueType} />,
    },
    {
      header: '상태',
      accessorKey: 'status',
      cell: ({ row }) => (
        <CompactSelect
          value={row.original.status}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) =>
            updateStatus.mutate({
              id: row.original.id,
              status: event.target.value as IssueStatus,
            })
          }
        >
          {ISSUE_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {ISSUE_STATUS_LABELS[s]}
            </option>
          ))}
        </CompactSelect>
      ),
    },
    {
      header: '우선순위',
      accessorKey: 'priority',
      cell: ({ row }) => (
        <span className="text-xs font-bold text-text-secondary">
          {ISSUE_PRIORITY_LABELS[row.original.priority as IssuePriority]}
        </span>
      ),
    },
    {
      header: '담당자',
      accessorKey: 'assigneeName',
      cell: ({ row }) => (
        <span className="text-xs text-text-muted">{row.original.assigneeName ?? '미지정'}</span>
      ),
    },
    {
      header: '마감일',
      accessorKey: 'dueDate',
      cell: ({ row }) => (
        <span className="text-xs text-text-muted">{formatDate(row.original.dueDate)}</span>
      ),
    },
    {
      header: '작성자',
      accessorKey: 'reporterName',
      cell: ({ row }) => (
        <span className="text-xs text-text-muted">{row.original.reporterName ?? '-'}</span>
      ),
    },
    {
      header: '작성일',
      accessorKey: 'createdAt',
      cell: ({ row }) => (
        <span className="text-xs text-text-muted">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <button
          type="button"
          title="상세 보기"
          onClick={(event) => {
            event.stopPropagation()
            onOpen(row.original.id)
          }}
          className="ui-icon-button size-7"
        >
          <ExternalLink className="size-3.5" />
        </button>
      ),
    },
  ]

  const table = useReactTable({
    data: issues,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="overflow-x-auto rounded-md border border-surface-border-soft">
      <table className="w-full border-collapse text-left">
        <thead className="bg-surface-muted">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-text-muted"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-[var(--surface-border-soft)]">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-16 text-center text-sm text-text-muted">
                이슈를 불러오는 중입니다.
              </td>
            </tr>
          ) : issues.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-16 text-center text-sm text-text-muted">
                이슈가 없습니다.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onOpen(row.original.id)}
                className={clsx(
                  'cursor-pointer bg-surface-raised transition-colors hover:bg-surface-muted',
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
