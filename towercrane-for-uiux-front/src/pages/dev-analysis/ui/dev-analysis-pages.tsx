import { AlertTriangle, Lightbulb, LineChart, Target, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// 개발 분석 — 분석 코너 (준비 중 stub)
function AnalysisPlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="flex items-center gap-3 border-b border-surface-border-soft py-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand-glass text-brand-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <h1 className="text-base font-black text-text-primary">{title}</h1>
          <p className="text-xs text-text-secondary">{description}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center justify-center gap-4 rounded-2xl border border-surface-border-soft bg-surface-raised py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-surface-muted text-text-muted">
          <LineChart className="size-7" />
        </div>
        <div>
          <p className="text-sm font-bold text-text-primary">준비 중입니다</p>
          <p className="mt-1 text-xs text-text-muted">개발 분석 기능은 곧 제공됩니다.</p>
        </div>
      </div>
    </div>
  )
}

export function AnalysisTechDebtPage() {
  return (
    <AnalysisPlaceholder
      icon={AlertTriangle}
      title="기술 부채 분석"
      description="코드·아키텍처의 기술 부채를 진단합니다."
    />
  )
}

export function AnalysisTrendsPage() {
  return (
    <AnalysisPlaceholder
      icon={TrendingUp}
      title="최신 트렌드 분석"
      description="최신 기술 트렌드를 정리·분석합니다."
    />
  )
}

export function AnalysisDomainPage() {
  return (
    <AnalysisPlaceholder
      icon={Target}
      title="전문 도메인 분석"
      description="도메인 지식과 업계 맥락을 분석합니다."
    />
  )
}

export function AnalysisConceptsPage() {
  return (
    <AnalysisPlaceholder
      icon={Lightbulb}
      title="개발 개념 분석"
      description="핵심 개발 개념을 깊이 있게 풀어냅니다."
    />
  )
}
