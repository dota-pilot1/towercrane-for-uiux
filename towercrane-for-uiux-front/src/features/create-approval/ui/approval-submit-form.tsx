import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { RotateCcw, Save, Send } from 'lucide-react'
import { toast } from 'sonner'
import { CATEGORY_ICON } from '../../../entities/approval/config/approval-category'
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  useApprovalDraftQuery,
  useDeleteApprovalDraft,
  useSaveApprovalDraft,
  useSubmitApproval,
  type ApprovalCategory,
  type ApprovalMeta,
  type Attachment,
  type ExpenseType,
  type FormField,
  type LeaveType,
  type PaymentMethod,
} from '../../../shared/api/approval'
import { useSessionStore } from '../../../shared/store/session-store'
import { CompactSelect } from '../../../shared/ui/compact-select'
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog'
import {
  loadApprovalDraft,
  type ApprovalDraftData,
} from '../model/approval-draft'
import { useApprovalDraft } from '../model/use-approval-draft'
import { ApproverPicker, type PickedApprover } from './approver-picker'
import { AttachmentUploader } from './attachment-uploader'
import { ProposalFormBuilder } from './proposal-form-builder'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

function calcDays(start: string, end: string) {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
  if (isNaN(+s) || isNaN(+e) || e < s) return 0
  return Math.round((+e - +s) / 86400000) + 1
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[12px] font-bold text-text-secondary">{label}</label>
      {children}
    </div>
  )
}

export function ApprovalSubmitForm({ onSuccess }: { onSuccess: () => void }) {
  const currentUserId = useSessionStore((state) => state.userId)
  const serverDraft = useApprovalDraftQuery()
  const localDraft = useMemo(
    () => loadApprovalDraft(currentUserId),
    [currentUserId],
  )

  if (serverDraft.isLoading) {
    return <p className="text-[13px] text-text-muted">임시 저장 문서를 확인하는 중…</p>
  }

  const useLocalDraft = Boolean(
    localDraft &&
      (!serverDraft.data ||
        new Date(localDraft.savedAt) > new Date(serverDraft.data.updatedAt)),
  )
  const initialDraft: ApprovalDraftData | null = useLocalDraft
    ? localDraft
    : (serverDraft.data?.payload ?? null)
  const restoredAt = useLocalDraft
    ? localDraft?.savedAt
    : serverDraft.data?.updatedAt

  return (
    <ApprovalSubmitFormContent
      key={currentUserId}
      currentUserId={currentUserId}
      initialDraft={initialDraft}
      restoredAt={restoredAt ?? null}
      restoredFrom={useLocalDraft ? 'LOCAL' : serverDraft.data ? 'SERVER' : null}
      draftLoadError={serverDraft.error?.message ?? null}
      onSuccess={onSuccess}
    />
  )
}

