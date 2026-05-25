import type { LucideIcon } from 'lucide-react'
import { MessageSquareText, MessagesSquare, UserRoundCheck, CalendarDays } from 'lucide-react'
import type { ChatbotMonitoringSummary } from '../../../entities/chatbot-monitoring/model/types'

type KpiItem = {
  label: string
  value: number
  description: string
  icon: LucideIcon
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value)
}

function KpiCard({ item }: { item: KpiItem }) {
  const Icon = item.icon

  return (
    <div className="ui-panel-soft flex min-h-28 items-start justify-between gap-4 p-4">
      <div className="min-w-0">
        <p className="text-xs font-bold text-text-muted">{item.label}</p>
        <p className="mt-2 text-2xl font-black text-text-primary">
          {formatNumber(item.value)}
        </p>
        <p className="mt-1 text-xs text-text-secondary">{item.description}</p>
      </div>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
        <Icon className="size-5" />
      </div>
    </div>
  )
}

export function ChatbotMonitoringKpiGrid({
  summary,
}: {
  summary?: ChatbotMonitoringSummary
}) {
  const items: KpiItem[] = [
    {
      label: '총 질문 수',
      value: summary?.totalQuestions ?? 0,
      description: '사용자가 보낸 메시지 기준',
      icon: MessageSquareText,
    },
    {
      label: '오늘 질문 수',
      value: summary?.todayQuestions ?? 0,
      description: '오늘 0시 이후 질문',
      icon: CalendarDays,
    },
    {
      label: '총 세션 수',
      value: summary?.totalSessions ?? 0,
      description: '생성된 챗봇 대화방',
      icon: MessagesSquare,
    },
    {
      label: '활성 사용자',
      value: summary?.activeUsers ?? 0,
      description: '질문 이력이 있는 사용자',
      icon: UserRoundCheck,
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <KpiCard key={item.label} item={item} />
      ))}
    </div>
  )
}
