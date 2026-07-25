import { useState, type ReactNode } from 'react'
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Minus,
  Paperclip,
  X,
  XCircle,
} from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import { Textarea } from '../../../shared/ui/textarea'
import {
  CATEGORY_LABEL,
  STATUS_LABEL,
  type ApprovalMeta,
  type ApprovalRequest,
  type ApprovalStatus,
  type ApprovalStep,
  type Attachment,
} from '../../../shared/api/approval'
import { CATEGORY_ICON } from '../config/approval-category'

const won = (value: number) => `${value.toLocaleString('ko-KR')}원`

function statusTone(status: ApprovalStatus) {
  switch (status) {
    case 'APPROVED':
      return 'border-brand-border bg-brand-glass text-brand-primary'
    case 'REJECTED':
      return 'border-destructive/30 bg-danger-glass text-destructive'
    case 'CANCELLED':
      return 'border-surface-border bg-surface-muted text-text-muted'
    default:
      return 'border-surface-border-soft bg-surface-muted text-text-secondary'
  }
}

function StatusBadge({ status }: { status: ApprovalStatus }) {
  const Icon =
    status === 'APPROVED' ? CheckCircle2 : status === 'REJECTED' ? XCircle : Clock3

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(status)}`}
    >
      <Icon className="size-3.5" strokeWidth={2.25} />
      {STATUS_LABEL[status]}
    </span>
  )
}

function stepLabel(step: ApprovalStep, isCurrent: boolean) {
  if (step.status === 'APPROVED') return '승인 완료'
  if (step.status === 'REJECTED') return '반려'
  if (step.status === 'SKIPPED') return '처리 제외'
  if (isCurrent) return '현재 결재자'
  return '예정'
}

function stepTone(step: ApprovalStep, isCurrent: boolean) {
  if (step.status === 'APPROVED') {
    return 'border-brand-border bg-brand-glass text-brand-primary'
  }
  if (step.status === 'REJECTED') {
    return 'border-destructive/40 bg-danger-glass text-destructive'
  }
  if (isCurrent) {
    return 'border-brand-border bg-surface-raised text-brand-primary ring-4 ring-brand-glass'
  }
  return 'border-surface-border bg-surface-raised text-text-muted'
}

function StepIcon({ step, isCurrent }: { step: ApprovalStep; isCurrent: boolean }) {
  if (step.status === 'APPROVED') return <Check className="size-4" strokeWidth={2.5} />
  if (step.status === 'REJECTED') return <X className="size-4" strokeWidth={2.5} />
  if (step.status === 'SKIPPED') return <Minus className="size-4" strokeWidth={2.5} />
  if (isCurrent) return <Clock3 className="size-4" strokeWidth={2.25} />
  return <span className="text-xs font-bold">{step.order + 1}</span>
}

function ApprovalFlow({
  request,
  compact = false,
}: {
  request: ApprovalRequest
  compact?: boolean
}) {
  const steps = [...request.steps].sort((a, b) => a.order - b.order)
  const approvedCount = steps.filter((step) => step.status === 'APPROVED').length
  const currentIndex =
    request.status === 'PENDING'
      ? steps.findIndex((step) => step.status === 'PENDING')
      : -1

  if (compact) {
    const currentStep = currentIndex >= 0 ? steps[currentIndex] : null

    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
        <span className="font-semibold text-text-secondary">
          {approvedCount}/{steps.length} 승인
        </span>
        {currentStep && (
          <>
            <span aria-hidden>·</span>
            <span>
              현재 <strong className="font-semibold text-brand-primary">{currentStep.approverName}</strong>
              {currentStep.approverPosition ? ` ${currentStep.approverPosition}` : ''}
            </span>
          </>
        )}
      </div>
    )
  }

  const progress = steps.length === 0 ? 0 : Math.round((approvedCount / steps.length) * 100)

  return (
    <section aria-labelledby={`approval-flow-${request.id}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id={`approval-flow-${request.id}`} className="text-sm font-semibold text-text-primary">
            결재 진행
          </h3>
          <p className="mt-1 text-xs text-text-muted">
            총 {steps.length}단계 중 {approvedCount}단계 승인
          </p>
        </div>
        <span className="text-xs font-medium text-text-muted">{progress}%</span>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-strong">
        <div
          className="h-full rounded-full bg-brand-primary transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-6 overflow-x-auto pb-1">
        <ol className="flex min-w-[32rem] sm:min-w-0">
          {steps.map((step, index) => {
            const isCurrent = currentIndex === index
            const label = stepLabel(step, isCurrent)

            return (
              <li key={step.id} className="relative flex min-w-36 flex-1 flex-col items-center px-3 text-center">
                {index < steps.length - 1 && (
                  <span
                    className={`absolute left-1/2 top-5 h-px w-full ${
                      step.status === 'APPROVED' ? 'bg-brand-primary' : 'bg-surface-border'
                    }`}
                    aria-hidden
                  />
                )}
                <span
                  className={`relative z-10 flex size-10 items-center justify-center rounded-full border-2 ${stepTone(step, isCurrent)}`}
                >
                  <StepIcon step={step} isCurrent={isCurrent} />
                </span>
                <strong className="mt-3 text-sm font-semibold text-text-primary">
                  {step.approverName}
                </strong>
                <span className="mt-0.5 text-xs text-text-muted">
                  {step.approverPosition || `${index + 1}차 결재자`}
                </span>
                <span
                  className={`mt-1.5 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    step.status === 'REJECTED'
                      ? 'bg-danger-glass text-destructive'
                      : step.status === 'APPROVED' || isCurrent
                        ? 'bg-brand-glass text-brand-primary'
                        : 'bg-surface-muted text-text-muted'
                  }`}
                >
                  {label}
                </span>
                {step.comment && (
                  <p className="mt-1 max-w-40 text-xs text-text-muted">“{step.comment}”</p>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

function InfoItem({
  label,
  value,
  emphasis = false,
}: {
  label: string
  value: ReactNode
  emphasis?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd
        className={`mt-1.5 truncate text-sm font-medium ${
          emphasis ? 'text-brand-primary' : 'text-text-primary'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

function AttachmentLinks({ items }: { items: Attachment[] }) {
  if (!items.length) return null

  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-surface-border-soft pt-4">
      {items.map((attachment) => (
        <a
          key={`${attachment.url}-${attachment.name}`}
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-surface-border-soft bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-brand-border hover:text-brand-primary"
        >
          <Paperclip className="size-3.5" />
          {attachment.name}
        </a>
      ))}
    </div>
  )
}

function MetaView({ meta }: { meta: ApprovalMeta }) {
  if (meta.kind === 'LEAVE') {
    return (
      <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <InfoItem label="휴가 유형" value={meta.leaveType} />
        <InfoItem label="시작일" value={meta.startDate} />
        <InfoItem label="종료일" value={meta.endDate} />
        <InfoItem label="사용 일수" value={`${meta.days}일`} emphasis />
      </dl>
    )
  }

  if (meta.kind === 'PURCHASE') {
    return (
      <>
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="품목" value={meta.itemName} />
          <InfoItem label="수량" value={`${meta.quantity.toLocaleString('ko-KR')}개`} />
          <InfoItem label="단가" value={won(meta.unitPrice)} />
          <InfoItem label="합계" value={won(meta.amount)} emphasis />
        </dl>
        <AttachmentLinks items={meta.attachments} />
      </>
    )
  }

  if (meta.kind === 'TRIP') {
    return (
      <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <InfoItem label="목적지" value={meta.destination} />
        <InfoItem label="시작일" value={meta.startDate} />
        <InfoItem label="종료일" value={meta.endDate} />
        <InfoItem label="예상 비용" value={won(meta.estimatedCost)} emphasis />
      </dl>
    )
  }

  if (meta.kind === 'EXPENSE') {
    return (
      <>
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="사용일" value={meta.useDate} />
          <InfoItem label="항목" value={meta.expenseType} />
          <InfoItem label="결제 수단" value={meta.paymentMethod} />
          <InfoItem label="금액" value={won(meta.amount)} emphasis />
        </dl>
        <AttachmentLinks items={meta.attachments} />
      </>
    )
  }

  if (!meta.fields.length) return null

  return (
    <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {meta.fields.map((field) => (
        <InfoItem
          key={field.id}
          label={field.label}
          value={field.value || <span className="text-text-muted">—</span>}
        />
      ))}
    </dl>
  )
}

export function ApprovalCard({
  req,
  canAct,
  onAct,
}: {
  req: ApprovalRequest
  canAct?: boolean
  onAct?: (id: string, action: 'APPROVED' | 'REJECTED', comment: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState('')
  const CategoryIcon = CATEGORY_ICON[req.category]

  return (
    <article
      className={`overflow-hidden rounded-lg bg-surface-raised shadow-sm transition-colors ${
        open ? 'border border-brand-border' : 'border border-surface-border-soft'
      }`}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`relative flex w-full items-center gap-4 px-5 py-4 text-left transition-colors sm:px-6 sm:py-5 ${
          open ? 'bg-brand-glass' : 'bg-surface-raised hover:bg-surface-muted/60'
        }`}
      >
        {open && (
          <span className="absolute inset-y-0 left-0 w-1 bg-brand-primary" aria-hidden />
        )}
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-glass">
          <CategoryIcon className="size-5 text-brand-primary" strokeWidth={2} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <strong className="truncate text-base font-semibold tracking-tight text-text-primary">
              {req.title}
            </strong>
            <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-muted">
              {CATEGORY_LABEL[req.category]}
            </span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <span>{req.submitterName}</span>
            <span aria-hidden>·</span>
            <time dateTime={req.createdAt}>
              {new Date(req.createdAt).toLocaleDateString('ko-KR')}
            </time>
          </span>
          <span className="mt-2 block">
            <ApprovalFlow request={req} compact />
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2">
          {canAct && req.status === 'PENDING' && (
            <span className="hidden rounded-full border border-brand-border bg-brand-glass px-2.5 py-1 text-xs font-semibold text-brand-primary md:inline-flex">
              내 결재 차례
            </span>
          )}
          <StatusBadge status={req.status} />
          <span className="flex size-8 items-center justify-center rounded-md text-text-muted">
            <ChevronDown
              className={`size-4 transition-transform duration-300 ease-out ${
                open ? 'rotate-180' : ''
              }`}
            />
          </span>
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden" inert={!open}>
          <div className="bg-surface-raised">
            {req.meta && (
              <section className="border-t border-surface-border-soft px-5 py-5 sm:px-6">
                <h3 className="mb-4 text-sm font-semibold text-text-primary">
                  {CATEGORY_LABEL[req.category]} 정보
                </h3>
                <div className="rounded-lg border border-surface-border-soft bg-surface-muted/70 p-4 sm:p-5">
                  <MetaView meta={req.meta} />
                </div>
              </section>
            )}

            <section className="border-t border-surface-border-soft bg-surface-muted/25 px-5 py-5 sm:px-6">
              <h3 className="text-sm font-semibold text-text-primary">신청 내용</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                {req.content}
              </p>
            </section>

            <section className="border-t border-surface-border-soft px-5 py-5 sm:px-6 sm:py-6">
              <ApprovalFlow request={req} />
            </section>

            {canAct && req.status === 'PENDING' && (
              <footer className="border-t border-surface-border-soft bg-brand-glass px-5 py-5 sm:px-6">
                <label htmlFor={`approval-comment-${req.id}`} className="text-sm font-semibold text-text-primary">
                  결재 의견 <span className="font-normal text-text-muted">(선택)</span>
                </label>
                <Textarea
                  id={`approval-comment-${req.id}`}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="승인 또는 반려 의견을 입력하세요"
                  rows={3}
                  className="mt-3 resize-none bg-surface-raised"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => onAct?.(req.id, 'REJECTED', comment)}
                    className="gap-2 rounded-lg border-destructive/30 bg-danger-glass text-destructive hover:bg-danger-glass"
                  >
                    <XCircle className="size-4" />
                    반려
                  </Button>
                  <Button
                    onClick={() => onAct?.(req.id, 'APPROVED', comment)}
                    className="gap-2 rounded-lg"
                  >
                    <CheckCircle2 className="size-4" />
                    승인
                  </Button>
                </div>
              </footer>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