function ApprovalSubmitFormContent({
  currentUserId,
  initialDraft,
  restoredAt,
  restoredFrom,
  draftLoadError,
  onSuccess,
}: {
  currentUserId: string
  initialDraft: ApprovalDraftData | null
  restoredAt: string | null
  restoredFrom: 'SERVER' | 'LOCAL' | null
  draftLoadError: string | null
  onSuccess: () => void
}) {
  const [category, setCategory] = useState<ApprovalCategory>(
    initialDraft?.category ?? 'LEAVE',
  )
  const [title, setTitle] = useState(initialDraft?.title ?? '')
  const [content, setContent] = useState(initialDraft?.content ?? '')
  const [approvers, setApprovers] = useState<PickedApprover[]>(
    initialDraft?.approvers ?? [],
  )
  const [error, setError] = useState<string | null>(null)

  const [leaveType, setLeaveType] = useState<LeaveType>(initialDraft?.leaveType ?? '연차')
  const [leaveStart, setLeaveStart] = useState(initialDraft?.leaveStart ?? '')
  const [leaveEnd, setLeaveEnd] = useState(initialDraft?.leaveEnd ?? '')
  const [itemName, setItemName] = useState(initialDraft?.itemName ?? '')
  const [quantity, setQuantity] = useState(initialDraft?.quantity ?? '1')
  const [unitPrice, setUnitPrice] = useState(initialDraft?.unitPrice ?? '')
  const [purchaseFiles, setPurchaseFiles] = useState<Attachment[]>(
    initialDraft?.purchaseFiles ?? [],
  )
  const [destination, setDestination] = useState(initialDraft?.destination ?? '')
  const [tripStart, setTripStart] = useState(initialDraft?.tripStart ?? '')
  const [tripEnd, setTripEnd] = useState(initialDraft?.tripEnd ?? '')
  const [estimatedCost, setEstimatedCost] = useState(initialDraft?.estimatedCost ?? '')
  const [useDate, setUseDate] = useState(initialDraft?.useDate ?? '')
  const [expenseType, setExpenseType] = useState<ExpenseType>(
    initialDraft?.expenseType ?? '식대',
  )
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initialDraft?.paymentMethod ?? '개인',
  )
  const [expenseAmount, setExpenseAmount] = useState(initialDraft?.expenseAmount ?? '')
  const [expenseFiles, setExpenseFiles] = useState<Attachment[]>(
    initialDraft?.expenseFiles ?? [],
  )
  const [formFields, setFormFields] = useState<FormField[]>(
    initialDraft?.formFields ?? [],
  )
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  const leaveDays = leaveType === '반차' ? 0.5 : calcDays(leaveStart, leaveEnd)
  const purchaseAmount = (Number(quantity) || 0) * (Number(unitPrice) || 0)

  const submit = useSubmitApproval()
  const saveDraft = useSaveApprovalDraft()
  const deleteDraft = useDeleteApprovalDraft()

  const draft = useMemo(
    () => ({
      category,
      title,
      content,
      approvers,
      leaveType,
      leaveStart,
      leaveEnd,
      itemName,
      quantity,
      unitPrice,
      purchaseFiles,
      destination,
      tripStart,
      tripEnd,
      estimatedCost,
      useDate,
      expenseType,
      paymentMethod,
      expenseAmount,
      expenseFiles,
      formFields,
    }),
    [
      approvers,
      category,
      content,
      destination,
      estimatedCost,
      expenseAmount,
      expenseFiles,
      expenseType,
      formFields,
      itemName,
      leaveEnd,
      leaveStart,
      leaveType,
      paymentMethod,
      purchaseFiles,
      quantity,
      title,
      tripEnd,
      tripStart,
      unitPrice,
      useDate,
    ],
  )
  const { clearDraft, hasDraft } = useApprovalDraft({
    userId: currentUserId,
    draft,
  })

  const resetAll = () => {
    setCategory('LEAVE')
    setTitle('')
    setContent('')
    setApprovers([])
    setLeaveType('연차')
    setLeaveStart('')
    setLeaveEnd('')
    setItemName('')
    setQuantity('1')
    setUnitPrice('')
    setPurchaseFiles([])
    setDestination('')
    setTripStart('')
    setTripEnd('')
    setEstimatedCost('')
    setUseDate('')
    setExpenseType('식대')
    setPaymentMethod('개인')
    setExpenseAmount('')
    setExpenseFiles([])
    setFormFields([])
    setError(null)
  }

  const buildMeta = (): ApprovalMeta | string => {
    switch (category) {
      case 'LEAVE': {
        if (leaveType !== '반차' && (!leaveStart || !leaveEnd)) return '휴가 기간을 입력하세요.'
        if (leaveType === '반차' && !leaveStart) return '반차 날짜를 입력하세요.'
        const start = leaveStart
        const end = leaveType === '반차' ? leaveStart : leaveEnd
        if (leaveDays <= 0) return '종료일이 시작일보다 빠릅니다.'
        return { kind: 'LEAVE', leaveType, startDate: start, endDate: end, days: leaveDays }
      }
      case 'PURCHASE': {
        if (!itemName.trim()) return '품목명을 입력하세요.'
        const q = Number(quantity)
        const p = Number(unitPrice)
        if (!Number.isInteger(q) || q <= 0) return '수량을 올바르게 입력하세요.'
        if (isNaN(p) || p < 0) return '단가를 올바르게 입력하세요.'
        return {
          kind: 'PURCHASE',
          itemName: itemName.trim(),
          quantity: q,
          unitPrice: p,
          amount: q * p,
          attachments: purchaseFiles,
        }
      }
      case 'TRIP': {
        if (!destination.trim()) return '목적지를 입력하세요.'
        if (!tripStart || !tripEnd) return '출장 기간을 입력하세요.'
        if (new Date(tripEnd) < new Date(tripStart)) return '종료일이 시작일보다 빠릅니다.'
        const c = Number(estimatedCost)
        if (isNaN(c) || c < 0) return '예상 비용을 올바르게 입력하세요.'
        return {
          kind: 'TRIP',
          destination: destination.trim(),
          startDate: tripStart,
          endDate: tripEnd,
          estimatedCost: c,
        }
      }
      case 'EXPENSE': {
        if (!useDate) return '사용일을 입력하세요.'
        const a = Number(expenseAmount)
        if (isNaN(a) || a < 0) return '금액을 올바르게 입력하세요.'
        return {
          kind: 'EXPENSE',
          useDate,
          expenseType,
          paymentMethod,
          amount: a,
          attachments: expenseFiles,
        }
      }
      case 'PROPOSAL': {
        if (formFields.length === 0) return '품의 양식에 항목을 1개 이상 추가하세요.'
        if (formFields.some((f) => !f.label.trim())) return '모든 항목의 이름을 입력하세요.'
        return { kind: 'PROPOSAL', fields: formFields }
      }
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!title.trim()) return setError('제목을 입력하세요.')
    if (!content.trim()) return setError('내용을 입력하세요.')
    if (approvers.length === 0) return setError('결재자를 1명 이상 지정하세요.')
    const meta = buildMeta()
    if (typeof meta === 'string') return setError(meta)
    submit.mutate(
      {
        title: title.trim(),
        content: content.trim(),
        category,
        meta,
        approverIds: approvers.map((a) => a.id),
      },
      {
        onSuccess: () => {
          clearDraft()
          resetAll()
          onSuccess()
        },
        onError: (err: Error) => setError(err.message),
      },
    )
  }

  const contentLabel = category === 'PROPOSAL' ? '비고 / 배경 설명' : '사유 / 상세 내용'

  const handleSaveDraft = () => {
    setError(null)
    if (!hasDraft) {
      toast.info('임시 저장할 내용을 먼저 입력하세요.')
      return
    }
    saveDraft.mutate(draft, {
      onSuccess: () => toast.success('임시 저장되었습니다.'),
      onError: (saveError: Error) => setError(saveError.message),
    })
  }

  const handleResetDraft = () => {
    setError(null)
    deleteDraft.mutate(undefined, {
      onSuccess: () => {
        clearDraft()
        resetAll()
        setResetDialogOpen(false)
        toast.success('작성 내용이 초기화되었습니다.')
      },
      onError: (deleteError: Error) => {
        setResetDialogOpen(false)
        setError(deleteError.message)
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
      {hasDraft && restoredAt && restoredFrom && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-border bg-brand-glass px-4 py-3"
        >
          <RotateCcw className="size-4 shrink-0 text-brand-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-text-primary">
              {restoredFrom === 'SERVER'
                ? '임시 저장 문서를 불러왔습니다.'
                : '작성 중이던 내용을 복구했습니다.'}
            </p>
            <p className="text-[11px] text-text-secondary">
              {new Date(restoredAt).toLocaleString('ko-KR')} 저장본
            </p>
          </div>
        </div>
      )}

      {draftLoadError && (
        <p className="rounded-lg bg-danger-glass px-3 py-2 text-[12px] text-destructive">
          서버의 임시 저장 문서를 불러오지 못했습니다. 브라우저 복구본으로 계속 작성할 수 있습니다.
        </p>
      )}

      <div className="space-y-2">
        <label className="text-[12px] font-bold text-text-secondary">분류</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_ORDER.map((c) => {
            const Icon = CATEGORY_ICON[c]
            const active = category === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-[13px] font-semibold transition-colors ' +
                  (active
                    ? 'bg-brand-glass border-brand-border text-brand-primary'
                    : 'bg-surface-raised border-surface-border text-text-secondary hover:border-brand-border')
                }
              >
                <Icon className="size-4" strokeWidth={2} />
                {CATEGORY_LABEL[c]}
              </button>
            )
          })}
        </div>
      </div>

      <Field label="제목">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="결재 제목"
          className="ui-input w-full"
        />
      </Field>

      <div className="ui-panel-soft rounded-xl p-4 space-y-4">
        {category === 'LEAVE' && (
          <>
            <Field label="휴가 종류">
              <CompactSelect
                wrapperClassName="w-full"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              >
                {(['연차', '반차', '병가', '기타'] as LeaveType[]).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </CompactSelect>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="시작일">
                <input
                  type="date"
                  value={leaveStart}
                  onChange={(e) => setLeaveStart(e.target.value)}
                  className="ui-input w-full"
                />
              </Field>
              <Field label={leaveType === '반차' ? '종료일 (반차=시작일)' : '종료일'}>
                <input
                  type="date"
                  value={leaveType === '반차' ? leaveStart : leaveEnd}
                  onChange={(e) => setLeaveEnd(e.target.value)}
                  disabled={leaveType === '반차'}
                  className="ui-input w-full"
                />
              </Field>
            </div>
            <div className="text-[12px] text-text-secondary">
              총 일수 <span className="font-bold text-brand-primary">{leaveDays}일</span>
            </div>
          </>
        )}

        {category === 'PURCHASE' && (
          <>
            <Field label="품목명">
              <input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="예: 무선 마우스"
                className="ui-input w-full"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="수량">
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="ui-input w-full"
                />
              </Field>
              <Field label="단가 (원)">
                <input
                  type="number"
                  min={0}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="0"
                  className="ui-input w-full"
                />
              </Field>
            </div>
            <div className="text-[12px] text-text-secondary">
              합계 <span className="font-bold text-brand-primary">{won(purchaseAmount)}</span>
            </div>
            <Field label="첨부 (견적서 등)">
              <AttachmentUploader files={purchaseFiles} onChange={setPurchaseFiles} />
            </Field>
          </>
        )}

        {category === 'TRIP' && (
          <>
            <Field label="목적지">
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="예: 부산 고객사"
                className="ui-input w-full"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="시작일">
                <input
                  type="date"
                  value={tripStart}
                  onChange={(e) => setTripStart(e.target.value)}
                  className="ui-input w-full"
                />
              </Field>
              <Field label="종료일">
                <input
                  type="date"
                  value={tripEnd}
                  onChange={(e) => setTripEnd(e.target.value)}
                  className="ui-input w-full"
                />
              </Field>
            </div>
            <Field label="예상 비용 (원)">
              <input
                type="number"
                min={0}
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="0"
                className="ui-input w-full"
              />
            </Field>
          </>
        )}

        {category === 'EXPENSE' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="사용일">
                <input
                  type="date"
                  value={useDate}
                  onChange={(e) => setUseDate(e.target.value)}
                  className="ui-input w-full"
                />
              </Field>
              <Field label="금액 (원)">
                <input
                  type="number"
                  min={0}
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0"
                  className="ui-input w-full"
                />
              </Field>
              <Field label="항목">
                <CompactSelect
                  wrapperClassName="w-full"
                  value={expenseType}
                  onChange={(e) => setExpenseType(e.target.value as ExpenseType)}
                >
                  {(['식대', '교통', '숙박', '기타'] as ExpenseType[]).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </CompactSelect>
              </Field>
              <Field label="결제 수단">
                <CompactSelect
                  wrapperClassName="w-full"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                >
                  {(['개인', '법인카드'] as PaymentMethod[]).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </CompactSelect>
              </Field>
            </div>
            <Field label="첨부 (영수증 등)">
              <AttachmentUploader files={expenseFiles} onChange={setExpenseFiles} />
            </Field>
          </>
        )}

        {category === 'PROPOSAL' && (
          <Field label="품의 양식 (직접 구성)">
            <ProposalFormBuilder fields={formFields} onChange={setFormFields} />
          </Field>
        )}
      </div>

      <Field label={contentLabel}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="상세 내용을 입력하세요"
          rows={4}
          className="ui-input h-auto py-2 w-full resize-none"
        />
      </Field>

      <div className="ui-panel-soft rounded-xl p-4">
        <ApproverPicker approvers={approvers} onChange={setApprovers} />
      </div>

      <div className="space-y-3 border-t border-surface-border-soft pt-4">
        {error && <p className="text-[13px] font-medium text-destructive">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          {hasDraft && (
            <button
              type="button"
              onClick={() => setResetDialogOpen(true)}
              disabled={deleteDraft.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="size-3.5" />
              {deleteDraft.isPending ? '초기화 중…' : '내용 초기화'}
            </button>
          )}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saveDraft.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface-raised px-5 py-2.5 text-[13px] font-bold text-text-secondary transition-colors hover:border-brand-border hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="size-4" />
              {saveDraft.isPending ? '저장 중…' : '임시 저장'}
            </button>
            <button
              type="submit"
              disabled={submit.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-6 py-2.5 text-[13px] font-bold text-text-on-brand shadow-sm transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="size-4" />
              {submit.isPending ? '상신 중…' : '결재 상신'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={resetDialogOpen}
        title="작성 내용을 초기화할까요?"
        description="현재 입력한 내용과 저장된 임시 문서가 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        confirmLabel="초기화"
        isPending={deleteDraft.isPending}
        tone="danger"
        onConfirm={handleResetDraft}
        onOpenChange={setResetDialogOpen}
      />
    </form>
  )
}
