import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { BarChart3, Zap, DollarSign, Users } from 'lucide-react'
import { apiRequest } from '../../../shared/api/http'

type Summary = { today: { calls: number; tokens: number; cost: number }; month: { calls: number; tokens: number; cost: number }; total: { calls: number; tokens: number; cost: number } }
type UserStat = { userId: string; userName: string; calls: number; promptTokens: number; completionTokens: number; totalTokens: number; estimatedCostUsd: number; lastUsedAt: string }
type DayStat = { date: string; calls: number; totalTokens: number; estimatedCostUsd: number }

const fetchSummary = () => apiRequest<Summary>('/admin/ai-monitoring/summary')
const fetchByUser = () => apiRequest<UserStat[]>('/admin/ai-monitoring/by-user')
const fetchByDay = () => apiRequest<DayStat[]>('/admin/ai-monitoring/by-day?days=30')

function fmt(n: number, digits = 0) {
  return n.toLocaleString('ko-KR', { maximumFractionDigits: digits })
}

function fmtCost(n: number) {
  return `$${n.toFixed(4)}`
}

export function AiMonitoringPage() {
  const { data: summary, isLoading: sl } = useQuery({ queryKey: ['ai-mon-summary'], queryFn: fetchSummary, refetchInterval: 60_000 })
  const { data: byUser, isLoading: ul } = useQuery({ queryKey: ['ai-mon-users'], queryFn: fetchByUser, refetchInterval: 60_000 })
  const { data: byDay } = useQuery({ queryKey: ['ai-mon-day'], queryFn: fetchByDay, refetchInterval: 300_000 })

  const loading = sl || ul

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand-glass border border-brand-border">
          <BarChart3 className="size-5 text-brand-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold ui-text-primary">사용량 모니터링</h1>
          <p className="text-xs ui-text-muted">GPT API 호출 · 토큰 · 비용 실시간 추적 (이번 달 기준)</p>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: '오늘 호출', value: fmt(summary?.today.calls ?? 0), icon: Zap, sub: `토큰 ${fmt(summary?.today.tokens ?? 0)}` },
          { label: '이번 달 호출', value: fmt(summary?.month.calls ?? 0), icon: BarChart3, sub: `토큰 ${fmt(summary?.month.tokens ?? 0)}` },
          { label: '이번 달 비용', value: fmtCost(summary?.month.cost ?? 0), icon: DollarSign, sub: '추정값 (USD)' },
          { label: '누적 비용', value: fmtCost(summary?.total.cost ?? 0), icon: Users, sub: `총 ${fmt(summary?.total.calls ?? 0)}건` },
        ].map((card) => (
          <div key={card.label} className="ui-panel rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs ui-text-muted">{card.label}</p>
              <card.icon className="size-4 text-brand-primary/60" />
            </div>
            <p className="text-2xl font-bold ui-text-primary">
              {loading ? <span className="animate-pulse">—</span> : card.value}
            </p>
            <p className="text-[11px] ui-text-muted">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* 일별 토큰 차트 */}
      {byDay && byDay.length > 0 && (
        <div className="ui-panel rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold ui-text-primary">일별 토큰 사용량 (최근 30일)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byDay} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border-soft)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
              <Tooltip
                formatter={(v: number) => [`${fmt(v)} 토큰`, '토큰']}
                labelFormatter={(l: string) => l}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="totalTokens" fill="var(--brand-primary)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 사용자별 테이블 */}
      <div className="ui-panel rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-border">
          <p className="text-sm font-semibold ui-text-primary">사용자별 현황 <span className="text-xs ui-text-muted font-normal ml-1">(이번 달)</span></p>
        </div>
        {loading ? (
          <div className="py-12 text-center text-sm ui-text-muted">불러오는 중...</div>
        ) : !byUser || byUser.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-sm font-medium ui-text-primary">아직 기록된 사용량이 없습니다</p>
            <p className="text-xs ui-text-muted">챗봇을 사용하면 자동으로 집계됩니다</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-muted">
                <th className="px-4 py-2.5 text-left text-xs font-semibold ui-text-muted">사용자</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold ui-text-muted">요청 수</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold ui-text-muted">입력 토큰</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold ui-text-muted">출력 토큰</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold ui-text-muted">합계 토큰</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold ui-text-muted">추정 비용</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border-soft">
              {byUser.map((u) => (
                <tr key={u.userId} className="hover:bg-surface-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium ui-text-primary">{u.userName}</td>
                  <td className="px-4 py-3 text-right tabular-nums ui-text-secondary">{fmt(u.calls)}</td>
                  <td className="px-4 py-3 text-right tabular-nums ui-text-secondary">{fmt(u.promptTokens)}</td>
                  <td className="px-4 py-3 text-right tabular-nums ui-text-secondary">{fmt(u.completionTokens)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold ui-text-primary">{fmt(u.totalTokens)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-brand-primary font-medium">{fmtCost(u.estimatedCostUsd)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-surface-border bg-surface-muted">
                <td className="px-4 py-2.5 text-xs font-bold ui-text-muted">합계</td>
                <td className="px-4 py-2.5 text-right text-xs font-bold ui-text-secondary tabular-nums">
                  {fmt(byUser.reduce((s, u) => s + u.calls, 0))}
                </td>
                <td className="px-4 py-2.5 text-right text-xs font-bold ui-text-secondary tabular-nums">
                  {fmt(byUser.reduce((s, u) => s + u.promptTokens, 0))}
                </td>
                <td className="px-4 py-2.5 text-right text-xs font-bold ui-text-secondary tabular-nums">
                  {fmt(byUser.reduce((s, u) => s + u.completionTokens, 0))}
                </td>
                <td className="px-4 py-2.5 text-right text-xs font-bold ui-text-primary tabular-nums">
                  {fmt(byUser.reduce((s, u) => s + u.totalTokens, 0))}
                </td>
                <td className="px-4 py-2.5 text-right text-xs font-bold text-brand-primary tabular-nums">
                  {fmtCost(byUser.reduce((s, u) => s + u.estimatedCostUsd, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
