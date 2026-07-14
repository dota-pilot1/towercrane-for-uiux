import { Link } from '@tanstack/react-router'
import { CheckCircle2, Clock, Inbox, Plus, XCircle } from 'lucide-react'
import { canActOnApproval } from '../../../entities/approval/model/can-act-on-approval'
import { ApprovalCard } from '../../../entities/approval/ui/approval-card'
import { useApprovalInbox, useApprovalSent } from '../../../shared/api/approval'
import { useSessionStore } from '../../../shared/store/session-store'
import { APPROVAL_PATHS } from '../config/approval-navigation'
import { ApprovalPageLayout } from './approval-page-layout'

export function ApprovalHomePage() {
  const currentUserId = useSessionStore((state) => state.userId)
  const inbox = useApprovalInbox()
  const sent = useApprovalSent()
  const inboxItems = inbox.data ?? []
  const sentItems = sent.data ?? []
  const pendingSent = sentItems.filter((request) => request.status === 'PENDING')
  const summaries = [
    {
      label: '결재할 문서',
      value: inboxItems.filter((request) =>
        canActOnApproval(request, currentUserId),
      ).length,
      path: APPROVAL_PATHS.inbox,
      icon: Inbox,
    },
    {
      label: '진행 중',
      value: pendingSent.length,
      path: APPROVAL_PATHS.sent,
      icon: Clock,
    },
    {
      label: '승인 완료',
      value: sentItems.filter((request) => request.status === 'APPROVED').length,
      path: APPROVAL_PATHS.documents,
      icon: CheckCircle2,
    },
    {
      label: '반려',
      value: sentItems.filter((request) => request.status === 'REJECTED').length,
      path: APPROVAL_PATHS.documents,
      icon: XCircle,
    },
  ]

  return (
    <ApprovalPageLayout>
      {inbox.isLoading || sent.isLoading ? (
        <p className="text-[13px] text-text-muted">결재 현황을 불러오는 중…</p>
      ) : (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summaries.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className="ui-panel-soft flex items-center gap-3 rounded-xl p-4 text-left transition-colors hover:bg-surface-muted"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-brand-glass">
                    <Icon className="size-5 text-brand-primary" />
                  </span>
                  <span>
                    <span className="block text-[11px] font-semibold text-text-muted">
                      {item.label}
                    </span>
                    <strong className="mt-0.5 block text-xl text-text-primary">
                      {item.value}
                    </strong>
                  </span>
                </Link>
              )
            })}
          </section>

          <section className="ui-panel-soft rounded-xl p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[14px] font-bold text-text-primary">
                  현재 진행 중인 기안
                </h2>
                <p className="mt-0.5 text-[11px] text-text-muted">
                  결재 단계와 현재 담당자를 바로 확인합니다.
                </p>
              </div>
              <Link
                to={APPROVAL_PATHS.write}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-2 text-[12px] font-bold text-text-on-brand"
              >
                <Plus className="size-3.5" /> 새 문서
              </Link>
            </div>
            {pendingSent.length === 0 ? (
              <div className="rounded-lg border border-dashed border-surface-border py-10 text-center text-[12px] text-text-muted">
                진행 중인 기안 문서가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingSent.slice(0, 3).map((request) => (
                  <ApprovalCard key={request.id} req={request} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </ApprovalPageLayout>
  )
}
