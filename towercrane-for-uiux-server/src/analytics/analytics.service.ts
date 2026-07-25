import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { pageViewsTable } from '../database/schema';

// KST 보정: created_at은 UTC ISO로 저장 → 집계 시 +9시간으로 한국 시각 기준 그룹핑
const KST = '+9 hours';

export interface TrackPageViewInput {
  path: string;
  visitorId: string;
  sessionId: string;
  referrer?: string | null;
  userId?: string | null;
}

interface DailyAnalyticsRow {
  day: string;
  pv: number;
  uv: number;
}

export interface TopPageAnalyticsRow {
  path: string;
  pv: number;
  uv: number;
}

interface HeatmapAnalyticsRow {
  dow: number;
  hour: number;
  count: number;
}

interface AnalyticsSummaryRow {
  pv: number;
  uv: number;
  sessions: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  // 기준 시각(days일 전)의 ISO 문자열
  private cutoff(days: number): string {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  }

  // ── 수집: page_view 1건 기록 ────────────────────────────────────────────────
  track(input: TrackPageViewInput) {
    const now = new Date().toISOString();
    this.db
      .insert(pageViewsTable)
      .values({
        id: randomUUID(),
        userId: input.userId ?? null,
        visitorId: input.visitorId,
        sessionId: input.sessionId,
        path: input.path,
        referrer: input.referrer ?? null,
        createdAt: now,
      })
      .run();
    return { ok: true };
  }

  // ── 일별 PV/UV (막대그래프용) ────────────────────────────────────────────────
  daily(days = 14) {
    const rows = this.db.all<DailyAnalyticsRow>(
      sql`
        SELECT strftime('%Y-%m-%d', created_at, ${KST}) AS day,
               COUNT(*) AS pv,
               COUNT(DISTINCT visitor_id) AS uv
        FROM page_views
        WHERE created_at >= ${this.cutoff(days)}
        GROUP BY day
        ORDER BY day
      `,
    );

    // 데이터 없는 날도 0으로 채워 연속 구간 반환
    const byDay = new Map(rows.map((r) => [r.day, r]));
    const out: Array<{ date: string; pv: number; uv: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      // KST 기준 날짜 키 (UTC+9)
      const key = new Date(d.getTime() + 9 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const hit = byDay.get(key);
      out.push({ date: key, pv: hit?.pv ?? 0, uv: hit?.uv ?? 0 });
    }
    return out;
  }

  // ── 페이지별 조회수 Top N ───────────────────────────────────────────────────
  topPages(days = 14, limit = 10) {
    return this.db.all<TopPageAnalyticsRow>(
      sql`
        SELECT path,
               COUNT(*) AS pv,
               COUNT(DISTINCT visitor_id) AS uv
        FROM page_views
        WHERE created_at >= ${this.cutoff(days)}
        GROUP BY path
        ORDER BY pv DESC
        LIMIT ${limit}
      `,
    );
  }

  // ── 요일 × 시간 활동 히트맵 (7×24, index 0 = 월요일) ────────────────────────
  heatmap(days = 28) {
    const rows = this.db.all<HeatmapAnalyticsRow>(
      sql`
        SELECT CAST(strftime('%w', created_at, ${KST}) AS INTEGER) AS dow,
               CAST(strftime('%H', created_at, ${KST}) AS INTEGER) AS hour,
               COUNT(*) AS count
        FROM page_views
        WHERE created_at >= ${this.cutoff(days)}
        GROUP BY dow, hour
      `,
    );

    // 7행(월~일) × 24열(0~23시) 0 행렬
    const matrix: number[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => 0),
    );
    for (const r of rows) {
      // strftime %w: 0=일요일..6=토요일 → 월요일 시작 인덱스로 변환
      const mondayIdx = (r.dow + 6) % 7;
      matrix[mondayIdx][r.hour] = r.count;
    }
    return { days, matrix };
  }

  // ── 요약 지표 (KPI 카드용) ──────────────────────────────────────────────────
  summary(days = 14) {
    const row = this.db.get<AnalyticsSummaryRow | undefined>(
      sql`
        SELECT COUNT(*) AS pv,
               COUNT(DISTINCT visitor_id) AS uv,
               COUNT(DISTINCT session_id) AS sessions
        FROM page_views
        WHERE created_at >= ${this.cutoff(days)}
      `,
    );
    return {
      days,
      pv: row?.pv ?? 0,
      uv: row?.uv ?? 0,
      sessions: row?.sessions ?? 0,
    };
  }
}
