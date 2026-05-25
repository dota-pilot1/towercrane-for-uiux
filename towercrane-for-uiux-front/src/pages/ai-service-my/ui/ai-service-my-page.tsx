import { useQuery } from '@tanstack/react-query'
import { FileSearch, ClipboardList, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { apiRequest } from '../../../shared/api/http'
import { Button } from '../../../shared/ui/button'

type RequestStatus = 'pending' | 'manager_approved' | 'admin_approved' | 'active' | 'rejected' | 'revision_requested'

type AiRequest = {
  id: string
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

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending:            { label: '대기 중 (팀장 검토)', color: 'text-text-muted bg-surface-muted border-surface-border', icon: Clock },
  manager_approved:   { label: '팀장 승인 완료 (관리자 검토 중)', color: 'text-brand-primary bg-brand-glass border-brand-border', icon: CheckCircle2 },
  admin_approved:     { label: '관리자 승인 완료', color: 'text-brand-primary bg-brand-glass border-brand-border', icon: CheckCircle2 },
  active:             { label: '승인 완료 · 사용 가능', color: 'text-brand-primary bg-brand-glass border-brand-border', icon: CheckCircle2 },
  rejected:           { label: '반려됨', color: 'text-destructive bg-destructive/5 border-destructive/20', icon: XCircle },
  revision_requested: { label: '보완 요청', color: 'text-text-secondary bg-surface-muted border-surface-border', icon: RefreshCw },
}

async function fetchMyRequests(): Promise<AiRequest[]> {
  return apiRequest<AiRequest[]>('/ai-service-requests/my')
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function AiServiceMyPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({ queryKey: ['my-ai-requests'], queryFn: fetchMyRequests })

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6 ui-page-bg">
      <div className="flex min-w-0 flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-glass px-6 py-5 shadow-sm">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary text-primary-foreground shadow-sm">
            <FileSearch className="size-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <h1 className="text-lg font-bold tracking-tight text-text-primary">내 신청 현황</h1>
            <p className="text-xs ui-text-secondary">내가 신청한 AI 서비스 목록과 승인 진행 상태</p>
          </div>
        </div>
        <Button
          onClick={() => navigate({ to: '/ai-service-request' })}
          size="sm"
          className="gap-1.5 shrink-0"
        >
          <ClipboardList className="size-4" />
          신규 신청
        </Button>
      </div>

      <div className="rounded-2xl border border-surface-border-soft bg-surface-raised/20 p-6 backdrop-blur-sm shadow-sm space-y-4">
        {isLoading ? (
          <div className="py-16 text-center text-sm ui-text-muted animate-pulse">불러오는 중...</div>
        ) : !data || data.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-surface-border-soft bg-surface-raised/40 p-12 text-center shadow-2xs backdrop-blur-sm">
            <FileSearch className="mx-auto size-10 text-brand-primary/30" />
            <p className="text-sm font-semibold ui-text-primary">신청 내역이 없습니다</p>
            <p className="max-w-md text-xs ui-text-secondary leading-relaxed">
              AI 서비스 신청 후 승인을 받으면 사내 챗봇과 API를 즉시 활용하실 수 있습니다.
            </p>
            <Button
              onClick={() => navigate({ to: '/ai-service-request' })}
              size="sm"
              className="mt-2 gap-1.5"
            >
              <ClipboardList className="size-4" />
              지금 신청하기
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((req) => {
              const cfg = STATUS_CONFIG[req.status]
              const Icon = cfg.icon
              return (
                <div
                  key={req.id}
                  className="group rounded-xl border border-surface-border-soft bg-surface-raised p-5 shadow-2xs transition-all duration-300 hover:-translate-y-[1px] hover:border-brand-border/40 hover:shadow-xs"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-extrabold ui-text-primary group-hover:text-brand-primary transition-colors">
                        {SERVICE_LABEL[req.serviceType] ?? req.serviceType}
                      </p>
                      <p className="mt-1 text-xs ui-text-secondary leading-relaxed line-clamp-2">
                        {req.purpose}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap shadow-3xs ${cfg.color}`}>
                      <Icon className="size-3" />
                      {cfg.label}
                    </span>
                  </div>

                  {req.rejectReason && (
                    <div className="mt-3 rounded-lg bg-destructive/5 border border-destructive/20 px-3.5 py-2.5 text-xs text-destructive">
                      <span className="font-bold">반려 사유:</span> {req.rejectReason}
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-4 border-t border-surface-border-soft pt-3 text-[11px] ui-text-muted font-medium">
                    <span>신청일: {fmt(req.createdAt)}</span>
                    <span>최종 업데이트: {fmt(req.updatedAt)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
