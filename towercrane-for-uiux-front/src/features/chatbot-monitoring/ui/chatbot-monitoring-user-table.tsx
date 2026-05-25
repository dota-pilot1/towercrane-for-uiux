import { UsersRound } from 'lucide-react'
import type { ChatbotMonitoringUserRow } from '../../../entities/chatbot-monitoring/model/types'
import { SectionCard } from '../../../shared/ui/section-card'

function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value)
}

export function ChatbotMonitoringUserTable({
  users,
  isLoading,
}: {
  users: ChatbotMonitoringUserRow[]
  isLoading: boolean
}) {
  return (
    <SectionCard
      icon={UsersRound}
      title="사용자별 질문 횟수"
      description="챗봇에 질문을 보낸 사용자 기준으로 집계합니다."
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto px-4 py-4">
        <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[34%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="border-b border-surface-border-soft px-4 pb-3 text-[11px] font-black uppercase tracking-widest text-text-muted">
                사용자
              </th>
              <th className="border-b border-surface-border-soft px-4 pb-3 text-[11px] font-black uppercase tracking-widest text-text-muted">
                이메일
              </th>
              <th className="border-b border-surface-border-soft px-4 pb-3 text-right text-[11px] font-black uppercase tracking-widest text-text-muted">
                질문 수
              </th>
              <th className="border-b border-surface-border-soft px-4 pb-3 text-right text-[11px] font-black uppercase tracking-widest text-text-muted">
                세션 수
              </th>
              <th className="border-b border-surface-border-soft px-4 pb-3 text-right text-[11px] font-black uppercase tracking-widest text-text-muted">
                마지막 질문
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center text-sm text-text-muted">
                  집계 데이터를 불러오는 중입니다.
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center text-sm text-text-muted">
                  아직 챗봇 질문 기록이 없습니다.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.userId} className="group transition-colors hover:bg-surface-muted">
                  <td className="border-b border-surface-border-soft px-4 py-4 align-middle group-last:border-b-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-xs font-black text-brand-primary">
                        {user.name.charAt(0)}
                      </span>
                      <span className="truncate text-sm font-black text-text-primary">
                        {user.name}
                      </span>
                    </div>
                  </td>
                  <td className="border-b border-surface-border-soft px-4 py-4 align-middle group-last:border-b-0">
                    <span className="block truncate text-sm text-text-secondary">
                      {user.email}
                    </span>
                  </td>
                  <td className="border-b border-surface-border-soft px-4 py-4 text-right align-middle group-last:border-b-0">
                    <span className="inline-flex min-w-10 justify-center rounded-md border border-brand-border bg-brand-glass px-2.5 py-1 text-sm font-black text-brand-primary">
                      {formatNumber(user.questionCount)}
                    </span>
                  </td>
                  <td className="border-b border-surface-border-soft px-4 py-4 text-right align-middle group-last:border-b-0">
                    <span className="font-mono text-sm font-semibold text-text-secondary">
                      {formatNumber(user.sessionCount)}
                    </span>
                  </td>
                  <td className="border-b border-surface-border-soft px-4 py-4 text-right align-middle text-sm text-text-muted group-last:border-b-0">
                    {formatDateTime(user.lastQuestionAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}
