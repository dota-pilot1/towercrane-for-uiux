import { useMemo, useState } from 'react'
import { FolderOpen } from 'lucide-react'
import { ApprovalCard } from '../../../entities/approval/ui/approval-card'
import {
  useApprovalInbox,
  useApprovalSent,
  type ApprovalRequest,
  type ApprovalStatus,
} from '../../../shared/api/approval'
import { ApprovalPageLayout } from './approval-page-layout'

type DocumentFilter = 'ALL' | ApprovalStatus

const FILTERS: Array<{ id: DocumentFilter; label: string }> = [
  { id: 'ALL', label: '전체' },
  { id: 'PENDING', label: '진행 중' },
  { id: 'APPROVED', label: '승인 완료' },
  { id: 'REJECTED', label: '반려' },
  { id: 'CANCELLED', label: '회수·취소' },
]

export function ApprovalDocumentsPage() {
  const [filter, setFilter] = useState<DocumentFilter>('ALL')
  const inbox = useApprovalInbox()
  const sent = useApprovalSent()
  const documents = useMemo(() => {
    const byId = new Map<string, ApprovalRequest>()
    for (const request of [...(inbox.data ?? []), ...(sent.data ?? [])]) {
      byId.set(request.id, request)
    }
    return [...byId.values()].sort(
      (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
    )
  }, [inbox.data, sent.data])
  const filtered =
    filter === 'ALL'
      ? documents
      : documents.filter((request) => request.status === filter)

  return (
    <ApprovalPageLayout>
      {inbox.isLoading || sent.isLoading ? (
        <p className="text-[13px] text-text-muted">문서함을 불러오는 중…</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  filter === item.id
                    ? 'border-brand-border bg-brand-glass text-brand-primary'
                    : 'border-surface-border-soft bg-surface-raised text-text-secondary hover:bg-surface-muted'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <FolderOpen className="size-8 text-text-muted" strokeWidth={1.5} />
              <p className="text-[13px] text-text-muted">조건에 맞는 문서가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((request) => (
                <ApprovalCard key={request.id} req={request} />
              ))}
            </div>
          )}
        </div>
      )}
    </ApprovalPageLayout>
  )
}
