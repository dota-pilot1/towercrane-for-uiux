import { Bot, Construction, Sparkles } from 'lucide-react'

// AI 사용 통계 — 뼈대만 (구현 예정)
export function AiUsageStatsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="ui-panel-soft rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-brand-glass text-brand-primary">
            <Bot className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-text-primary">AI 통계</h1>
            <p className="text-sm text-text-secondary">
              AI 기능 사용량 · 토큰 소비 · 모델별 호출 통계
            </p>
          </div>
        </div>
      </div>

      <div className="ui-panel mt-6 flex flex-col items-center justify-center gap-3 rounded-xl px-6 py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-surface-muted text-text-muted">
          <Construction className="size-7" />
        </div>
        <p className="text-base font-bold text-text-primary">구현 예정</p>
        <p className="max-w-md text-sm text-text-secondary">
          챗봇 호출 횟수, 모델별 사용 비중, 토큰 소비량, 비용 추이 등 AI 사용
          통계 대시보드가 이 페이지에 추가될 예정입니다.
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-surface-border-soft bg-surface-muted px-3 py-1 text-xs font-medium text-text-muted">
          <Sparkles className="size-3.5" />
          AI 사용량 시각화 예정
        </div>
      </div>
    </div>
  )
}
