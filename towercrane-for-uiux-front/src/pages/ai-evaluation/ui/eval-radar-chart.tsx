import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { EvalSummary } from '../../../entities/ai-evaluation/model/types'

interface Props {
  summary: EvalSummary
}

export function EvalRadarChart({ summary }: Props) {
  const data = summary.categories.map((cat) => ({
    subject: cat.name,
    score: cat.score,
    max: cat.maxScore,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
        <PolarGrid stroke="var(--color-surface-border)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: 'var(--color-text-secondary)', fontSize: 11, fontWeight: 700 }}
        />
        <Radar
          name="점수"
          dataKey="score"
          stroke="var(--color-brand-primary)"
          fill="var(--color-brand-primary)"
          fillOpacity={0.25}
          strokeWidth={2}
          dot={{ fill: 'var(--color-brand-primary)', r: 3 }}
        />
        <Tooltip
          formatter={(value: number) => [`${value}점`, '점수']}
          contentStyle={{
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-surface-border)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--color-text-primary)',
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
