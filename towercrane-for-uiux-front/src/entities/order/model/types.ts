export type OrderStage = 'ready' | 'review' | 'issued' | 'hold'

export type OrderItem = {
  id: string
  customer: string
  title: string
  team: string
  amount: number
  issuedAt: string
  status: OrderStage
}
