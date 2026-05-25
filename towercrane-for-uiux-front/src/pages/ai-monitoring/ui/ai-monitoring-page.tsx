import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { BarChart3, Zap, DollarSign, Users, RefreshCw, Bot } from 'lucide-react'
import { apiRequest } from '../../../shared/api/http'
import { Button } from '../../../shared/ui/button'

type Summary = { today: { calls: number; tokens: number; cost: number }; month: { calls: number; tokens: number; cost: number }; total: { calls: number; tokens: number; cost: number } }
type UserStat = { userId: string; userName: string; calls: number; promptTokens: number; completionTokens: number; totalTokens: number; estimatedCostUsd: number; lastUsedAt: string }
type DayStat = { date: string; calls: number; totalTokens: number; estimatedCostUsd: number }
type ModelInfo = { id: string; created: number; ownedBy: string }
type ModelsResponse = { models: ModelInfo[]; error?: string }

const fetchSummary = () => apiRequest<Summary>('/admin/ai-monitoring/summary')
const fetchByUser = () => apiRequest<UserStat[]>('/admin/ai-monitoring/by-user')
const fetchByDay = () => apiRequest<DayStat[]>('/admin/ai-monitoring/by-day?days=30')
const fetchModels = () => apiRequest<ModelsResponse>('/admin/ai-monitoring/models')

function fmt(n: number, digits = 0) {
  return n.toLocaleString('ko-KR', { maximumFractionDigits: digits })
}

function fmtCost(n: number) {
  return `$${n.toFixed(4)}`
}

function fmtDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

function fillDates(data: DayStat[], days: number): DayStat[] {
  const map = new Map(data.map((d) => [d.date, d]))
  return Array.from({ length: days }, (_, i) => {
    const dt = new Date()
    dt.setDate(dt.getDate() - (days - 1 - i))
    const date = dt.toISOString().slice(0, 10)
    return map.get(date) ?? { date, calls: 0, totalTokens: 0, estimatedCostUsd: 0 }
  })
}

