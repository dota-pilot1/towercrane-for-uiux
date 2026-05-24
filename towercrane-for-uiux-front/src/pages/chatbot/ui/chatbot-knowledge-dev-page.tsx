import { Code2, Construction } from 'lucide-react'

export function ChatbotKnowledgeDevPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="ui-icon-button-brand rounded-md p-2.5">
          <Code2 className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold ui-text-primary">개발 자료</h2>
          <p className="text-xs ui-text-secondary">API 가이드·개발 환경·배포 프로세스 및 AI 검색</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-surface-border bg-surface-raised py-24">
        <Construction className="size-8 ui-text-muted" />
        <div className="text-center">
          <p className="text-sm font-semibold ui-text-secondary">구현 예정</p>
          <p className="mt-1 text-xs ui-text-muted">
            개발 자료 목록 + Function Calling 기반 AI 검색
          </p>
        </div>
      </div>
    </div>
  )
}
