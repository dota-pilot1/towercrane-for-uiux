import { Users } from 'lucide-react'
import {
  useAnalyticsSummary,
  useDailyStats,
} from '../../../entities/analytics/api/analytics-api'
import { DailyVisitorsBarChart, type BarDatum } from './daily-visitors-bar-chart'
import { WeekdayHourHeatmap } from './weekday-hour-heatmap'
import { TopPagesPanel } from './top-pages-panel'

const DAYS = 14
const HEATMAP_DAYS = 28

// 홈페이지 사용자 이용 통계
export function UsageStatsPage() {
  const daily = useDailyStats(DAYS)
  const summary = useAnalyticsSummary(DAYS)

  // 서버 응답(date: 'YYYY-MM-DD', pv) → 차트 입력(label: 'MM/DD', value)
  const bars: BarDatum[] = (daily.data ?? []).map((d) => ({
    label: d.date.slice(5).replace('-', '/'),
    value: d.pv,
  }))

  // 인당 평균 조회수 = 페이지뷰 ÷ 순방문자 (사람들이 얼마나 깊게 쓰나)
  const s = summary.data
  const avgPerVisitor =
    s && s.uv > 0 ? Math.round((s.pv / s.uv) * 10) / 10 : undefined

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="ui-panel-soft rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-brand-glass text-brand-primary">
            <Users className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-text-primary">이용 통계</h1>
            <p className="text-sm text-text-secondary">
              홈페이지 방문자 · 사용자 이용 현황 통계
            </p>
          </div>
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <StatCard label={`페이지뷰 (${DAYS}일)`} value={summary.data?.pv} />
        <StatCard label="인당 평균 조회수" value={avgPerVisitor} />
        <StatCard label="순방문자" value={summary.data?.uv} />
      </div>

      <div className="ui-panel mt-4 rounded-xl p-6">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-text-primary">
            일별 페이지뷰 (최근 {DAYS}일)
          </h2>
          <p className="text-xs text-text-secondary">D3 막대그래프 · 실데이터</p>
        </div>

        {daily.isLoading ? (
          <p className="py-16 text-center text-sm text-text-muted">
            불러오는 중…
          </p>
        ) : daily.isError ? (
          <p className="py-16 text-center text-sm text-text-muted">
            통계를 불러오지 못했습니다. (서버 재시작이 필요할 수 있어요)
          </p>
        ) : (
          <DailyVisitorsBarChart data={bars} />
        )}
      </div>

      {/* 요일×시간 활동 히트맵 (D3 scaleQuantize) */}
      <div className="ui-panel mt-4 rounded-xl p-6">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-text-primary">
            시간대별 활동량
          </h2>
          <p className="text-xs text-text-secondary">
            요일 × 시간 · 최근 {HEATMAP_DAYS}일 · 실데이터
          </p>
        </div>
        <WeekdayHourHeatmap days={HEATMAP_DAYS} />
      </div>

      {/* 인기 페이지 Top N */}
      <div className="ui-panel mt-4 rounded-xl p-6">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-text-primary">인기 페이지</h2>
          <p className="text-xs text-text-secondary">
            조회수 Top · 최근 {DAYS}일 · 실데이터
          </p>
        </div>
        <TopPagesPanel days={DAYS} limit={8} />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="ui-panel-soft rounded-xl p-4">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="mt-1 text-2xl font-black text-text-primary">
        {value?.toLocaleString() ?? '—'}
      </p>
    </div>
  )
}
