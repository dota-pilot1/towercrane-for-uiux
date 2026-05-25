import { useState } from 'react'
import {
  Bot,
  CheckCircle2,
  XCircle,
  Undo2,
  ClipboardList,
  ShieldCheck,
  KeyRound,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

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
  { value: 'chatbot', label: '사내 AI Chatbot', desc: 'FAQ · 개발 자료 기반 질의응답' },
  { value: 'knowledge', label: '지식채널 검색', desc: '공지 · FAQ · AI 자료 RAG 검색' },
  { value: 'files', label: '파일 분석 (Vision)', desc: '이미지 · 문서 GPT-4o 분석' },
  { value: 'api', label: 'LLM API 직접 연동', desc: '개발 목적 API Key 발급' },
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
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, idx) => {
        const status = stepStatuses[idx]
        const isClickable = status === 'completed'
        const Icon = step.icon

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={`flex items-center gap-2.5 px-4 py-3 transition-colors ${
                status === 'current'
                  ? 'bg-brand-glass border-b-2 border-brand-border'
                  : status === 'completed'
                  ? 'hover:bg-surface-muted cursor-pointer'
                  : 'opacity-40 cursor-default'
              }`}
            >
              <div
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                  status === 'completed'
                    ? 'bg-brand-primary text-background'
                    : status === 'current'
                    ? 'bg-brand-glass border-2 border-brand-border text-brand-primary'
                    : status === 'rejected'
                    ? 'bg-destructive/10 text-destructive border border-destructive/30'
                    : 'bg-surface-muted border border-surface-border text-text-muted'
                }`}
              >
                {status === 'completed' ? (
                  <CheckCircle2 className="size-3.5" />
                ) : status === 'rejected' ? (
                  <XCircle className="size-3.5" />
                ) : (
                  <Icon className="size-3" />
                )}
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider ui-text-muted">
                  Step {step.id}
                </p>
                <p
                  className={`text-xs font-semibold ${
                    status === 'current'
                      ? 'text-brand-primary'
                      : status === 'completed'
                      ? 'ui-text-primary'
                      : 'ui-text-muted'
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </button>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="size-4 ui-text-muted shrink-0" />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Step1Form({
  form,
  onChange,
  onSubmit,
}: {
  form: FormData
  onChange: (f: FormData) => void
  onSubmit: () => void
}) {
  const isValid = form.serviceType && form.purpose.trim().length >= 10 && form.estimatedUsage && form.securityLevel

  return (
    <div className="space-y-6 p-6">
      <div>
        <p className="text-xs font-bold ui-text-secondary mb-3">신청 서비스 선택 *</p>
        <div className="grid grid-cols-2 gap-2">
          {SERVICE_TYPES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange({ ...form, serviceType: s.value })}
              className={`rounded-lg border p-3 text-left transition-all ${
                form.serviceType === s.value
                  ? 'border-brand-border bg-brand-glass'
                  : 'border-surface-border-soft bg-surface-muted hover:border-surface-border'
              }`}
            >
              <p className={`text-sm font-semibold ${form.serviceType === s.value ? 'text-brand-primary' : 'ui-text-primary'}`}>
                {s.label}
              </p>
              <p className="mt-0.5 text-[11px] ui-text-muted">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold ui-text-secondary">사용 목적 * <span className="font-normal ui-text-muted">(최소 10자)</span></span>
          <textarea
            value={form.purpose}
            onChange={(e) => onChange({ ...form, purpose: e.target.value })}
            placeholder="AI 서비스를 어떤 업무에 활용할 계획인지 구체적으로 입력하세요."
            rows={4}
            className="w-full rounded-md border border-surface-border bg-background px-3 py-2.5 text-sm leading-relaxed ui-text-primary placeholder:ui-text-muted outline-none resize-none transition-all focus:border-brand-border focus:ring-2 focus:ring-brand-border/5"
          />
          <span className={`text-right text-[10px] ${form.purpose.length < 10 ? 'text-destructive' : 'ui-text-muted'}`}>
            {form.purpose.length}자
          </span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-bold ui-text-secondary mb-2">예상 사용량 *</p>
          <div className="space-y-1.5">
            {USAGE_OPTIONS.map((u) => (
              <button
                key={u.value}
                type="button"
                onClick={() => onChange({ ...form, estimatedUsage: u.value })}
                className={`w-full rounded-md border px-3 py-2 text-left transition-all ${
                  form.estimatedUsage === u.value
                    ? 'border-brand-border bg-brand-glass'
                    : 'border-surface-border-soft hover:border-surface-border'
                }`}
              >
                <p className={`text-xs font-semibold ${form.estimatedUsage === u.value ? 'text-brand-primary' : 'ui-text-primary'}`}>
                  {u.label}
                </p>
                <p className="text-[10px] ui-text-muted">{u.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold ui-text-secondary mb-2">보안 등급 *</p>
          <div className="space-y-1.5">
            {SECURITY_LEVELS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => onChange({ ...form, securityLevel: s.value })}
                className={`w-full rounded-md border px-3 py-2 text-left transition-all ${
                  form.securityLevel === s.value
                    ? 'border-brand-border bg-brand-glass'
                    : 'border-surface-border-soft hover:border-surface-border'
                }`}
              >
                <p className={`text-xs font-semibold ${form.securityLevel === s.value ? 'text-brand-primary' : 'ui-text-primary'}`}>
                  {s.label}
                </p>
                <p className="text-[10px] ui-text-muted">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={onSubmit}
          disabled={!isValid}
          className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-glass px-5 py-2.5 text-sm font-bold text-brand-primary transition-all hover:bg-brand-glass/80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ClipboardList className="size-4" />
          신청서 제출
        </button>
      </div>
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
  const [currentStep, setCurrentStep] = useState(1)
  const [rejected, setRejected] = useState(false)
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
      actor: 'Seed User',
      status: 'current',
    },
  ])

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
    addHistory('신청서 제출 완료', 'Seed User', 'completed')
    addHistory('팀장 승인 대기', '팀장', 'current')
    setCurrentStep(2)
    setRejected(false)
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
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-raised px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="ui-icon-button-brand size-10 shrink-0 rounded-lg">
            <Bot className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-black ui-text-primary">AI 서비스 신청</h1>
            <p className="mt-0.5 text-xs ui-text-secondary">
              AI Chatbot, LLM API, 지식채널 검색 권한을 신청하고 승인 흐름을 확인합니다.
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-xs font-bold ui-text-secondary transition-all hover:bg-surface-muted active:scale-95"
        >
          <ClipboardList className="size-3.5" />
          초기화 / 신규 신청
        </button>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        {/* 메인 카드 */}
        <div className="rounded-xl border border-surface-border bg-surface-raised overflow-hidden">
          {/* 스텝 헤더 */}
          <div className="border-b border-surface-border bg-surface-strong px-2 py-1 overflow-x-auto">
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
            <Step1Form form={form} onChange={setForm} onSubmit={handleSubmit} />
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
    </div>
  )
}
