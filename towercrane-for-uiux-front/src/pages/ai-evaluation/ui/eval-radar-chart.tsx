import type { EvalSummary } from '../../../entities/ai-evaluation/model/types'

interface Props {
  summary: EvalSummary
}

export function EvalScoreChart({ summary }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {summary.categories.map((cat) => {
        const pct = cat.maxScore > 0 ? Math.round((cat.score / cat.maxScore) * 100) : 0
        return (
          <div key={cat.id} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary">{cat.name}</span>
              <span className="text-xs font-black text-text-primary tabular-nums">
                {cat.score}
                <span className="font-normal text-text-muted"> / {cat.maxScore}</span>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-brand-primary transition-all duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-right text-[10px] text-text-muted">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}
