import type { ColumnDef } from '@tanstack/react-table'
import { formatCurrency } from '../../../shared/lib/utils'
import type { OrderItem } from './types'

const statusTone: Record<OrderItem['status'], string> = {
  ready: 'bg-brand-primary/15 text-sky-200',
  review: 'bg-amber-400/15 text-amber-200',
  issued: 'bg-brand-glass text-brand-primary',
  hold: 'bg-rose-400/15 text-rose-200',
}

export const orderColumns: ColumnDef<OrderItem>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => <span className="font-medium text-text-primary">{row.original.id}</span>,
  },
  {
    accessorKey: 'customer',
    header: '고객사',
  },
  {
    accessorKey: 'title',
    header: '시나리오',
  },
  {
    accessorKey: 'team',
    header: '팀',
    cell: ({ row }) => (
      <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs uppercase tracking-[0.18em] text-text-secondary">
        {row.original.team}
      </span>
    ),
  },
  {
    accessorKey: 'amount',
    header: '예산',
    cell: ({ row }) => formatCurrency(row.original.amount),
  },
  {
    accessorKey: 'issuedAt',
    header: '배포일',
  },
  {
    accessorKey: 'status',
    header: '상태',
    cell: ({ row }) => (
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone[row.original.status]}`}
      >
        {row.original.status}
      </span>
    ),
  },
]
