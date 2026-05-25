import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useSessionStore } from '../../../shared/store/session-store'
import {
  Bot,
  BookOpen,
  CheckCircle2,
  Code2,
  FileImage,
  XCircle,
  Undo2,
  ClipboardList,
  ShieldCheck,
  KeyRound,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Ban,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '../../../shared/lib/utils'
import { apiRequest } from '../../../shared/api/http'
import { Button } from '../../../shared/ui/button'

async function submitRequest(body: {
  serviceType: string; purpose: string; estimatedUsage: string; securityLevel: string
}) {
  return apiRequest('/ai-service-requests', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

type StepStatus = 'completed' | 'current' | 'pending' | 'rejected'

type HistoryItem = {
  id: string
  title: string
  time: string
  actor: string
  status: 'completed' | 'current' | 'rejected'
}

type FormData = {
  serviceType: string
  purpose: string
  estimatedUsage: string
  securityLevel: string
}

const STEPS = [
  { id: 1, label: '신청서 작성', icon: ClipboardList },
  { id: 2, label: '팀장 승인', icon: ShieldCheck },
  { id: 3, label: 'AI 관리자 검토', icon: Bot },
  { id: 4, label: '권한 발급', icon: KeyRound },
]

const SERVICE_TYPES = [
  { value: 'chatbot', label: '사내 AI 챗봇', desc: 'FAQ · 개발 자료 기반 내부 질의응답', icon: Bot },
  { value: 'api', label: 'API Key 발급', desc: 'LLM API 직접 연동 · 개발 목적', icon: Code2 },
  { value: 'account', label: '아이디 발급', desc: 'Claude Max · Copilot 등 외부 AI 계정', icon: KeyRound },
]

const USAGE_OPTIONS = [
  { value: 'low', label: '소규모', desc: '월 5만 토큰 이하' },
  { value: 'medium', label: '중규모', desc: '월 5~20만 토큰' },
  { value: 'large', label: '대규모', desc: '월 20만 토큰 초과' },
]

const SECURITY_LEVELS = [
  { value: 'internal', label: '내부 업무용', desc: '사내 공개 정보 처리' },
  { value: 'confidential', label: '제한적 기밀', desc: '일부 내부 기밀 포함 가능' },
]

function StepHeader({
  currentStep,
  stepStatuses,
  onStepClick,
}: {
  currentStep: number
  stepStatuses: StepStatus[]
  onStepClick: (step: number) => void
}) {
  const progressPct = ((currentStep - 1) / (STEPS.length - 1)) * 100

  return (
    <div className="min-w-[640px] px-2 py-4">
      <div className="relative grid grid-cols-4">
        {/* Background progress track */}
        <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-5 h-1 overflow-hidden rounded-full bg-surface-border-soft">
          <div
            className="h-full bg-brand-primary transition-all duration-500 ease-out shadow-[0_0_8px_var(--brand-primary)]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        
        {STEPS.map((step, idx) => {
          const status = stepStatuses[idx]
          const isClickable = status === 'completed'
          const Icon = step.icon

          return (
            <div key={step.id} className="relative">
              <button
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                aria-current={currentStep === step.id ? 'step' : undefined}
                className={cn(
                  'group relative flex w-full min-w-0 flex-col items-center gap-2 px-2 py-1.5 text-center transition-all',
                  isClickable ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default',
                )}
              >
                <div
                  className={cn(
                    'relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-black shadow-sm transition-all duration-300',
                    status === 'completed'
                      ? 'border-brand-primary bg-brand-glass text-brand-primary shadow-2xs hover:scale-105'
                      : status === 'current'
                        ? 'border-brand-border bg-surface-raised text-brand-primary ring-4 ring-brand-border/10 scale-105 shadow-[0_8px_20px_color-mix(in_srgb,var(--brand-primary)_15%,transparent)]'
                        : status === 'rejected'
                          ? 'border-destructive bg-danger-glass text-destructive'
                          : 'border-surface-border-soft bg-surface-muted/50 text-text-muted',
                    isClickable && 'group-hover:border-brand-border group-hover:bg-brand-glass group-hover:text-brand-primary',
                  )}
                >
                  {status === 'completed' ? (
                    <CheckCircle2 className="size-4 text-brand-primary" />
                  ) : status === 'rejected' ? (
                    <XCircle className="size-4 text-destructive" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </div>
                <div
                  className={cn(
                    'min-w-0 rounded-lg px-3 py-1.5 transition-all duration-200',
                    status === 'current' && 'bg-brand-glass/40 border border-brand-border/10',
                    isClickable && 'group-hover:bg-surface-muted group-hover:border border-transparent',
                  )}
                >
                  <p
                    className={cn(
                      'text-[9px] font-black uppercase tracking-widest text-text-muted transition-colors',
                      status === 'current' && 'text-brand-primary',
                    )}
                  >
                    Step {step.id}
                  </p>
                  <p
                    className={cn(
                      'truncate text-xs font-extrabold transition-colors',
                      status === 'current'
                        ? 'text-brand-primary'
                        : status === 'completed'
                          ? 'text-text-primary font-bold'
                          : 'text-text-muted',
                    )}
                  >
                    {step.label}
                  </p>
                </div>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ACTIVE_STATUSES = ['pending', 'manager_approved', 'admin_approved', 'active']

function Step1Form({
  form,
  onChange,
  onSubmit,
  isLoading,
  activeServiceTypes = [],
}: {
  form: FormData
  onChange: (f: FormData) => void
  onSubmit: () => void
  isLoading?: boolean
  activeServiceTypes?: string[]
}) {
  const [submitted, setSubmitted] = useState(false)

  const errors = {
    serviceType: !form.serviceType ? '서비스를 선택해주세요.' : '',
    purpose: form.purpose.trim().length < 5 ? '사용 목적을 5자 이상 입력해주세요.' : '',
    estimatedUsage: !form.estimatedUsage ? '예상 사용량을 선택해주세요.' : '',
    securityLevel: !form.securityLevel ? '보안 등급을 선택해주세요.' : '',
  }
  const isValid = !Object.values(errors).some(Boolean)

  function handleSubmitClick() {
    setSubmitted(true)
    if (isValid) onSubmit()
  }

  const showErr = (key: keyof typeof errors) => submitted && errors[key]

  return (
    <div className="space-y-7 p-6">
      {/* 서비스 선택 */}
      <div>
        <p className="text-xs font-bold ui-text-secondary mb-3">신청 서비스 선택 <span className="text-destructive">*</span></p>
        <div className="grid grid-cols-3 gap-3">
          {SERVICE_TYPES.map((s) => {
            const Icon = s.icon
            const selected = form.serviceType === s.value
            const alreadyApplied = activeServiceTypes.includes(s.value)
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => !alreadyApplied && onChange({ ...form, serviceType: s.value })}
                disabled={alreadyApplied}
                className={cn(
                  'relative rounded-xl border-2 p-4 text-left transition-all duration-150',
                  alreadyApplied
                    ? 'border-surface-border bg-surface-muted opacity-60 cursor-not-allowed'
                    : selected
                    ? 'border-brand-border bg-brand-glass shadow-[0_4px_16px_color-mix(in_srgb,var(--brand-primary)_18%,transparent)] hover:-translate-y-0.5'
                    : 'border-surface-border bg-surface-raised shadow-sm hover:border-brand-border/40 hover:shadow-md hover:-translate-y-0.5',
                )}
              >
                {alreadyApplied ? (
                  <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-surface-strong px-2 py-0.5 text-[10px] font-bold ui-text-muted">
                    <Ban className="size-2.5" /> 신청 완료
                  </span>
                ) : selected ? (
                  <span className="absolute right-2.5 top-2.5 flex size-4 items-center justify-center rounded-full bg-brand-primary">
                    <CheckCircle2 className="size-3 text-background" />
                  </span>
                ) : null}
                <div className={cn(
                  'mb-2.5 flex size-9 items-center justify-center rounded-lg border transition-colors',
                  alreadyApplied
                    ? 'border-surface-border bg-surface-muted ui-text-muted'
                    : selected
                    ? 'border-brand-border bg-brand-primary/10 text-brand-primary'
                    : 'border-surface-border bg-surface-muted ui-text-muted',
                )}>
                  <Icon className="size-4" />
                </div>
                <p className={cn('text-sm font-bold leading-tight', selected && !alreadyApplied ? 'text-brand-primary' : 'ui-text-primary')}>
                  {s.label}
                </p>
                <p className="mt-1 text-[11px] ui-text-muted leading-relaxed">{s.desc}</p>
              </button>
            )
          })}
        </div>
        {showErr('serviceType') && (
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-destructive">
            <AlertCircle className="size-3 shrink-0" />{errors.serviceType}
          </p>
        )}
      </div>

      {/* 사용 목적 */}
      <div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold ui-text-secondary">
            사용 목적 <span className="text-destructive">*</span>
            <span className="ml-1 font-normal ui-text-muted">(최소 5자)</span>
          </span>
          <textarea
            value={form.purpose}
            onChange={(e) => onChange({ ...form, purpose: e.target.value })}
            placeholder="AI 서비스를 어떤 업무에 활용할 계획인지 구체적으로 입력하세요."
            rows={4}
            className={cn(
              'w-full rounded-lg border bg-surface-raised px-3 py-2.5 text-sm leading-relaxed ui-text-primary placeholder:ui-text-muted outline-none resize-none transition-all',
              showErr('purpose')
                ? 'border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/10'
                : 'border-surface-border focus:border-brand-border focus:ring-2 focus:ring-brand-border/10',
            )}
          />
          <div className="flex items-center justify-between">
            {showErr('purpose') ? (
              <p className="flex items-center gap-1 text-[11px] text-destructive">
                <AlertCircle className="size-3 shrink-0" />{errors.purpose}
              </p>
            ) : <span />}
            <span className={`text-[10px] ${form.purpose.length < 5 ? 'text-destructive' : 'ui-text-muted'}`}>
              {form.purpose.length}자
            </span>
          </div>
        </label>
      </div>

      {/* 예상 사용량 + 보안 등급 */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <p className="text-xs font-bold ui-text-secondary mb-2.5">
            예상 사용량 <span className="text-destructive">*</span>
          </p>
          <div className="space-y-2">
            {USAGE_OPTIONS.map((u) => {
              const selected = form.estimatedUsage === u.value
              return (
                <button
                  key={u.value}
                  type="button"
                  onClick={() => onChange({ ...form, estimatedUsage: u.value })}
                  className={cn(
                    'w-full rounded-lg border-2 px-3.5 py-2.5 text-left transition-all duration-100 hover:-translate-y-px',
                    selected
                      ? 'border-brand-border bg-brand-glass shadow-[0_2px_8px_color-mix(in_srgb,var(--brand-primary)_15%,transparent)]'
                      : 'border-surface-border bg-surface-raised shadow-sm hover:border-brand-border/40 hover:shadow',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className={cn('text-xs font-bold', selected ? 'text-brand-primary' : 'ui-text-primary')}>{u.label}</p>
                    {selected && <CheckCircle2 className="size-3.5 text-brand-primary shrink-0" />}
                  </div>
                  <p className="mt-0.5 text-[10px] ui-text-muted">{u.desc}</p>
                </button>
              )
            })}
          </div>
          {showErr('estimatedUsage') && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-destructive">
              <AlertCircle className="size-3 shrink-0" />{errors.estimatedUsage}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs font-bold ui-text-secondary mb-2.5">
            보안 등급 <span className="text-destructive">*</span>
          </p>
          <div className="space-y-2">
            {SECURITY_LEVELS.map((s) => {
              const selected = form.securityLevel === s.value
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => onChange({ ...form, securityLevel: s.value })}
                  className={cn(
                    'w-full rounded-lg border-2 px-3.5 py-2.5 text-left transition-all duration-100 hover:-translate-y-px',
                    selected
                      ? 'border-brand-border bg-brand-glass shadow-[0_2px_8px_color-mix(in_srgb,var(--brand-primary)_15%,transparent)]'
                      : 'border-surface-border bg-surface-raised shadow-sm hover:border-brand-border/40 hover:shadow',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className={cn('text-xs font-bold', selected ? 'text-brand-primary' : 'ui-text-primary')}>{s.label}</p>
                    {selected && <CheckCircle2 className="size-3.5 text-brand-primary shrink-0" />}
                  </div>
                  <p className="mt-0.5 text-[10px] ui-text-muted">{s.desc}</p>
                </button>
              )
            })}
          </div>
          {showErr('securityLevel') && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-destructive">
              <AlertCircle className="size-3 shrink-0" />{errors.securityLevel}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end pt-1">
        <button
          onClick={handleSubmitClick}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-glass px-5 py-2.5 text-sm font-bold text-brand-primary transition-all hover:bg-brand-glass/80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ClipboardList className="size-4" />
          {isLoading ? '제출 중...' : '신청서 제출'}
        </button>
      </div>

      {/* 위에서 정중앙으로 떨어지는 유효성 경고 다이어로그 */}
      <AnimatePresence>
        {submitted && !isValid && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
            <motion.div
              key="validation-dialog"
              initial={{ y: -480, opacity: 0, scale: 0.88 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -480, opacity: 0, scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 340, damping: 22, mass: 1.2 }}
              className="pointer-events-auto w-[420px] rounded-3xl border border-destructive/25 bg-surface-raised shadow-[0_24px_64px_rgba(0,0,0,0.28)] overflow-hidden"
            >
              {/* 상단 컬러 바 */}
              <div className="h-1.5 w-full bg-destructive/80" />

              <div className="px-8 py-7 flex flex-col items-center text-center gap-5">
                {/* 아이콘 */}
                <motion.div
                  initial={{ scale: 0.5, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.08 }}
                  className="flex size-16 items-center justify-center rounded-full bg-destructive/10 border-2 border-destructive/20"
                >
                  <AlertCircle className="size-8 text-destructive" />
                </motion.div>

                {/* 텍스트 */}
                <div className="space-y-1.5">
                  <p className="text-xl font-black text-destructive">필수 항목 미입력</p>
                  <p className="text-sm ui-text-secondary leading-relaxed">
                    아래 빨간색으로 표시된 항목을 모두 채워야<br />신청서를 제출할 수 있습니다.
                  </p>
                </div>

                {/* 에러 목록 */}
                <div className="w-full rounded-xl border border-destructive/15 bg-destructive/5 px-4 py-3 space-y-1.5">
                  {(Object.entries(errors) as [keyof typeof errors, string][])
                    .filter(([, msg]) => msg)
                    .map(([key, msg]) => (
                      <div key={key} className="flex items-center gap-2 text-xs text-destructive">
                        <AlertCircle className="size-3 shrink-0" />
                        {msg}
                      </div>
                    ))}
                </div>

                {/* 닫기 버튼 */}
                <button
                  onClick={() => setSubmitted(false)}
                  className="w-full rounded-xl bg-destructive/10 border border-destructive/20 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/15 transition-colors active:scale-95"
                >
                  확인 후 수정하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function RequestSummary({ form }: { form: FormData }) {
  const serviceLabel = SERVICE_TYPES.find((s) => s.value === form.serviceType)?.label ?? form.serviceType
  const usageLabel = USAGE_OPTIONS.find((u) => u.value === form.estimatedUsage)?.label ?? form.estimatedUsage
  const securityLabel = SECURITY_LEVELS.find((s) => s.value === form.securityLevel)?.label ?? form.securityLevel

  return (
    <dl className="rounded-lg border border-surface-border-soft bg-surface-muted p-4 space-y-3">
      <div className="flex justify-between gap-3">
        <dt className="text-xs font-bold ui-text-muted">신청 서비스</dt>
        <dd className="text-xs font-semibold ui-text-primary">{serviceLabel}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-xs font-bold ui-text-muted">예상 사용량</dt>
        <dd className="text-xs font-semibold ui-text-primary">{usageLabel}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-xs font-bold ui-text-muted">보안 등급</dt>
        <dd className="text-xs font-semibold ui-text-primary">{securityLabel}</dd>
      </div>
      <div className="border-t border-surface-border-soft pt-3">
        <dt className="text-xs font-bold ui-text-muted mb-1">사용 목적</dt>
        <dd className="text-xs leading-5 ui-text-secondary">{form.purpose}</dd>
      </div>
    </dl>
  )
}

function Step2Content({
  form,
  onAction,
}: {
  form: FormData
  onAction: (action: '승인' | '반려' | '보완 요청') => void
}) {
  return (
    <div className="space-y-5 p-6">
      <div className="rounded-lg border border-brand-border/30 bg-brand-glass/50 px-4 py-3">
        <p className="text-xs font-bold text-brand-primary">팀장 승인 대기 중</p>
        <p className="mt-0.5 text-[11px] ui-text-secondary">업무 목적과 사용 범위를 확인하고 1차 승인합니다.</p>
      </div>

      <div>
        <p className="text-xs font-bold ui-text-secondary mb-2">신청 내용 요약</p>
        <RequestSummary form={form} />
      </div>

      <div>
        <p className="text-xs font-bold ui-text-secondary mb-1">팀장 검토 항목</p>
        <ul className="space-y-1.5">
          {['업무 목적이 명확한가?', '사용 범위가 적절한가?', '보안 등급이 올바른가?'].map((item) => (
            <li key={item} className="flex items-center gap-2 text-xs ui-text-secondary">
              <CheckCircle2 className="size-3.5 text-brand-primary shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          onClick={() => onAction('승인')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-brand-glass px-4 py-2 text-xs font-bold text-brand-primary transition-all hover:bg-brand-glass/80 active:scale-95"
        >
          <CheckCircle2 className="size-3.5" /> 승인
        </button>
        <button
          onClick={() => onAction('보완 요청')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-4 py-2 text-xs font-bold ui-text-primary transition-all hover:bg-surface-muted active:scale-95"
        >
          <Undo2 className="size-3.5" /> 보완 요청
        </button>
        <button
          onClick={() => onAction('반려')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-danger-glass px-4 py-2 text-xs font-bold text-destructive transition-all active:scale-95"
        >
          <XCircle className="size-3.5" /> 반려
        </button>
      </div>
    </div>
  )
}

function Step3Content({
  form,
  onAction,
}: {
  form: FormData
  onAction: (action: '승인' | '반려') => void
}) {
  const securityLabel = SECURITY_LEVELS.find((s) => s.value === form.securityLevel)?.label ?? ''

  return (
    <div className="space-y-5 p-6">
      <div className="rounded-lg border border-brand-border/30 bg-brand-glass/50 px-4 py-3">
        <p className="text-xs font-bold text-brand-primary">AI 관리자 검토 중</p>
        <p className="mt-0.5 text-[11px] ui-text-secondary">권한 범위, 보안 기준, 모델 정책을 검토합니다.</p>
      </div>

      <div>
        <p className="text-xs font-bold ui-text-secondary mb-2">신청 내용 요약</p>
        <RequestSummary form={form} />
      </div>

      <div>
        <p className="text-xs font-bold ui-text-secondary mb-2">보안 체크리스트</p>
        <div className="space-y-2">
          {[
            { label: '고객 개인정보 미포함 확인', pass: form.securityLevel === 'internal' },
            { label: '모델 정책 범위 내 사용 용도', pass: true },
            { label: '월 토큰 한도 적정성', pass: form.estimatedUsage !== 'large' },
            { label: `보안 등급 검토: ${securityLabel}`, pass: true },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2">
              <span className="text-xs ui-text-secondary">{item.label}</span>
              <span className={`text-[10px] font-bold ${item.pass ? 'text-brand-primary' : 'text-destructive'}`}>
                {item.pass ? '✓ 통과' : '✕ 확인 필요'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => onAction('승인')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-brand-glass px-4 py-2 text-xs font-bold text-brand-primary transition-all hover:bg-brand-glass/80 active:scale-95"
        >
          <CheckCircle2 className="size-3.5" /> 승인 및 권한 발급
        </button>
        <button
          onClick={() => onAction('반려')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-danger-glass px-4 py-2 text-xs font-bold text-destructive transition-all active:scale-95"
        >
          <XCircle className="size-3.5" /> 반려
        </button>
      </div>
    </div>
  )
}

function Step4Content({ form, onNavigate }: { form: FormData; onNavigate: () => void }) {
  const serviceLabel = SERVICE_TYPES.find((s) => s.value === form.serviceType)?.label ?? ''
  const usageLabel = USAGE_OPTIONS.find((u) => u.value === form.estimatedUsage)?.label ?? ''

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-brand-border bg-brand-glass py-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-brand-primary/10">
          <Sparkles className="size-7 text-brand-primary" />
        </div>
        <div>
          <p className="text-lg font-black text-brand-primary">권한 발급 완료</p>
          <p className="mt-1 text-xs ui-text-secondary">AI 서비스를 사용할 수 있습니다.</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold ui-text-secondary mb-2">발급된 권한</p>
        <dl className="rounded-lg border border-surface-border-soft bg-surface-muted p-4 space-y-3">
          <div className="flex justify-between">
            <dt className="text-xs font-bold ui-text-muted">서비스</dt>
            <dd className="text-xs font-semibold text-brand-primary">{serviceLabel}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-xs font-bold ui-text-muted">월 한도</dt>
            <dd className="text-xs font-semibold ui-text-primary">
              {usageLabel === '소규모' ? '5만 토큰' : usageLabel === '중규모' ? '20만 토큰' : '무제한 (별도 협의)'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-xs font-bold ui-text-muted">만료일</dt>
            <dd className="text-xs font-semibold ui-text-primary">3개월 후 갱신 필요</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-xs font-bold ui-text-muted">발급 주체</dt>
            <dd className="text-xs font-semibold ui-text-primary">AI 관리자</dd>
          </div>
        </dl>
      </div>

      <button
        onClick={onNavigate}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-brand-border bg-brand-glass py-3 text-sm font-bold text-brand-primary transition-all hover:bg-brand-glass/80 active:scale-95"
      >
        <ExternalLink className="size-4" />
        AI 챗봇 사용하러 가기
      </button>
    </div>
  )
}

function RejectedContent({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 p-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <XCircle className="size-7 text-destructive" />
      </div>
      <div>
        <p className="text-lg font-black text-destructive">신청 반려</p>
        <p className="mt-1 text-sm ui-text-secondary">신청이 반려되었습니다. 내용을 수정 후 재신청해주세요.</p>
      </div>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-2.5 text-sm font-bold ui-text-primary transition-all hover:bg-surface-muted active:scale-95"
      >
        <Undo2 className="size-4" />
        재신청하기
      </button>
    </div>
  )
}

export function AiServiceRequestPage() {
  const navigate = useNavigate()
  const user = useSessionStore((s) => s.user)
  const [currentStep, setCurrentStep] = useState(1)
  const [rejected, setRejected] = useState(false)
  const [duplicateService, setDuplicateService] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>({
    serviceType: '',
    purpose: '',
    estimatedUsage: '',
    securityLevel: '',
  })
  const [history, setHistory] = useState<HistoryItem[]>([
    {
      id: 'h0',
      title: '신청 페이지 접속',
      time: '방금',
      actor: user?.name ?? 'User',
      status: 'current',
    },
  ])

  const { data: myRequests } = useQuery({
    queryKey: ['my-ai-requests-check'],
    queryFn: () => apiRequest<{ serviceType: string; status: string }[]>('/ai-service-requests/my'),
  })

  const activeServiceTypes = (myRequests ?? [])
    .filter((r) => ACTIVE_STATUSES.includes(r.status))
    .map((r) => r.serviceType)

  const submitMutation = useMutation({
    mutationFn: submitRequest,
    onSuccess: () => {
      addHistory('신청서 제출 완료', user?.name ?? 'User', 'completed')
      addHistory('팀장 승인 대기', '팀장', 'current')
      setCurrentStep(2)
      setRejected(false)
    },
    onError: (err: unknown) => {
      const status = (err as { status?: number })?.status
      if (status === 409) {
        const label = SERVICE_TYPES.find((s) => s.value === form.serviceType)?.label ?? form.serviceType
        setDuplicateService(label)
      } else {
        alert('신청서 제출에 실패했습니다. 다시 시도해주세요.')
      }
    },
  })

  const stepStatuses: StepStatus[] = STEPS.map((step) => {
    if (rejected && step.id === currentStep) return 'rejected'
    if (step.id < currentStep) return 'completed'
    if (step.id === currentStep) return 'current'
    return 'pending'
  })

  function addHistory(title: string, actor: string, status: HistoryItem['status']) {
    const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    setHistory((prev) => [
      ...prev.map((h) => (h.status === 'current' ? { ...h, status: 'completed' as const, time } : h)),
      { id: `h-${Date.now()}`, title, time: status === 'current' ? '진행 중' : time, actor, status },
    ])
  }

  function handleSubmit() {
    submitMutation.mutate({
      serviceType: form.serviceType,
      purpose: form.purpose,
      estimatedUsage: form.estimatedUsage,
      securityLevel: form.securityLevel,
    })
  }

  function handleStep2Action(action: '승인' | '반려' | '보완 요청') {
    if (action === '승인') {
      addHistory('팀장 승인 완료', '팀장', 'completed')
      addHistory('AI 관리자 검토 중', 'AI 관리자', 'current')
      setCurrentStep(3)
    } else if (action === '반려') {
      addHistory('팀장 반려 처리', '팀장', 'rejected')
      setRejected(true)
    } else {
      addHistory('보완 요청 — 신청서 수정 필요', '팀장', 'rejected')
      addHistory('신청서 수정 대기', 'Seed User', 'current')
      setCurrentStep(1)
    }
  }

  function handleStep3Action(action: '승인' | '반려') {
    if (action === '승인') {
      addHistory('AI 관리자 검토 승인', 'AI 관리자', 'completed')
      addHistory('권한 발급 완료', '시스템', 'completed')
      setCurrentStep(4)
    } else {
      addHistory('AI 관리자 반려 처리', 'AI 관리자', 'rejected')
      setRejected(true)
    }
  }

  function handleReset() {
    setCurrentStep(1)
    setRejected(false)
    setForm({ serviceType: '', purpose: '', estimatedUsage: '', securityLevel: '' })
    setHistory([{ id: 'h0', title: '신청 페이지 접속', time: '방금', actor: 'Seed User', status: 'current' }])
  }

  return (
    <div className="space-y-4">
      {/* 페이지 헤더 */}
      <div className="flex min-w-0 flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-glass px-6 py-5 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-glass border border-brand-border shadow-xs">
            <Bot className="size-5 text-brand-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-text-primary">AI 서비스 신청</h1>
            <p className="mt-1 text-xs font-semibold text-text-muted">
              사내 AI Chatbot, LLM API, 지식채널 권한을 안전하게 신청하고 간편하게 승인 상태를 확인하세요.
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5 self-start md:self-auto shrink-0 shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
          onClick={handleReset}
        >
          <ClipboardList className="size-3.5" />
          초기화 / 신규 신청
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        {/* 메인 카드 */}
        <div className="rounded-xl border border-surface-border bg-surface-raised overflow-hidden">
          {/* 스텝 헤더 */}
          <div className="border-b border-surface-border-soft bg-surface-raised px-3 py-1 overflow-x-auto">
            <StepHeader
              currentStep={currentStep}
              stepStatuses={stepStatuses}
              onStepClick={setCurrentStep}
            />
          </div>

          {/* 스텝 콘텐츠 */}
          {rejected ? (
            <RejectedContent onReset={handleReset} />
          ) : currentStep === 1 ? (
            <Step1Form
              form={form}
              onChange={setForm}
              onSubmit={handleSubmit}
              isLoading={submitMutation.isPending}
              activeServiceTypes={activeServiceTypes}
            />
          ) : currentStep === 2 ? (
            <Step2Content form={form} onAction={handleStep2Action} />
          ) : currentStep === 3 ? (
            <Step3Content form={form} onAction={handleStep3Action} />
          ) : (
            <Step4Content form={form} onNavigate={() => navigate({ to: '/chatbot/knowledge' })} />
          )}
        </div>

        {/* 처리 이력 사이드바 */}
        <aside className="rounded-xl border border-surface-border bg-surface-raised p-4">
          <p className="text-xs font-black uppercase tracking-widest ui-text-muted mb-4">처리 이력</p>
          <div className="space-y-3">
            {history.map((item, idx) => {
              const isRejected = item.status === 'rejected'
              const isCurrent = item.status === 'current'
              return (
                <div key={item.id} className="flex gap-2.5">
                  <div className="mt-0.5 flex flex-col items-center">
                    <div
                      className={`flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${
                        isRejected
                          ? 'bg-destructive/10 text-destructive'
                          : isCurrent
                          ? 'bg-brand-primary/10 text-brand-primary animate-pulse'
                          : 'bg-brand-primary text-background'
                      }`}
                    >
                      {isRejected ? '✕' : isCurrent ? '●' : '✓'}
                    </div>
                    {idx < history.length - 1 && (
                      <div className="mt-1 h-full w-px bg-surface-border-soft min-h-3" />
                    )}
                  </div>
                  <div className="pb-3">
                    <p className={`text-xs font-semibold ${isRejected ? 'text-destructive' : 'ui-text-primary'}`}>
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[10px] ui-text-muted">
                      {item.actor} · {item.time}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </aside>
      </div>

      {/* 중복 신청 방지 다이어로그 */}
      <AnimatePresence>
        {duplicateService && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
            <motion.div
              key="duplicate-dialog"
              initial={{ y: -480, opacity: 0, scale: 0.88 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -480, opacity: 0, scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 340, damping: 22, mass: 1.2 }}
              className="pointer-events-auto w-[420px] rounded-3xl border border-surface-border bg-surface-raised shadow-[0_24px_64px_rgba(0,0,0,0.28)] overflow-hidden"
            >
              <div className="h-1.5 w-full bg-brand-primary/60" />
              <div className="px-8 py-7 flex flex-col items-center text-center gap-5">
                <motion.div
                  initial={{ scale: 0.5, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.08 }}
                  className="flex size-16 items-center justify-center rounded-full bg-brand-glass border-2 border-brand-border"
                >
                  <Ban className="size-8 text-brand-primary" />
                </motion.div>
                <div className="space-y-1.5">
                  <p className="text-xl font-black ui-text-primary">중복 신청 불가</p>
                  <p className="text-sm ui-text-secondary leading-relaxed">
                    <span className="font-bold text-brand-primary">{duplicateService}</span>에 대한<br />
                    진행 중인 신청이 이미 존재합니다.
                  </p>
                </div>
                <div className="w-full rounded-xl border border-surface-border bg-surface-muted px-4 py-3 text-xs ui-text-secondary leading-relaxed">
                  신청 취소 또는 반려 처리 후 재신청할 수 있습니다.<br />
                  현재 신청 상태는 <span className="font-bold ui-text-primary">내 신청 현황</span>에서 확인하세요.
                </div>
                <div className="flex w-full gap-2">
                  <button
                    onClick={() => setDuplicateService(null)}
                    className="flex-1 rounded-xl border border-surface-border py-2.5 text-sm font-bold ui-text-secondary hover:bg-surface-muted transition-colors active:scale-95"
                  >
                    닫기
                  </button>
                  <button
                    onClick={() => navigate({ to: '/ai-service-my' })}
                    className="flex-1 rounded-xl border border-brand-border bg-brand-glass py-2.5 text-sm font-bold text-brand-primary hover:bg-brand-glass/80 transition-colors active:scale-95"
                  >
                    내 신청 현황 →
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
