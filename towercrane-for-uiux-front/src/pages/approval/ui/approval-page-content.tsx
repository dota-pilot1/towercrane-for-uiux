import { useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Loader2,
  Paperclip,
  Plane,
  Plus,
  Receipt,
  Send,
  ShoppingCart,
  Trash2,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react'
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  STATUS_LABEL,
  useSubmitApproval,
  type ApprovalCategory,
  type ApprovalMeta,
  type ApprovalRequest,
  type ApprovalStatus,
  type Attachment,
  type ExpenseType,
  type FormField,
  type FormFieldType,
  type LeaveType,
  type PaymentMethod,
} from '../../../shared/api/approval'
import { useOrgTree, type OrgNode } from '../../../shared/api/org'
import { uploadFile } from '../../../shared/api/upload'
import { CompactSelect } from '../../../shared/ui/compact-select'

const CATEGORY_ICON: Record<
  ApprovalCategory,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  LEAVE: CalendarDays,
  PURCHASE: ShoppingCart,
  TRIP: Plane,
  EXPENSE: Receipt,
  PROPOSAL: FileText,
}

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

function uid() {
  try {
    return crypto.randomUUID()
  } catch {
    return `f_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  }
}

function calcDays(start: string, end: string) {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
  if (isNaN(+s) || isNaN(+e) || e < s) return 0
  return Math.round((+e - +s) / 86400000) + 1
}

function statusColor(status: ApprovalStatus) {
  switch (status) {
    case 'APPROVED':
      return 'text-brand-primary bg-brand-glass border-brand-border'
    case 'REJECTED':
      return 'text-destructive bg-danger-glass border-destructive/30'
    case 'CANCELLED':
      return 'text-text-muted bg-surface-muted border-surface-border'
    default:
      return 'text-text-secondary bg-surface-muted border-surface-border-soft'
  }
}

function StatusBadge({ status }: { status: ApprovalStatus }) {
  const Icon =
    status === 'APPROVED' ? CheckCircle2 : status === 'REJECTED' ? XCircle : Clock
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusColor(status)}`}
    >
      <Icon className="size-3" strokeWidth={2.5} />
      {STATUS_LABEL[status]}
    </span>
  )
}
function ApprovalFlow({ req, compact = false }: { req: ApprovalRequest; compact?: boolean }) {
  const steps = [...req.steps].sort((a, b) => a.order - b.order)
  const approvedCount = steps.filter((step) => step.status === 'APPROVED').length
  const currentIndex = req.status === 'PENDING'
    ? steps.findIndex((step) => step.status === 'PENDING')
    : -1

  if (compact) {
    const current = currentIndex >= 0 ? steps[currentIndex] : null
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-text-muted">
        <span className="font-bold text-text-secondary">
          {approvedCount}/{steps.length} 승인
        </span>
        {current && (
          <>
            <span>·</span>
            <span>
              현재 <strong className="text-brand-primary">{current.approverName}</strong>
              {current.approverPosition ? ` ${current.approverPosition}` : ''}
            </span>
          </>
        )}
      </div>
    )
  }

  const progress = steps.length === 0 ? 0 : Math.round((approvedCount / steps.length) * 100)

  return (
    <div className="rounded-xl border border-surface-border-soft bg-surface-muted/40 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-bold text-text-primary">결재 진행</p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            총 {steps.length}단계 중 {approvedCount}단계 승인
          </p>
        </div>
        <StatusBadge status={req.status} />
      </div>

      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-surface-strong">
        <div
          className="h-full rounded-full bg-brand-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, index) => {
          const isCurrent = currentIndex === index
          const isUpcoming = req.status === 'PENDING' && currentIndex >= 0 && index > currentIndex
          const isApproved = step.status === 'APPROVED'
          const isRejected = step.status === 'REJECTED'
          const isSkipped = step.status === 'SKIPPED'
          const label = isApproved
            ? '승인'
            : isRejected
              ? '반려'
              : isSkipped
                ? '건너뜀'
                : isCurrent
                  ? '결재 대기'
                  : '예정'

          return (
            <div
              key={step.id}
              className={`relative flex min-h-28 flex-col items-center justify-center rounded-lg border px-3 py-3 text-center ${
                isApproved
                  ? 'border-brand-border bg-brand-glass'
                  : isRejected
                    ? 'border-destructive/30 bg-danger-glass'
                    : isCurrent
                      ? 'border-brand-border bg-surface-raised shadow-sm'
                      : 'border-surface-border-soft bg-surface-raised opacity-65'
              }`}
            >
              <span className="absolute left-2 top-2 text-[10px] font-bold text-text-muted">
                {index + 1}차
              </span>
              <div
                className={`mb-2 flex size-12 items-center justify-center rounded-full border-2 text-[12px] font-black ${
                  isApproved
                    ? 'border-brand-border text-brand-primary'
                    : isRejected
                      ? 'border-destructive text-destructive'
                      : isCurrent
                        ? 'border-brand-border text-brand-primary'
                        : 'border-surface-border text-text-muted'
                }`}
              >
                {isApproved
                  ? '승인'
                  : isRejected
                    ? '반려'
                    : isSkipped
                      ? '제외'
                      : isCurrent
                        ? <Clock className="size-5" />
                        : '예정'}
              </div>
              <p className="text-[12px] font-bold text-text-primary">{step.approverName}</p>
              <p className="text-[10px] text-text-muted">{step.approverPosition || `${index + 1}차 결재자`}</p>
              <span
                className={`mt-1.5 text-[10px] font-bold ${
                  isApproved || isCurrent
                    ? 'text-brand-primary'
                    : isRejected
                      ? 'text-destructive'
                      : 'text-text-muted'
                }`}
              >
                {isUpcoming ? '예정' : label}
              </span>
              {step.comment && (
                <p className="mt-1 line-clamp-1 text-[10px] text-text-muted">“{step.comment}”</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
        {label}
      </span>
      <span className="text-[13px] text-text-primary">{value}</span>
    </div>
  )
}

function AttachmentChips({ items }: { items: Attachment[] }) {
  if (!items?.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((a, i) => (
        <a
          key={i}
          href={a.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-muted border border-surface-border-soft text-[11px] text-text-secondary hover:text-brand-primary transition-colors"
        >
          <Paperclip className="size-3" />
          {a.name}
        </a>
      ))}
    </div>
  )
}

function MetaView({ meta }: { meta: ApprovalMeta }) {
  if (meta.kind === 'LEAVE') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <KV label="휴가 종류" value={meta.leaveType} />
        <KV label="일수" value={`${meta.days}일`} />
        <KV label="시작일" value={meta.startDate} />
        <KV label="종료일" value={meta.endDate} />
      </div>
    )
  }
  if (meta.kind === 'PURCHASE') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <KV label="품목" value={meta.itemName} />
          <KV label="수량" value={`${meta.quantity.toLocaleString('ko-KR')}개`} />
          <KV label="단가" value={won(meta.unitPrice)} />
          <KV
            label="금액"
            value={<span className="font-bold text-brand-primary">{won(meta.amount)}</span>}
          />
        </div>
        <AttachmentChips items={meta.attachments} />
      </div>
    )
  }
  if (meta.kind === 'TRIP') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <KV label="목적지" value={meta.destination} />
        <KV label="예상 비용" value={won(meta.estimatedCost)} />
        <KV label="시작일" value={meta.startDate} />
        <KV label="종료일" value={meta.endDate} />
      </div>
    )
  }
  if (meta.kind === 'EXPENSE') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <KV label="사용일" value={meta.useDate} />
          <KV label="항목" value={meta.expenseType} />
          <KV label="결제 수단" value={meta.paymentMethod} />
          <KV
            label="금액"
            value={<span className="font-bold text-brand-primary">{won(meta.amount)}</span>}
          />
        </div>
        <AttachmentChips items={meta.attachments} />
      </div>
    )
  }
  if (!meta.fields.length) return null
  return (
    <div className="grid grid-cols-2 gap-3">
      {meta.fields.map((f) => (
        <KV key={f.id} label={f.label} value={f.value || <span className="text-text-muted">—</span>} />
      ))}
    </div>
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
  const CatIcon = CATEGORY_ICON[req.category]

  return (
    <div className="ui-panel-soft rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted/60 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex size-8 items-center justify-center rounded-lg bg-brand-glass border border-brand-border shrink-0">
          <CatIcon className="size-4 text-brand-primary" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-bold text-text-primary truncate">{req.title}</span>
            <span className="text-[11px] font-semibold text-text-muted bg-surface-muted px-1.5 py-0.5 rounded">
              {CATEGORY_LABEL[req.category]}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-text-muted">
            <span>{req.submitterName}</span>
            <span>·</span>
            <span>{new Date(req.createdAt).toLocaleDateString('ko-KR')}</span>
          </div>
          <div className="mt-1.5">
            <ApprovalFlow req={req} compact />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canAct && req.status === 'PENDING' && (
            <span className="hidden rounded-full border border-brand-border bg-brand-glass px-2 py-0.5 text-[10px] font-bold text-brand-primary sm:inline-flex">
              내 결재 차례
            </span>
          )}
          <StatusBadge status={req.status} />
          {open ? (
            <ChevronUp className="size-4 text-text-muted" />
          ) : (
            <ChevronDown className="size-4 text-text-muted" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-surface-border-soft px-4 py-3 space-y-4">
          {req.meta && (
            <div className="rounded-lg bg-surface-muted/50 border border-surface-border-soft p-3">
              <MetaView meta={req.meta} />
            </div>
          )}

          <p className="text-[13px] text-text-secondary whitespace-pre-wrap leading-relaxed">
            {req.content}
          </p>

          <ApprovalFlow req={req} />

          {canAct && req.status === 'PENDING' && (
            <div className="space-y-2 pt-1 border-t border-surface-border-soft">
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                결재 의견 (선택)
              </p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="승인/반려 사유를 입력하세요"
                rows={2}
                className="ui-input h-auto py-2 w-full resize-none text-[13px]"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onAct?.(req.id, 'APPROVED', comment)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-glass border border-brand-border text-brand-primary text-[13px] font-bold hover:opacity-80 transition-opacity"
                >
                  <CheckCircle2 className="size-4" />
                  승인
                </button>
                <button
                  onClick={() => onAct?.(req.id, 'REJECTED', comment)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-danger-glass border border-destructive/30 text-destructive text-[13px] font-bold hover:opacity-80 transition-opacity"
                >
                  <XCircle className="size-4" />
                  반려
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[12px] font-bold text-text-secondary">{label}</label>
      {children}
    </div>
  )
}

function AttachmentUploader({
  files,
  onChange,
}: {
  files: Attachment[]
  onChange: (f: Attachment[]) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return
    setUploading(true)
    setErr(null)
    try {
      const uploaded: Attachment[] = []
      for (const file of Array.from(list)) {
        const url = await uploadFile(file)
        uploaded.push({ name: file.name, url, size: file.size, contentType: file.type })
      }
      onChange([...files, ...uploaded])
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border bg-surface-raised text-[12px] font-semibold text-text-secondary hover:border-brand-border hover:text-brand-primary transition-colors disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Paperclip className="size-3.5" />
        )}
        {uploading ? '업로드 중…' : '파일 첨부'}
      </button>
      {err && <p className="text-[12px] text-destructive">{err}</p>}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-surface-muted border border-surface-border-soft"
            >
              <Paperclip className="size-3.5 text-text-muted shrink-0" />
              <span className="flex-1 min-w-0 truncate text-[12px] text-text-primary">{f.name}</span>
              <span className="text-[11px] text-text-muted shrink-0">
                {f.size ? `${(f.size / 1024).toFixed(0)}KB` : ''}
              </span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                className="text-text-muted hover:text-destructive transition-colors shrink-0"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type PickedApprover = { id: string; name: string; position: string | null }

function OrgPickerNode({
  node,
  depth,
  pickedIds,
  onPick,
}: {
  node: OrgNode
  depth: number
  pickedIds: Set<string>
  onPick: (m: PickedApprover) => void
}) {
  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1 text-[11px] font-bold text-text-muted uppercase tracking-wider"
        style={{ paddingLeft: depth * 12 }}
      >
        <Building2 className="size-3.5" />
        {node.name}
      </div>
      {node.members.map((m) => {
        const picked = pickedIds.has(m.id)
        return (
          <button
            key={m.id}
            type="button"
            disabled={picked}
            onClick={() => onPick({ id: m.id, name: m.name, position: m.position })}
            className="w-full flex items-center gap-2 py-1.5 pr-2 rounded-md hover:bg-surface-muted transition-colors disabled:opacity-40 disabled:hover:bg-transparent text-left"
            style={{ paddingLeft: depth * 12 + 20 }}
          >
            <span className="flex-1 min-w-0 truncate text-[13px] text-text-primary">
              {m.name}
              {m.position && <span className="text-[11px] text-text-muted ml-1">{m.position}</span>}
            </span>
            {picked ? (
              <CheckCircle2 className="size-4 text-brand-primary shrink-0" />
            ) : (
              <UserPlus className="size-4 text-text-muted shrink-0" />
            )}
          </button>
        )
      })}
      {node.children.map((c) => (
        <OrgPickerNode key={c.id} node={c} depth={depth + 1} pickedIds={pickedIds} onPick={onPick} />
      ))}
    </div>
  )
}

function ApproverPicker({
  approvers,
  onChange,
}: {
  approvers: PickedApprover[]
  onChange: (a: PickedApprover[]) => void
}) {
  const orgQuery = useOrgTree()
  const pickedIds = useMemo(() => new Set(approvers.map((a) => a.id)), [approvers])

  const add = (m: PickedApprover) => {
    if (pickedIds.has(m.id)) return
    if (approvers.length >= 5) return
    onChange([...approvers, m])
  }
  const remove = (id: string) => onChange(approvers.filter((a) => a.id !== id))
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...approvers]
    const j = idx + dir
    if (j < 0 || j >= next.length) return
    ;[next[idx], next[j]] = [next[j], next[idx]]
    onChange(next)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
          결재선 (순서대로 · 최대 5)
        </p>
        {approvers.length === 0 ? (
          <div className="flex items-center justify-center h-24 rounded-lg border border-dashed border-surface-border text-[12px] text-text-muted">
            오른쪽에서 결재자를 선택하세요
          </div>
        ) : (
          <div className="space-y-1.5">
            {approvers.map((a, idx) => (
              <div
                key={a.id}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-muted border border-surface-border-soft"
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-brand-glass text-brand-primary text-[11px] font-bold shrink-0">
                  {idx + 1}
                </span>
                <span className="flex-1 min-w-0 truncate text-[13px] text-text-primary">
                  {a.name}
                  {a.position && <span className="text-[11px] text-text-muted ml-1">{a.position}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === approvers.length - 1}
                  className="text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
                >
                  <ArrowDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  className="text-text-muted hover:text-destructive transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">조직도</p>
        <div className="h-56 overflow-y-auto rounded-lg border border-surface-border-soft bg-surface-raised p-2">
          {orgQuery.isLoading && (
            <p className="text-[12px] text-text-muted p-2">조직도 불러오는 중…</p>
          )}
          {orgQuery.error && (
            <p className="text-[12px] text-destructive p-2">{(orgQuery.error as Error).message}</p>
          )}
          {orgQuery.data?.map((node) => (
            <OrgPickerNode key={node.id} node={node} depth={0} pickedIds={pickedIds} onPick={add} />
          ))}
          {orgQuery.data?.length === 0 && (
            <p className="text-[12px] text-text-muted p-2">조직도에 등록된 부서가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}

const FIELD_TYPE_LABEL: Record<FormFieldType, string> = {
  text: '텍스트',
  textarea: '여러 줄',
  number: '숫자',
  date: '날짜',
  select: '선택',
}

function FormBuilder({
  fields,
  onChange,
}: {
  fields: FormField[]
  onChange: (f: FormField[]) => void
}) {
  const update = (id: string, patch: Partial<FormField>) =>
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  const remove = (id: string) => onChange(fields.filter((f) => f.id !== id))
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...fields]
    const j = idx + dir
    if (j < 0 || j >= next.length) return
    ;[next[idx], next[j]] = [next[j], next[idx]]
    onChange(next)
  }
  const addField = () => onChange([...fields, { id: uid(), label: '', type: 'text', value: '' }])

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-surface-border text-[12px] text-text-muted">
          "필드 추가"로 원하는 양식을 직접 구성하세요
        </div>
      )}
      {fields.map((f, idx) => (
        <div
          key={f.id}
          className="rounded-lg border border-surface-border-soft bg-surface-muted/40 p-3 space-y-2"
        >
          <div className="flex items-center gap-2">
            <input
              value={f.label}
              onChange={(e) => update(f.id, { label: e.target.value })}
              placeholder="항목 이름 (예: 예산)"
              className="ui-input flex-1"
            />
            <CompactSelect
              wrapperClassName="w-28"
              value={f.type}
              onChange={(e) => {
                const type = e.target.value as FormFieldType
                update(f.id, {
                  type,
                  value: '',
                  options: type === 'select' ? (f.options ?? []) : undefined,
                })
              }}
            >
              {(Object.keys(FIELD_TYPE_LABEL) as FormFieldType[]).map((t) => (
                <option key={t} value={t}>
                  {FIELD_TYPE_LABEL[t]}
                </option>
              ))}
            </CompactSelect>
            <button
              type="button"
              onClick={() => move(idx, -1)}
              disabled={idx === 0}
              className="text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
            >
              <ArrowUp className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => move(idx, 1)}
              disabled={idx === fields.length - 1}
              className="text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
            >
              <ArrowDown className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => remove(f.id)}
              className="text-text-muted hover:text-destructive transition-colors"
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          {f.type === 'select' && (
            <input
              value={(f.options ?? []).join(', ')}
              onChange={(e) =>
                update(f.id, {
                  options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
              placeholder="선택지 (쉼표로 구분: 예 · 아니오)"
              className="ui-input w-full"
            />
          )}

          {f.type === 'textarea' ? (
            <textarea
              value={f.value}
              onChange={(e) => update(f.id, { value: e.target.value })}
              placeholder="값 입력"
              rows={2}
              className="ui-input h-auto py-2 w-full resize-none"
            />
          ) : f.type === 'select' ? (
            <CompactSelect
              wrapperClassName="w-full"
              value={f.value}
              onChange={(e) => update(f.id, { value: e.target.value })}
            >
              <option value="">선택하세요</option>
              {(f.options ?? []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </CompactSelect>
          ) : (
            <input
              type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
              value={f.value}
              onChange={(e) => update(f.id, { value: e.target.value })}
              placeholder="값 입력"
              className="ui-input w-full"
            />
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addField}
        className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-primary hover:opacity-70 transition-opacity"
      >
        <Plus className="size-3.5" /> 필드 추가
      </button>
    </div>
  )
}

export function SubmitForm({ onSuccess }: { onSuccess: () => void }) {
  const [category, setCategory] = useState<ApprovalCategory>('LEAVE')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [approvers, setApprovers] = useState<PickedApprover[]>([])
  const [error, setError] = useState<string | null>(null)

  const [leaveType, setLeaveType] = useState<LeaveType>('연차')
  const [leaveStart, setLeaveStart] = useState('')
  const [leaveEnd, setLeaveEnd] = useState('')
  const [itemName, setItemName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [purchaseFiles, setPurchaseFiles] = useState<Attachment[]>([])
  const [destination, setDestination] = useState('')
  const [tripStart, setTripStart] = useState('')
  const [tripEnd, setTripEnd] = useState('')
  const [estimatedCost, setEstimatedCost] = useState('')
  const [useDate, setUseDate] = useState('')
  const [expenseType, setExpenseType] = useState<ExpenseType>('식대')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('개인')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseFiles, setExpenseFiles] = useState<Attachment[]>([])
  const [formFields, setFormFields] = useState<FormField[]>([])

  const leaveDays = leaveType === '반차' ? 0.5 : calcDays(leaveStart, leaveEnd)
  const purchaseAmount = (Number(quantity) || 0) * (Number(unitPrice) || 0)

  const submit = useSubmitApproval()

  const resetAll = () => {
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

  const handleSubmit = (e: React.FormEvent) => {
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
          resetAll()
          onSuccess()
        },
        onError: (err: Error) => setError(err.message),
      },
    )
  }

  const contentLabel = category === 'PROPOSAL' ? '비고 / 배경 설명' : '사유 / 상세 내용'

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
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
            <FormBuilder fields={formFields} onChange={setFormFields} />
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

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-surface-border-soft pt-4">
        {error && (
          <p className="mr-auto text-[13px] font-medium text-destructive">{error}</p>
        )}
        <button
          type="submit"
          disabled={submit.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-6 py-2.5 text-[13px] font-bold text-text-on-brand shadow-sm transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="size-4" />
          {submit.isPending ? '상신 중…' : '결재 상신'}
        </button>
      </div>
    </form>
  )
}
