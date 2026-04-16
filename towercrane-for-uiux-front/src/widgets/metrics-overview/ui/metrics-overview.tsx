import { useQuery } from '@tanstack/react-query'
import { BellRing, CreditCard, TicketPercent, Workflow } from 'lucide-react'
import { fetchOrders } from '../../../entities/order/model/orders-query'
import { formatCurrency } from '../../../shared/lib/utils'
import { useUiStore } from '../../../shared/store/ui-store'
import { Card } from '../../../shared/ui/card'

const metricMeta = [
  { key: 'totalAmount', label: '총 집행 예산', icon: CreditCard },
  { key: 'issuedCount', label: '즉시 발급 가능', icon: TicketPercent },
  { key: 'reviewCount', label: '검수 대기', icon: Workflow },
  { key: 'attentionCount', label: '리스크 알림', icon: BellRing },
] as const

export function MetricsOverview() {
  const filters = useUiStore((state) => state.filters)
  const { data = [] } = useQuery({
    queryKey: ['orders', filters],
    queryFn: () => fetchOrders(filters),
  })

  const metrics = {
    totalAmount: formatCurrency(data.reduce((sum, item) => sum + item.amount, 0)),
    issuedCount: `${data.filter((item) => item.status === 'issued').length}건`,
    reviewCount: `${data.filter((item) => item.status === 'review').length}건`,
    attentionCount: `${data.filter((item) => item.status === 'hold').length}건`,
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metricMeta.map((item) => {
        const Icon = item.icon

        return (
          <Card key={item.key} className="rounded-[28px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{item.label}</p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  {metrics[item.key]}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200/10 bg-emerald-300/10 p-3 text-emerald-200">
                <Icon className="size-5" />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
