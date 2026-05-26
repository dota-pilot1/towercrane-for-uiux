import { useState } from 'react'
import {
  Ban,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  HelpCircle,
  Mic2,
  ShieldCheck,
  TerminalSquare,
  X,
} from 'lucide-react'
import { cn } from '../../../shared/lib/utils'
import { apiRequest } from '../../../shared/api/http'
import { AiServiceRequestPage } from '../../ai-service-request/ui/ai-service-request-page'
import type { RealtimeToolName } from '../../../entities/chatbot-realtime/api/realtime-api'

type AiServiceRequestItem = {
  id: number
  serviceType: string
  purpose: string
  status: string
  rejectReason?: string | null
  createdAt: string
  updatedAt: string
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  chatbot: '사내 AI 챗봇',
  api: 'API Key 발급',
  account: '아이디 발급',
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pending:          { label: '대기 중',    icon: Clock,        className: 'border-yellow-300/40 bg-yellow-50/80 text-yellow-700' },
  manager_approved: { label: '팀장 승인',  icon: ShieldCheck,  className: 'border-blue-300/40 bg-blue-50/80 text-blue-700' },
  admin_approved:   { label: '관리자 승인', icon: ShieldCheck, className: 'border-brand-border bg-brand-glass text-brand-primary' },
  active:           { label: '사용 중',    icon: CheckCircle2, className: 'border-brand-border bg-brand-glass text-brand-primary' },
  rejected:         { label: '반려',       icon: Ban,          className: 'border-destructive/30 bg-danger-glass text-destructive' },
}

const TOOL_GUIDE = [
  {
    icon: ClipboardList,
    name: 'AI 서비스 신청',
    toolName: 'open_ai_service_form',
    desc: '챗봇, API Key, 아이디 발급 등 AI 서비스를 신청할 수 있는 폼을 표시합니다.',
    triggers: ['AI 서비스 신청하고 싶어', 'API 키 발급해줘', '챗봇 사용 신청할게', '아이디 발급 부탁해'],
  },
  {
    icon: FileText,
    name: 'AI 서비스 신청 현황',
    toolName: 'check_ai_service_request',
    desc: '내가 신청한 AI 서비스 목록과 현재 승인 상태를 카드로 표시합니다.',
    triggers: ['내 신청 상태 알려줘', 'AI 서비스 신청 현황 조회해줘', '챗봇 신청 됐어?', 'AI 사용 승인 났어?'],
  },
]

function ToolGuidePanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="p-4 space-y-4">
      <div className="rounded-xl border border-brand-border bg-brand-glass/30 px-4 py-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Mic2 className="size-3.5 text-brand-primary" />
            <p className="text-xs font-black text-brand-primary">Tool Calling 사용법</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-icon-button rounded-md p-1"
            aria-label="닫기"
          >
            <X className="size-3.5" />
          </button>
        </div>
        <p className="text-[11px] ui-text-secondary leading-relaxed">
          아래 예시 문장을 텍스트 또는 음성으로 말하면 AI가 자동으로 도구를 호출하고 이 패널에 결과를 표시합니다.
        </p>
      </div>

      {TOOL_GUIDE.map((tool) => {
        const Icon = tool.icon
        return (
          <div key={tool.toolName} className="rounded-xl border border-surface-border bg-surface-raised p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg border border-brand-border bg-brand-glass">
                <Icon className="size-4 text-brand-primary" />
              </div>
              <div>
                <p className="text-sm font-bold ui-text-primary">{tool.name}</p>
                <p className="text-[10px] font-mono ui-text-muted">{tool.toolName}</p>
              </div>
            </div>
            <p className="text-xs ui-text-secondary leading-relaxed">{tool.desc}</p>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider ui-text-muted mb-2">예시 문장</p>
              <div className="flex flex-wrap gap-1.5">
                {tool.triggers.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-full border border-surface-border bg-surface-muted px-2.5 py-1 text-[11px] font-medium ui-text-secondary"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AiServiceStatusPanel({ data }: { data: unknown }) {
  const items = (data as { items?: AiServiceRequestItem[] })?.items ?? []

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-lg border border-surface-border bg-surface-muted">
          <FileText className="size-5 ui-text-muted" />
        </div>
        <p className="text-sm font-semibold ui-text-primary">신청 내역 없음</p>
        <p className="text-xs ui-text-muted">AI 서비스 신청 이력이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs font-black uppercase tracking-widest ui-text-muted">
        신청 현황 · 총 {items.length}건
      </p>
      {items.map((item) => {
        const cfg = STATUS_CONFIG[item.status] ?? { label: item.status, icon: Clock, className: 'border-surface-border bg-surface-muted ui-text-muted' }
        const Icon = cfg.icon
        const serviceLabel = SERVICE_TYPE_LABELS[item.serviceType] ?? item.serviceType
        const date = new Date(item.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })

        return (
          <div key={item.id} className="rounded-xl border border-surface-border bg-surface-raised p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold ui-text-primary">{serviceLabel}</span>
              <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold', cfg.className)}>
                <Icon className="size-3" />
                {cfg.label}
              </span>
            </div>
            <p className="text-xs ui-text-secondary leading-relaxed line-clamp-2">{item.purpose}</p>
            {item.rejectReason && (
              <p className="text-[11px] text-destructive bg-destructive/5 border border-destructive/15 rounded-lg px-2.5 py-1.5">
                반려 사유: {item.rejectReason}
              </p>
            )}
            <p className="text-[10px] ui-text-muted">{date} 신청</p>
          </div>
        )
      })}
    </div>
  )
}

type Props = {
  activePanelTool: RealtimeToolName | null
  panelData: unknown
  onClose: () => void
  onOpen: (tool: RealtimeToolName, data: unknown) => void
}

export function AiServiceFormForToolCall({ activePanelTool, panelData, onClose, onOpen }: Props) {
  const [showGuide, setShowGuide] = useState(false)

  const handleFormSubmitSuccess = async () => {
    try {
      const items = await apiRequest<AiServiceRequestItem[]>('/ai-service-requests/my')
      onOpen('check_ai_service_request', { items, count: items.length })
    } catch {
      // 실패 시 패널 유지
    }
  }

  const handleClose = () => {
    setShowGuide(false)
    onClose()
  }

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-raised">
      <div className="border-b border-surface-border bg-surface-strong px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TerminalSquare className="size-4 text-brand-primary" />
            <p className="text-sm font-semibold ui-text-primary">Tool Call Panel</p>
          </div>
          <button
            type="button"
            onClick={() => { setShowGuide((v) => !v); if (activePanelTool) onClose() }}
            className={cn(
              'ui-icon-button rounded-md p-1.5',
              showGuide && 'bg-brand-glass text-brand-primary border border-brand-border',
            )}
            aria-label="사용 방법"
            title="Tool Calling 사용법"
          >
            <HelpCircle className="size-4" />
          </button>
        </div>
        <p className="mt-1 text-xs ui-text-muted">도구 호출의 실행 결과를 시각적으로 표시합니다.</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {showGuide ? (
          <ToolGuidePanel onClose={handleClose} />
        ) : activePanelTool === 'open_ai_service_form' ? (
          <div className="p-4">
            <AiServiceRequestPage onSubmitSuccess={handleFormSubmitSuccess} onClose={handleClose} />
          </div>
        ) : activePanelTool === 'check_ai_service_request' ? (
          <div>
            <div className="flex justify-end px-3 pt-3">
              <button
                type="button"
                onClick={handleClose}
                className="ui-icon-button rounded-md p-1.5"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </div>
            <AiServiceStatusPanel data={panelData} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-14 items-center justify-center rounded-lg border border-surface-border bg-surface-muted">
                <TerminalSquare className="size-6 ui-text-muted" />
              </div>
              <p className="text-sm font-semibold ui-text-primary">대기 중</p>
              <p className="max-w-[220px] text-xs leading-5 ui-text-muted">
                AI 서비스 신청이나 상태 조회를 말하면 여기에 표시됩니다.
                <br />
                <button
                  type="button"
                  onClick={() => setShowGuide(true)}
                  className="mt-1 inline-flex items-center gap-1 text-brand-primary hover:underline"
                >
                  <HelpCircle className="size-3" /> 사용법 보기
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
