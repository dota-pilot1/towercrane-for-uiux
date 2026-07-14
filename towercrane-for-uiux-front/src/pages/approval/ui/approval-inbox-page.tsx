import { Inbox } from 'lucide-react'
import { useActOnApproval, useApprovalInbox } from '../../../shared/api/approval'
import { ApprovalCard } from './approval-page-content'
import { ApprovalPageLayout } from './approval-page-layout'

export function ApprovalInboxPage() {
  const inbox = useApprovalInbox()
  const act = useActOnApproval()
  const actionableItems = (inbox.data ?? []).filter(
    (request) => request.status === 'PENDING',
  )

  return (
    <ApprovalPageLayout>
      <div className="space-y-3">
        {inbox.isLoading && <p className="text-[13px] text-text-muted">불러오는 중…</p>}
        {inbox.error && (
          <p className="text-[13px] text-destructive">{inbox.error.message}</p>
        )}
        {act.error && <p className="text-[13px] text-destructive">{act.error.message}</p>}
        {!inbox.isLoading && actionableItems.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <Inbox className="size-8 text-text-muted" strokeWidth={1.5} />
            <p className="text-[13px] text-text-muted">결재할 문서가 없습니다.</p>
          </div>
        )}
        {actionableItems.map((request) => (
          <ApprovalCard
            key={request.id}
            req={request}
            canAct
            onAct={(id, action, comment) =>
              act.mutate({
                id,
                dto: { action, comment: comment.trim() || undefined },
              })
            }
          />
        ))}
      </div>
    </ApprovalPageLayout>
  )
}