export function AiMonitoringPage() {
  const summaryQ = useQuery({ queryKey: ['ai-mon-summary'], queryFn: fetchSummary, refetchInterval: 60_000 })
  const byUserQ = useQuery({ queryKey: ['ai-mon-users'], queryFn: fetchByUser, refetchInterval: 60_000 })
  const byDayQ = useQuery({ queryKey: ['ai-mon-day'], queryFn: fetchByDay, refetchInterval: 300_000 })
  const modelsQ = useQuery({ queryKey: ['ai-mon-models'], queryFn: fetchModels, staleTime: 10 * 60_000 })

  const loading = summaryQ.isLoading || byUserQ.isLoading
  const chartData = fillDates(byDayQ.data ?? [], 30)

  const handleRefresh = () => {
    void summaryQ.refetch()
    void byUserQ.refetch()
    void byDayQ.refetch()
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-5 px-4 py-6 lg:px-8">
      {/* 헤더 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
            <BarChart3 className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-text-primary">AI 사용량 모니터링</h1>
            <p className="mt-1 text-sm text-text-secondary">GPT API 호출 · 토큰 · 비용 추적 (이번 달 기준)</p>
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={handleRefresh} disabled={summaryQ.isFetching || byUserQ.isFetching}>
          <RefreshCw className="mr-1.5 size-3.5" />
          새로고침
        </Button>
      </div>

      {/* KPI 카드 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: '오늘 호출', value: fmt(summaryQ.data?.today.calls ?? 0), icon: Zap, sub: `토큰 ${fmt(summaryQ.data?.today.tokens ?? 0)}` },
          { label: '이번 달 호출', value: fmt(summaryQ.data?.month.calls ?? 0), icon: BarChart3, sub: `토큰 ${fmt(summaryQ.data?.month.tokens ?? 0)}` },
          { label: '이번 달 비용', value: fmtCost(summaryQ.data?.month.cost ?? 0), icon: DollarSign, sub: '추정값 (USD)' },
          { label: '누적 비용', value: fmtCost(summaryQ.data?.total.cost ?? 0), icon: Users, sub: `총 ${fmt(summaryQ.data?.total.calls ?? 0)}건` },
        ].map((card) => (
          <div key={card.label} className="ui-panel-soft flex min-h-28 items-start justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-xs font-bold text-text-muted">{card.label}</p>
              <p className="mt-2 text-2xl font-black text-text-primary">
                {loading ? <span className="animate-pulse text-text-muted">—</span> : card.value}
              </p>
              <p className="mt-1 text-xs text-text-secondary">{card.sub}</p>
            </div>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
              <card.icon className="size-5" />
            </div>
          </div>
        ))}
      </div>

      {/* 일별 토큰 차트 */}
      <div className="ui-panel-soft rounded-xl p-5 space-y-3">
          <p className="text-sm font-semibold text-text-primary">일별 토큰 사용량 <span className="text-xs text-text-muted font-normal ml-1">(최근 30일)</span></p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} width={32} />
              <Tooltip
                formatter={(v: number) => [`${fmt(v)} 토큰`, '사용량']}
                labelFormatter={(l: string) => l}
                contentStyle={{ fontSize: 12, background: 'var(--surface-raised)', border: '1px solid var(--surface-border)', borderRadius: 8, color: 'var(--text-primary)' }}
                cursor={{ stroke: '#22c55e', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area type="monotone" dataKey="totalTokens" stroke="#22c55e" strokeWidth={2} fill="url(#tokenGradient)" dot={false} activeDot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      {/* 사용자별 테이블 */}
      <div className="ui-panel-soft rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-border">
          <p className="text-sm font-semibold text-text-primary">사용자별 현황 <span className="text-xs text-text-muted font-normal ml-1">(이번 달)</span></p>
        </div>
        {byUserQ.isLoading ? (
          <div className="py-12 text-center text-sm text-text-muted">불러오는 중...</div>
        ) : !byUserQ.data || byUserQ.data.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-sm font-medium text-text-primary">아직 기록된 사용량이 없습니다</p>
            <p className="text-xs text-text-muted">챗봇을 사용하면 자동으로 집계됩니다</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-muted/50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted">사용자</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-muted">요청 수</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-muted">입력 토큰</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-muted">출력 토큰</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-muted">합계 토큰</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-muted">추정 비용</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border-soft">
              {byUserQ.data.map((u) => (
                <tr key={u.userId} className="hover:bg-surface-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{u.userName}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-secondary">{fmt(u.calls)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-secondary">{fmt(u.promptTokens)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-secondary">{fmt(u.completionTokens)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-text-primary">{fmt(u.totalTokens)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-brand-primary font-medium">{fmtCost(u.estimatedCostUsd)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-surface-border bg-surface-muted/50">
                <td className="px-4 py-2.5 text-xs font-bold text-text-muted">합계</td>
                <td className="px-4 py-2.5 text-right text-xs font-bold text-text-secondary tabular-nums">{fmt(byUserQ.data.reduce((s, u) => s + u.calls, 0))}</td>
                <td className="px-4 py-2.5 text-right text-xs font-bold text-text-secondary tabular-nums">{fmt(byUserQ.data.reduce((s, u) => s + u.promptTokens, 0))}</td>
                <td className="px-4 py-2.5 text-right text-xs font-bold text-text-secondary tabular-nums">{fmt(byUserQ.data.reduce((s, u) => s + u.completionTokens, 0))}</td>
                <td className="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums">{fmt(byUserQ.data.reduce((s, u) => s + u.totalTokens, 0))}</td>
                <td className="px-4 py-2.5 text-right text-xs font-bold text-brand-primary tabular-nums">{fmtCost(byUserQ.data.reduce((s, u) => s + u.estimatedCostUsd, 0))}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* GPT 모델 목록 */}
      <div className="ui-panel-soft rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-border flex items-center gap-2">
          <Bot className="size-4 text-brand-primary" />
          <p className="text-sm font-semibold text-text-primary">사용 가능한 GPT 모델 <span className="text-xs text-text-muted font-normal ml-1">(현재 API 키 기준)</span></p>
        </div>
        {modelsQ.isLoading ? (
          <div className="py-10 text-center text-sm text-text-muted">모델 목록 조회 중...</div>
        ) : modelsQ.data?.error ? (
          <div className="py-10 text-center text-sm text-text-muted">{modelsQ.data.error}</div>
        ) : !modelsQ.data?.models.length ? (
          <div className="py-10 text-center text-sm text-text-muted">모델 정보를 불러올 수 없습니다</div>
        ) : (
          <div className="divide-y divide-surface-border-soft">
            {modelsQ.data.models.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3 hover:bg-surface-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-glass border border-brand-border">
                    <Bot className="size-3.5 text-brand-primary" />
                  </div>
                  <span className="text-sm font-medium text-text-primary font-mono">{m.id}</span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <span className="text-xs text-text-muted hidden sm:block">출시 {fmtDate(m.created)}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-glass border border-brand-border text-brand-primary">{m.ownedBy}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
