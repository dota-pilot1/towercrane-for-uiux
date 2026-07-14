import { Inbox } from 'lucide-react'
import { canActOnApproval } from '../../../entities/approval/model/can-act-on-approval'
import { ApprovalCard } from '../../../entities/approval/ui/approval-card'
import { useActOnApproval, useApprovalInbox } from '../../../shared/api/approval'
import { useSessionStore } from '../../../shared/store/session-store'
import { ApprovalPageLayout } from './approval-page-layout'

export function ApprovalInboxPage() {
  const currentUserId = useSessionStore((state) => state.userId)
  const inbox = useApprovalInbox()
  const act = useActOnApproval()
  const actionableItems = (inbox.data ?? []).filter(
    (request) => canActOnApproval(request, currentUserId),
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
            canAct={canActOnApproval(request, currentUserId)}
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
