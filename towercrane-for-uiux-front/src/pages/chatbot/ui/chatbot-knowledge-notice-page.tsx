import { Bell, Construction } from 'lucide-react'

export function ChatbotKnowledgeNoticePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="ui-icon-button-brand rounded-md p-2.5">
          <Bell className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold ui-text-primary">공지사항</h2>
          <p className="text-xs ui-text-secondary">사내 공지사항 목록 및 AI 검색</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-surface-border bg-surface-raised py-24">
        <Construction className="size-8 ui-text-muted" />
        <div className="text-center">
          <p className="text-sm font-semibold ui-text-secondary">구현 예정</p>
          <p className="mt-1 text-xs ui-text-muted">
            공지사항 목록 + Function Calling 기반 AI 검색
          </p>
        </div>
      </div>
    </div>
  )
}
