import { useTopPages } from '../../../entities/analytics/api/analytics-api'

// 인기 페이지 Top N — 어떤 화면이 많이/적게 쓰이는지
export function TopPagesPanel({ days = 14, limit = 8 }: { days?: number; limit?: number }) {
  const { data, isLoading, isError } = useTopPages(days, limit)
  const rows = data ?? []
  const max = Math.max(1, ...rows.map((r) => r.pv))

  if (isLoading) {
    return <p className="py-10 text-center text-sm text-text-muted">불러오는 중…</p>
  }
  if (isError) {
    return (
      <p className="py-10 text-center text-sm text-text-muted">
        인기 페이지를 불러오지 못했습니다.
      </p>
    )
  }
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-text-muted">
        아직 데이터가 없습니다.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r, i) => (
        <li key={r.path} className="flex items-center gap-3">
          <span className="w-5 shrink-0 text-right text-xs font-bold text-text-muted">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="truncate text-sm text-text-primary" title={r.path}>
                {r.path}
              </span>
              <span className="shrink-0 text-xs text-text-secondary">
                {r.pv.toLocaleString()} PV · {r.uv.toLocaleString()} UV
              </span>
            </div>
            {/* 미니 막대 — pv 비중 */}
            <div
              className="h-2 w-full overflow-hidden rounded-full"
              style={{ background: 'var(--surface-strong)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(r.pv / max) * 100}%`,
                  background: 'var(--primary)',
                }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
