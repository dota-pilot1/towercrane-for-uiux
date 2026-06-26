import { useEffect, useRef } from 'react'
import { select } from 'd3-selection'
import { scaleBand, scaleLinear } from 'd3-scale'
import { axisBottom, axisLeft } from 'd3-axis'

// 차트는 "그리기"만 담당 — 데이터는 부모(페이지)가 fetch해서 prop으로 내려준다.
export type BarDatum = { label: string; value: number }

// SVG 좌표계 크기 (viewBox 기준 — 컨테이너 폭에 맞춰 100%로 늘어남)
const WIDTH = 760
const HEIGHT = 340
const MARGIN = { top: 16, right: 16, bottom: 36, left: 44 }
const INNER_W = WIDTH - MARGIN.left - MARGIN.right
const INNER_H = HEIGHT - MARGIN.top - MARGIN.bottom

/**
 * D3 "풀컨트롤" 막대그래프.
 * React는 빈 <svg>만 그리고, 그 안쪽은 d3.select 로 D3가 그린다.
 *   1) scale — 데이터값 → 픽셀좌표
 *   2) axis  — scale을 눈금/라벨로
 *   3) join  — 데이터 배열 ↔ <rect>
 */
export function DailyVisitorsBarChart({ data }: { data: BarDatum[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (!svgRef.current) return
    const svg = select(svgRef.current)
    svg.selectAll('*').remove() // 재렌더 시 초기화

    const g = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    // ── 1) scale ───────────────────────────────────────────────────────────
    const x = scaleBand<string>()
      .domain(data.map((d) => d.label))
      .range([0, INNER_W])
      .padding(0.3)

    // 데이터가 전부 0이어도 축이 깨지지 않도록 최소 1 보장
    const maxValue = Math.max(1, ...data.map((d) => d.value))
    const y = scaleLinear()
      .domain([0, maxValue])
      .range([INNER_H, 0]) // y축은 뒤집힘 (SVG는 위가 0)
      .nice()

    // ── 2) axis ────────────────────────────────────────────────────────────
    g.append('g')
      .attr('transform', `translate(0,${INNER_H})`)
      .call(axisBottom(x))
    g.append('g').call(axisLeft(y).ticks(5))

    // ── 3) data join ─────────────────────────────────────────────────────────
    g.selectAll('rect.bar')
      .data(data)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', (d) => x(d.label) ?? 0)
      .attr('y', (d) => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', (d) => INNER_H - y(d.value))
      .attr('rx', 4)
      .attr('fill', 'var(--primary)')
  }, [data])

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full text-text-secondary"
      role="img"
      aria-label="최근 14일 일별 방문자 막대그래프"
    />
  )
}
