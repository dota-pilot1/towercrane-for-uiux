import type { ColumnDef } from '@tanstack/react-table'
import { formatCurrency } from '../../../shared/lib/utils'
import type { OrderItem } from './types'

const statusTone: Record<OrderItem['status'], string> = {
  ready: 'bg-sky-400/15 text-sky-200',
  review: 'bg-amber-400/15 text-amber-200',
  issued: 'bg-emerald-400/15 text-emerald-200',
  hold: 'bg-rose-400/15 text-rose-200',
}

export const orderColumns: ColumnDef<OrderItem>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => <span className="font-medium text-slate-100">{row.original.id}</span>,
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
      <span className="rounded-full bg-white/8 px-2.5 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
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
