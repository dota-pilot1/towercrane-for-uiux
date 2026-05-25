import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Clock, CheckCircle2, XCircle, RefreshCw, ChevronDown, ChevronUp, Inbox } from 'lucide-react'
import { apiRequest } from '../../../shared/api/http'

type RequestStatus = 'pending' | 'manager_approved' | 'admin_approved' | 'active' | 'rejected' | 'revision_requested'

type AiRequest = {
  id: string
  userId: string
  userName: string
  serviceType: string
  purpose: string
  estimatedUsage: string
  securityLevel: string
  status: RequestStatus
  rejectReason: string | null
  createdAt: string
  updatedAt: string
}

const SERVICE_LABEL: Record<string, string> = {
  chatbot: '사내 AI 챗봇',
  api: 'API Key 발급',
  account: '아이디 발급',
}

const USAGE_LABEL: Record<string, string> = {
  low: '소규모 (월 5만 토큰 이하)',
  medium: '중규모 (월 5~20만 토큰)',
  large: '대규모 (월 20만 토큰 초과)',
}

const SECURITY_LABEL: Record<string, string> = {
  internal: '내부 업무용',
  confidential: '제한적 기밀',
}

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending:            { label: '대기 중', color: 'text-text-muted bg-surface-muted border-surface-border', icon: Clock },
  manager_approved:   { label: '팀장 승인', color: 'text-brand-primary bg-brand-glass border-brand-border', icon: CheckCircle2 },
  admin_approved:     { label: '관리자 승인', color: 'text-brand-primary bg-brand-glass border-brand-border', icon: CheckCircle2 },
  active:             { label: '사용 중', color: 'text-brand-primary bg-brand-glass border-brand-border', icon: CheckCircle2 },
  rejected:           { label: '반려', color: 'text-destructive bg-destructive/5 border-destructive/20', icon: XCircle },
  revision_requested: { label: '보완 요청', color: 'text-text-secondary bg-surface-muted border-surface-border', icon: RefreshCw },
}

