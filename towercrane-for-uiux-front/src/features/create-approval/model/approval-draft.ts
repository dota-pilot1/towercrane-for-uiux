import { z } from 'zod'
import type { ApprovalDraftPayload } from '../../../shared/api/approval'

const APPROVAL_DRAFT_VERSION = 1 as const
const APPROVAL_DRAFT_KEY_PREFIX = 'towercrane:approval-draft'

const attachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  size: z.number().optional(),
  contentType: z.string().optional(),
})

const approverSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: z.string().nullable(),
})

const formFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['text', 'textarea', 'number', 'date', 'select']),
  value: z.string(),
  options: z.array(z.string()).optional(),
})

const approvalDraftSchema = z.object({
  version: z.literal(APPROVAL_DRAFT_VERSION),
  savedAt: z.string(),
  category: z.enum(['LEAVE', 'PURCHASE', 'TRIP', 'EXPENSE', 'PROPOSAL']),
  title: z.string(),
  content: z.string(),
  approvers: z.array(approverSchema),
  leaveType: z.enum(['연차', '반차', '병가', '기타']),
  leaveStart: z.string(),
  leaveEnd: z.string(),
  itemName: z.string(),
  quantity: z.string(),
  unitPrice: z.string(),
  purchaseFiles: z.array(attachmentSchema),
  destination: z.string(),
  tripStart: z.string(),
  tripEnd: z.string(),
  estimatedCost: z.string(),
  useDate: z.string(),
  expenseType: z.enum(['식대', '교통', '숙박', '기타']),
  paymentMethod: z.enum(['개인', '법인카드']),
  expenseAmount: z.string(),
  expenseFiles: z.array(attachmentSchema),
  formFields: z.array(formFieldSchema),
})

export type ApprovalDraftData = ApprovalDraftPayload

export type StoredApprovalDraft = ApprovalDraftData & {
  version: typeof APPROVAL_DRAFT_VERSION
  savedAt: string
}

function draftStorageKey(userId: string) {
  return `${APPROVAL_DRAFT_KEY_PREFIX}:${encodeURIComponent(userId)}`
}

export function loadApprovalDraft(userId: string): StoredApprovalDraft | null {
  if (!userId || typeof localStorage === 'undefined') return null

  const key = draftStorageKey(userId)
  const serialized = localStorage.getItem(key)
  if (!serialized) return null

  try {
    const result = approvalDraftSchema.safeParse(JSON.parse(serialized))
    if (result.success) return result.data
  } catch {
    // 깨진 초안은 아래에서 제거하고 새로 시작한다.
  }

  localStorage.removeItem(key)
  return null
}

export function saveApprovalDraft(
  userId: string,
  draft: ApprovalDraftData,
): StoredApprovalDraft {
  const stored: StoredApprovalDraft = {
    ...draft,
    version: APPROVAL_DRAFT_VERSION,
    savedAt: new Date().toISOString(),
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(draftStorageKey(userId), JSON.stringify(stored))
  }
  return stored
}

export function removeApprovalDraft(userId: string) {
  if (!userId || typeof localStorage === 'undefined') return
  localStorage.removeItem(draftStorageKey(userId))
}

export function isApprovalDraftEmpty(draft: ApprovalDraftData) {
  return (
    draft.category === 'LEAVE' &&
    draft.title === '' &&
    draft.content === '' &&
    draft.approvers.length === 0 &&
    draft.leaveType === '연차' &&
    draft.leaveStart === '' &&
    draft.leaveEnd === '' &&
    draft.itemName === '' &&
    draft.quantity === '1' &&
    draft.unitPrice === '' &&
    draft.purchaseFiles.length === 0 &&
    draft.destination === '' &&
    draft.tripStart === '' &&
    draft.tripEnd === '' &&
    draft.estimatedCost === '' &&
    draft.useDate === '' &&
    draft.expenseType === '식대' &&
    draft.paymentMethod === '개인' &&
    draft.expenseAmount === '' &&
    draft.expenseFiles.length === 0 &&
    draft.formFields.length === 0
  )
}
