import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from './http'

export type PointTransaction = {
  id: string
  type: 'topup' | 'spend' | 'refund' | 'adjust'
  amount: number
  balanceAfter: number
  refType: string | null
  refId: string | null
  memo: string | null
  createdAt: string
}

export type Wallet = {
  balance: number
  transactions: PointTransaction[]
}

export function useMyPoints() {
  return useQuery({
    queryKey: ['points', 'me'],
    queryFn: () => apiRequest<Wallet>('/points/me'),
  })
}

export function useTopupPoints() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (amount: number) =>
      apiRequest<{ balance: number; topupId: string }>('/points/topup', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points', 'me'] })
    },
  })
}