const STATUS_TABS = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기 중' },
  { key: 'manager_approved', label: '팀장 승인' },
  { key: 'active', label: '사용 중' },
  { key: 'rejected', label: '반려' },
]

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function RequestRow({ req, onAction }: { req: AiRequest; onAction: (id: string, action: string, reason?: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const cfg = STATUS_CONFIG[req.status]
  const Icon = cfg.icon

  return (
    <div className={`ui-panel rounded-xl overflow-hidden border-l-4 transition-all ${
      req.status === 'pending' ? 'border-l-surface-border' :
      req.status === 'rejected' ? 'border-l-destructive' :
      req.status === 'revision_requested' ? 'border-l-surface-border-soft' :
      'border-l-primary'
    }`}>
      {/* 헤더 행 */}
      <button
        className="w-full flex items-center gap-4 px-5 py-4 text-left bg-brand-glass hover:bg-brand-glass/80 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold ui-text-primary">{req.userName}</span>
            <span className="text-xs ui-text-muted">·</span>
            <span className="text-xs ui-text-secondary">{SERVICE_LABEL[req.serviceType] ?? req.serviceType}</span>
          </div>
          <p className="mt-0.5 text-xs ui-text-muted line-clamp-1">{req.purpose}</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold shrink-0 ${cfg.color}`}>
          <Icon className="size-3" />
          {cfg.label}
        </span>
        <span className="text-xs ui-text-muted shrink-0">{fmt(req.createdAt)}</span>
        {expanded ? <ChevronUp className="size-4 ui-text-muted shrink-0" /> : <ChevronDown className="size-4 ui-text-muted shrink-0" />}
      </button>

      {/* 상세 패널 */}
      {expanded && (
        <div className="border-t border-surface-border px-5 py-5 space-y-4 bg-surface-raised">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs">
            <div>
              <dt className="ui-text-muted font-semibold">신청자</dt>
              <dd className="mt-1 font-semibold ui-text-primary">{req.userName}</dd>
            </div>
            <div>
              <dt className="ui-text-muted font-semibold">서비스</dt>
              <dd className="mt-1 font-semibold ui-text-primary">{SERVICE_LABEL[req.serviceType]}</dd>
            </div>
            <div>
              <dt className="ui-text-muted font-semibold">예상 사용량</dt>
              <dd className="mt-1 ui-text-secondary">{USAGE_LABEL[req.estimatedUsage]}</dd>
            </div>
            <div>
              <dt className="ui-text-muted font-semibold">보안 등급</dt>
              <dd className="mt-1 ui-text-secondary">{SECURITY_LABEL[req.securityLevel]}</dd>
            </div>
            <div className="col-span-2">
              <dt className="ui-text-muted font-semibold">사용 목적</dt>
              <dd className="mt-1.5 ui-text-secondary leading-relaxed bg-surface-muted/50 rounded-lg p-3 border border-surface-border-soft">
                {req.purpose}
              </dd>
            </div>
            {req.rejectReason && (
              <div className="col-span-2">
                <dt className="font-semibold text-destructive">반려 사유</dt>
                <dd className="mt-1.5 text-destructive/80 bg-destructive/5 rounded-lg p-3 border border-destructive/10">
                  {req.rejectReason}
                </dd>
              </div>
            )}
          </dl>

          {/* 액션 버튼 */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {req.status === 'pending' && (
              <>
                <button
                  onClick={() => onAction(req.id, 'approve')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-glass border border-brand-border px-3 py-1.5 text-xs font-bold text-brand-primary hover:bg-brand-glass/80 transition-colors"
                >
                  <CheckCircle2 className="size-3.5" /> 팀장 승인
                </button>
                <button
                  onClick={() => setShowRejectInput((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <XCircle className="size-3.5" /> 반려
                </button>
                <button
                  onClick={() => onAction(req.id, 'revise')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-bold ui-text-secondary hover:bg-surface-muted transition-colors"
                >
                  <RefreshCw className="size-3.5" /> 보완 요청
                </button>
              </>
            )}
            {req.status === 'manager_approved' && (
              <>
                <button
                  onClick={() => onAction(req.id, 'admin-approve')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-glass border border-brand-border px-3 py-1.5 text-xs font-bold text-brand-primary hover:bg-brand-glass/80 transition-colors"
                >
                  <ShieldCheck className="size-3.5" /> 최종 승인 (권한 발급)
                </button>
                <button
                  onClick={() => setShowRejectInput((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <XCircle className="size-3.5" /> 반려
                </button>
              </>
            )}
          </div>

          {showRejectInput && (
            <div className="flex gap-2">
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="반려 사유 입력 (선택)"
                className="flex-1 ui-input text-xs"
              />
              <button
                onClick={() => { onAction(req.id, 'reject', rejectReason); setShowRejectInput(false) }}
                className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-bold text-background"
              >
                확인
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AiServiceAdminPage() {
  const [tab, setTab] = useState<string>('all')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['ai-requests-admin'],
    queryFn: () => apiRequest<AiRequest[]>('/ai-service-requests'),
  })

  const mutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: string; reason?: string }) =>
      apiRequest(`/ai-service-requests/${id}/${action}`, {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-requests-admin'] }),
  })

  const filtered = (data ?? []).filter((r) => tab === 'all' || r.status === tab)

  return (
    <div className="min-h-[calc(100vh-120px)] ui-page-bg">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand-glass border border-brand-border">
            <ShieldCheck className="size-5 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold ui-text-primary">신청 관리</h1>
            <p className="text-xs ui-text-muted">AI 서비스 신청 목록 조회 및 승인·반려 처리</p>
          </div>
          <span className="ml-auto text-xs ui-text-muted">총 {data?.length ?? 0}건</span>
        </div>

        {/* 탭 (Segmented Control) */}
        <div className="inline-flex gap-1 bg-surface-muted p-1 rounded-xl w-max max-w-full overflow-x-auto border border-surface-border-soft">
          {STATUS_TABS.map((t) => {
            const count = t.key === 'all' ? (data?.length ?? 0) : (data ?? []).filter((r) => r.status === t.key).length
            const isActive = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 shrink-0 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(0,0,0,0.15)] font-bold scale-[1.03]'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised/40'
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                    isActive
                      ? 'bg-primary-foreground text-primary font-bold'
                      : 'bg-surface-raised/80 ui-text-muted border border-surface-border-soft'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm ui-text-muted animate-pulse">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center rounded-2xl border border-surface-border-soft bg-surface-raised/40 p-12 shadow-sm backdrop-blur-sm">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-glass border border-brand-border text-brand-primary mb-4">
              <Inbox className="size-7" />
            </div>
            <h3 className="text-base font-bold ui-text-primary mb-1">
              신청 내역이 없습니다
            </h3>
            <p className="text-xs ui-text-muted max-w-sm leading-relaxed">
              현재 필터에 해당하는 AI 서비스 신청 내역이 비어 있습니다.<br />
              새로운 신청서가 접수되면 이곳에서 승인 또는 반려를 처리하실 수 있습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => (
              <RequestRow
                key={req.id}
                req={req}
                onAction={(id, action, reason) => mutation.mutate({ id, action, reason })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
