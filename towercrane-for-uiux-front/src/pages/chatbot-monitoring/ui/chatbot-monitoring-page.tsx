import { ChartColumnBig, RefreshCw } from 'lucide-react'
import { ChatbotMonitoringKpiGrid } from '../../../features/chatbot-monitoring/ui/chatbot-monitoring-kpi-grid'
import { ChatbotMonitoringUserTable } from '../../../features/chatbot-monitoring/ui/chatbot-monitoring-user-table'
import {
  useChatbotMonitoringSummary,
  useChatbotMonitoringUsers,
} from '../../../features/chatbot-monitoring/model/use-chatbot-monitoring'
import { Button } from '../../../shared/ui/button'

export function ChatbotMonitoringPage() {
  const summaryQuery = useChatbotMonitoringSummary()
  const usersQuery = useChatbotMonitoringUsers()

  const handleRefresh = () => {
    void summaryQuery.refetch()
    void usersQuery.refetch()
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-5 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
            <ChartColumnBig className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-text-primary">챗봇 모니터링</h1>
            <p className="mt-1 text-sm text-text-secondary">
              사용자별 챗봇 질문 횟수와 최근 사용 시점을 확인합니다.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleRefresh}
          disabled={summaryQuery.isFetching || usersQuery.isFetching}
        >
          <RefreshCw className="mr-1.5 size-3.5" />
          새로고침
        </Button>
      </div>

      {(summaryQuery.error || usersQuery.error) && (
        <div className="rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3 text-sm text-text-secondary">
          모니터링 데이터를 불러오지 못했습니다. 관리자 권한 또는 서버 상태를 확인하세요.
        </div>
      )}

      <ChatbotMonitoringKpiGrid summary={summaryQuery.data} />
      <ChatbotMonitoringUserTable
        users={usersQuery.data ?? []}
        isLoading={usersQuery.isLoading}
      />
    </div>
  )
}
