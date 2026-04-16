import type { WorkbenchFilters } from '../../../shared/store/ui-store'
import { mockOrders } from './mock-orders'

export async function fetchOrders(filters: WorkbenchFilters) {
  await new Promise((resolve) => setTimeout(resolve, 240))

  return mockOrders.filter((order) => {
    const matchesKeyword =
      filters.keyword.length === 0 ||
      [order.customer, order.title, order.id].some((value) =>
        value.toLowerCase().includes(filters.keyword.toLowerCase()),
      )

    const matchesTeam = filters.team === 'all' || order.team === filters.team
    const matchesStatus = filters.status === 'all' || order.status === filters.status
    const matchesAmount = order.amount >= filters.minAmount

    return matchesKeyword && matchesTeam && matchesStatus && matchesAmount
  })
}
