import PortOne from '@portone/browser-sdk/v2'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from './http'

const PORTONE_STORE_ID = import.meta.env.VITE_PORTONE_STORE_ID as string
const PORTONE_CHANNEL_KEY = import.meta.env.VITE_PORTONE_CHANNEL_KEY as string

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

export type PointTopup = {
  id: string
  amountKrw: number
  points: number
  status: 'pending' | 'paid' | 'cancelling' | 'cancelled' | 'failed'
  provider: string
  providerTxId: string | null
  createdAt: string
  paidAt: string | null
}

export type Wallet = {
  balance: number
  transactions: PointTransaction[]
  topups: PointTopup[]
}

export function useMyPoints() {
  return useQuery({
    queryKey: ['points', 'me'],
    queryFn: () => apiRequest<Wallet>('/points/me'),
  })
}

// 모의 충전 (개발용) — 외부 PG 없이 즉시 적립
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

// 충전 취소(전액 환불) — 미사용분만 가능
export function useRefundTopup() {
  const queryClient = useQueryClient()
  return useMutation<{ balance: number; refunded: number }, Error, string>({
    mutationFn: (topupId: string) =>
      apiRequest('/points/topup/refund', {
        method: 'POST',
        body: JSON.stringify({ topupId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points', 'me'] })
    },
  })
}

export type ConfirmTopupResult = {
  balance: number
  topupId: string
  alreadyProcessed: boolean
}

/**
 * PortOne(카카오페이) 실결제 충전.
 * 1) 브라우저에서 PortOne 결제창을 띄워 사용자가 결제
 * 2) 성공하면 paymentId를 서버로 보내 서버가 PortOne API로 재검증 후 적립
 *    (프론트가 보낸 금액/성공여부를 서버는 신뢰하지 않음)
 */
export function usePortonePayTopup() {
  const queryClient = useQueryClient()
  return useMutation<ConfirmTopupResult, Error, number>({
    mutationFn: async (amount: number) => {
      if (!PORTONE_STORE_ID || !PORTONE_CHANNEL_KEY) {
        throw new Error('결제 설정이 누락되었습니다. (PortOne 환경변수 확인)')
      }

      // 결제건 고유 식별자 — 서버 멱등 키로도 사용됨
      const paymentId = `topup-${crypto.randomUUID()}`

      const response = await PortOne.requestPayment({
        storeId: PORTONE_STORE_ID,
        channelKey: PORTONE_CHANNEL_KEY,
        paymentId,
        orderName: `포인트 충전 ${amount.toLocaleString('ko-KR')}P`,
        totalAmount: amount,
        currency: 'CURRENCY_KRW',
        payMethod: 'EASY_PAY',
      })

      // 결제창에서 실패/취소 시 code가 들어옴
      if (!response || response.code != null) {
        throw new Error(response?.message ?? '결제가 취소되었습니다.')
      }

      // 서버 검증 + 적립
      return apiRequest<ConfirmTopupResult>('/points/topup/confirm', {
        method: 'POST',
        body: JSON.stringify({ paymentId: response.paymentId ?? paymentId }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points', 'me'] })
    },
  })
}
