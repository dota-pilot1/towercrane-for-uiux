import { useMemo } from 'react'
import { scaleQuantize } from 'd3-scale'
import { useHeatmap } from '../../../entities/analytics/api/analytics-api'

// 월요일 시작 (서버 matrix index 0 = 월)
const DAYS_KO = ['월', '화', '수', '목', '금', '토', '일']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

// 활동 강도 4단계 — 브랜드 색을 농도로 (테마 안전: color-mix + var(--primary))
const LEVELS = [26, 46, 68, 100]

/**
 * 요일 × 시간 활동 히트맵.
 * D3는 색 스케일(scaleQuantize)만 담당 — 값 → 4단계 농도 버킷.
 * 격자는 React가 렌더 (하이브리드 방식).
 */
export function WeekdayHourHeatmap({ days = 28 }: { days?: number }) {
  const { data, isLoading, isError } = useHeatmap(days)
  const matrix = data?.matrix

  // scaleQuantize: 연속값[1..max] → 이산 버킷[0..3]
  const { bucketOf, max } = useMemo(() => {
    const flat = matrix?.flat() ?? []
    const max = Math.max(1, ...flat)
    const scale = scaleQuantize<number>().domain([1, max]).range([0, 1, 2, 3])
    return { max, bucketOf: (v: number) => (v <= 0 ? -1 : scale(v)) }
  }, [matrix])

  function cellColor(v: number): string {
    const b = bucketOf(v)
    // 빈 칸: 두 테마 모두에서 또렷하게 보이는 옅은 회색
    if (b < 0) return 'color-mix(in srgb, var(--foreground) 7%, transparent)'
    return `color-mix(in srgb, var(--primary) ${LEVELS[b]}%, transparent)`
  }

  if (isLoading) {
    return <p className="py-12 text-center text-sm text-text-muted">불러오는 중…</p>
  }
  if (isError || !matrix) {
    return (
      <p className="py-12 text-center text-sm text-text-muted">
        히트맵을 불러오지 못했습니다.
      </p>
    )
  }

  return (
    <div>
      {/* 격자 */}
      <div
        className="grid items-center gap-[3px]"
        style={{ gridTemplateColumns: '28px repeat(24, minmax(0, 1fr))' }}
      >
        {/* 헤더: 시간 라벨 (3시간 간격) */}
        <div />
        {HOURS.map((h) => (
          <div
            key={`h-${h}`}
            className="h-3.5 text-center text-[10px] leading-[14px] text-text-muted"
          >
            {h % 3 === 0 ? h : ''}
          </div>
        ))}

        {/* 요일별 행 */}
        {DAYS_KO.map((day, d) => (
          <Row key={day} day={day} d={d} matrix={matrix} cellColor={cellColor} />
        ))}
      </div>

      {/* 범례 */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-text-muted">
        <span>적음</span>
        <span
          className="inline-block size-3 rounded-[3px]"
          style={{
            background: 'color-mix(in srgb, var(--foreground) 7%, transparent)',
            border: '0.5px solid var(--surface-border)',
          }}
        />
        {LEVELS.map((lv) => (
          <span
            key={lv}
            className="inline-block size-3 rounded-[3px]"
            style={{
              background: `color-mix(in srgb, var(--primary) ${lv}%, transparent)`,
            }}
          />
        ))}
        <span>많음 (최대 {max}회)</span>
      </div>
    </div>
  )
}

function Row({
  day,
  d,
  matrix,
  cellColor,
}: {
  day: string
  d: number
  matrix: number[][]
  cellColor: (v: number) => string
}) {
  return (
    <>
      <div className="pr-1.5 text-right text-xs text-text-secondary">{day}</div>
      {HOURS.map((h) => {
        const v = matrix[d]?.[h] ?? 0
        return (
          <div
            key={`${d}-${h}`}
            className="aspect-square rounded-[3px]"
            style={{
              background: cellColor(v),
              border: '0.5px solid var(--surface-border)',
            }}
            title={`${day}요일 ${h}시 · 활동 ${v}회`}
          />
        )
      })}
    </>
  )
}
