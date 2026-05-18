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
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
        <PolarGrid stroke="var(--surface-border-soft)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}
        />
        <Radar
          name="점수"
          dataKey="score"
          stroke="var(--brand-primary)"
          fill="var(--brand-primary)"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Tooltip
          formatter={(value: number) => [`${value}점`, '점수']}
          contentStyle={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--surface-border-soft)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--text-primary)',
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
