import { Send } from 'lucide-react'
import { useApprovalSent } from '../../../shared/api/approval'
import { ApprovalCard } from './approval-page-content'
import { ApprovalPageLayout } from './approval-page-layout'

export function ApprovalSentPage() {
  const sent = useApprovalSent()

  return (
    <ApprovalPageLayout>
      <div className="space-y-3">
        {sent.isLoading && <p className="text-[13px] text-text-muted">불러오는 중…</p>}
        {sent.error && <p className="text-[13px] text-destructive">{sent.error.message}</p>}
        {!sent.isLoading && sent.data?.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <Send className="size-8 text-text-muted" strokeWidth={1.5} />
            <p className="text-[13px] text-text-muted">기안한 문서가 없습니다.</p>
          </div>
        )}
        {(sent.data ?? []).map((request) => (
          <ApprovalCard key={request.id} req={request} />
        ))}
      </div>
    </ApprovalPageLayout>
  )
}
