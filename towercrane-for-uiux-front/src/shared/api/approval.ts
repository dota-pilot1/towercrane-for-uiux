import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from './http'
import { useSessionStore } from '../store/session-store'

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export type ApprovalCategory =
  | 'LEAVE'
  | 'PURCHASE'
  | 'TRIP'
  | 'EXPENSE'
  | 'PROPOSAL'

export const CATEGORY_LABEL: Record<ApprovalCategory, string> = {
  LEAVE: '휴가',
  PURCHASE: '구매',
  TRIP: '출장',
  EXPENSE: '비용',
  PROPOSAL: '품의',
}

export const CATEGORY_ORDER: ApprovalCategory[] = [
  'LEAVE',
  'PURCHASE',
  'TRIP',
  'EXPENSE',
  'PROPOSAL',
]

export const STATUS_LABEL: Record<ApprovalStatus, string> = {
  PENDING: '대기중',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELLED: '취소',
}

// ── 첨부파일 ──────────────────────────────
export type Attachment = {
  name: string
  url: string
  size?: number
  contentType?: string
}

// ── 품의(자유양식) Form Builder 필드 ──────────────────────────────
export type FormFieldType = 'text' | 'textarea' | 'number' | 'date' | 'select'
export type FormField = {
  id: string
  label: string
  type: FormFieldType
  value: string
  options?: string[]
}

// ── 분류별 구조화 데이터(meta) ──────────────────────────────
export type LeaveType = '연차' | '반차' | '병가' | '기타'
export type LeaveMeta = {
  kind: 'LEAVE'
  leaveType: LeaveType
  startDate: string
  endDate: string
  days: number
}
export type PurchaseMeta = {
  kind: 'PURCHASE'
  itemName: string
  quantity: number
  unitPrice: number
  amount: number
  attachments: Attachment[]
}
export type TripMeta = {
  kind: 'TRIP'
  destination: string
  startDate: string
  endDate: string
  estimatedCost: number
}
export type ExpenseType = '식대' | '교통' | '숙박' | '기타'
export type PaymentMethod = '개인' | '법인카드'
export type ExpenseMeta = {
  kind: 'EXPENSE'
  useDate: string
  expenseType: ExpenseType
  paymentMethod: PaymentMethod
  amount: number
  attachments: Attachment[]
}
export type ProposalMeta = {
  kind: 'PROPOSAL'
  fields: FormField[]
}
export type ApprovalMeta =
  | LeaveMeta
  | PurchaseMeta
  | TripMeta
  | ExpenseMeta
  | ProposalMeta

export type ApprovalStep = {
  id: string
  order: number
  approverId: string
  approverName: string
  approverPosition: string | null
  status: ApprovalStatus
  comment: string | null
  actedAt: string | null
}

export type ApprovalRequest = {
  id: string
  title: string
  content: string
  category: ApprovalCategory
  status: ApprovalStatus
  meta: ApprovalMeta | null
  submitterId: string
  submitterName: string
  createdAt: string
  updatedAt: string
  steps: ApprovalStep[]
}

export type CreateApprovalDto = {
  title: string
  content: string
  category: ApprovalCategory
  meta: ApprovalMeta
  approverIds: string[]
}

export type ActApprovalDto = {
  action: 'APPROVED' | 'REJECTED'
  comment?: string
}

export function useApprovalInbox() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: ['approval', 'inbox'],
    queryFn: () => apiRequest<ApprovalRequest[]>('/approvals/inbox'),
    enabled: isAuthenticated,
  })
}

export function useApprovalSent() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: ['approval', 'sent'],
    queryFn: () => apiRequest<ApprovalRequest[]>('/approvals/sent'),
    enabled: isAuthenticated,
  })
}

export function useSubmitApproval() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateApprovalDto) =>
      apiRequest<ApprovalRequest>('/approvals', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval', 'sent'] })
    },
  })
}

export function useActOnApproval() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ActApprovalDto }) =>
      apiRequest<ApprovalRequest>(`/approvals/${id}/act`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval', 'inbox'] })
    },
  })
}
