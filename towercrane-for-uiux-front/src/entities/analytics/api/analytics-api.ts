import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '../../../shared/api/http'

export type DailyStat = { date: string; pv: number; uv: number }
export type TopPage = { path: string; pv: number; uv: number }
export type HeatmapData = { days: number; matrix: number[][] }
export type AnalyticsSummary = {
  days: number
  pv: number
  uv: number
  sessions: number
}

// ── 수집 (fire-and-forget — 실패해도 화면에 영향 없음) ───────────────────────
export function trackPageView(body: {
  path: string
  visitorId: string
  sessionId: string
  referrer?: string
}) {
  return apiRequest('/analytics/pageview', {
    method: 'POST',
    body: JSON.stringify(body),
  }).catch(() => {
    // 트래킹 실패는 무시
  })
}

// ── 조회 훅 ─────────────────────────────────────────────────────────────────
export function useDailyStats(days = 14) {
  return useQuery({
    queryKey: ['analytics', 'daily', days],
    queryFn: () => apiRequest<DailyStat[]>(`/analytics/daily?days=${days}`),
  })
}

export function useTopPages(days = 14, limit = 10) {
  return useQuery({
    queryKey: ['analytics', 'top-pages', days, limit],
    queryFn: () =>
      apiRequest<TopPage[]>(`/analytics/top-pages?days=${days}&limit=${limit}`),
  })
}

export function useHeatmap(days = 28) {
  return useQuery({
    queryKey: ['analytics', 'heatmap', days],
    queryFn: () => apiRequest<HeatmapData>(`/analytics/heatmap?days=${days}`),
  })
}

export function useAnalyticsSummary(days = 14) {
  return useQuery({
    queryKey: ['analytics', 'summary', days],
    queryFn: () =>
      apiRequest<AnalyticsSummary>(`/analytics/summary?days=${days}`),
  })
}
