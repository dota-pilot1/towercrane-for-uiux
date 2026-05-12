import { defineExampleSet } from './shared'

export const analyticsEventExamples = defineExampleSet('08_analytics_event.sql', {
  beginner: [
    {
      title: '마케팅 수신 동의 사용자',
      relatedTables: ['users'],
      sql: `SELECT id, email, signed_up_at
FROM users
WHERE marketing_opt_in = 1
ORDER BY signed_up_at;`,
    },
    {
      title: '캠페인 채널별 수',
      relatedTables: ['campaigns'],
      sql: `SELECT channel, COUNT(*) AS campaign_count
FROM campaigns
GROUP BY channel
ORDER BY campaign_count DESC;`,
    },
    {
      title: '디바이스 유형별 수',
      relatedTables: ['devices'],
      sql: `SELECT device_type, COUNT(*) AS device_count
FROM devices
GROUP BY device_type
ORDER BY device_count DESC;`,
    },
    {
      title: '페이지 그룹별 수',
      relatedTables: ['pages'],
      sql: `SELECT page_group, COUNT(*) AS page_count
FROM pages
GROUP BY page_group
ORDER BY page_count DESC;`,
    },
    {
      title: '일자별 세션 수',
      relatedTables: ['sessions'],
      sql: `SELECT date(started_at) AS visit_date, COUNT(*) AS session_count
FROM sessions
GROUP BY date(started_at)
ORDER BY visit_date;`,
    },
    {
      title: '이벤트명별 수',
      relatedTables: ['events'],
      sql: `SELECT event_name, COUNT(*) AS event_count
FROM events
GROUP BY event_name
ORDER BY event_count DESC;`,
    },
    {
      title: '구매 이벤트',
      relatedTables: ['events'],
      sql: `SELECT id, session_id, event_value, occurred_at
FROM events
WHERE event_name = 'purchase'
ORDER BY occurred_at;`,
    },
    {
      title: '익명 세션',
      relatedTables: ['sessions'],
      sql: `SELECT id, campaign_id, device_id, started_at
FROM sessions
WHERE user_id IS NULL
ORDER BY started_at;`,
    },
    {
      title: '세션 길이 보기',
      relatedTables: ['sessions'],
      sql: `SELECT id, started_at, ended_at,
  ROUND((julianday(ended_at) - julianday(started_at)) * 24 * 60, 1) AS session_minutes
FROM sessions
WHERE ended_at IS NOT NULL
ORDER BY session_minutes DESC;`,
    },
    {
      title: '이벤트 값 합계',
      relatedTables: ['events'],
      sql: `SELECT event_name, SUM(COALESCE(event_value, 0)) AS total_value
FROM events
GROUP BY event_name
ORDER BY total_value DESC;`,
    },
  ],
  intermediate: [
    {
      title: '세션과 사용자',
      relatedTables: ['sessions', 'users'],
      sql: `SELECT s.id AS session_id, u.email, s.started_at
FROM sessions s
LEFT JOIN users u ON u.id = s.user_id
ORDER BY s.started_at;`,
    },
    {
      title: '세션과 캠페인',
      relatedTables: ['sessions', 'campaigns'],
      sql: `SELECT s.id AS session_id, c.name AS campaign_name, c.channel, s.started_at
FROM sessions s
LEFT JOIN campaigns c ON c.id = s.campaign_id
ORDER BY s.started_at;`,
    },
    {
      title: '세션과 디바이스',
      relatedTables: ['sessions', 'devices'],
      sql: `SELECT s.id AS session_id, d.device_type, d.os, d.browser
FROM sessions s
JOIN devices d ON d.id = s.device_id
ORDER BY s.id;`,
    },
    {
      title: '페이지별 이벤트 수',
      relatedTables: ['events', 'pages'],
      sql: `SELECT p.path, p.page_group, COUNT(e.id) AS event_count
FROM pages p
LEFT JOIN events e ON e.page_id = p.id
GROUP BY p.id, p.path, p.page_group
ORDER BY event_count DESC;`,
    },
    {
      title: '캠페인별 세션 수',
      relatedTables: ['campaigns', 'sessions'],
      sql: `SELECT c.name, COUNT(s.id) AS session_count
FROM campaigns c
LEFT JOIN sessions s ON s.campaign_id = c.id
GROUP BY c.id, c.name
ORDER BY session_count DESC;`,
    },
    {
      title: '디바이스별 이벤트 수',
      relatedTables: ['devices', 'sessions', 'events'],
      sql: `SELECT d.device_type, COUNT(e.id) AS event_count
FROM devices d
JOIN sessions s ON s.device_id = d.id
JOIN events e ON e.session_id = s.id
GROUP BY d.device_type
ORDER BY event_count DESC;`,
    },
    {
      title: '사용자별 세션 수',
      relatedTables: ['users', 'sessions'],
      sql: `SELECT u.email, COUNT(s.id) AS session_count
FROM users u
LEFT JOIN sessions s ON s.user_id = u.id
GROUP BY u.id, u.email
ORDER BY session_count DESC;`,
    },
    {
      title: '사용자별 이벤트 수',
      relatedTables: ['users', 'sessions', 'events'],
      sql: `SELECT u.email, COUNT(e.id) AS event_count
FROM users u
JOIN sessions s ON s.user_id = u.id
JOIN events e ON e.session_id = s.id
GROUP BY u.id, u.email
ORDER BY event_count DESC;`,
    },
    {
      title: '캠페인 채널별 구매 금액',
      relatedTables: ['campaigns', 'sessions', 'events'],
      sql: `SELECT c.channel, SUM(e.event_value) AS purchase_amount
FROM campaigns c
JOIN sessions s ON s.campaign_id = c.id
JOIN events e ON e.session_id = s.id
WHERE e.event_name = 'purchase'
GROUP BY c.channel
ORDER BY purchase_amount DESC;`,
    },
    {
      title: '페이지뷰 경로',
      relatedTables: ['sessions', 'events', 'pages'],
      sql: `SELECT s.id AS session_id, p.path, e.occurred_at
FROM events e
JOIN sessions s ON s.id = e.session_id
JOIN pages p ON p.id = e.page_id
WHERE e.event_name = 'page_view'
ORDER BY s.id, e.occurred_at;`,
    },
  ],
  advanced: [
    {
      title: '일자별 순사용자',
      relatedTables: ['sessions'],
      sql: `SELECT date(started_at) AS visit_date, COUNT(DISTINCT user_id) AS users
FROM sessions
WHERE user_id IS NOT NULL
GROUP BY date(started_at)
ORDER BY visit_date;`,
    },
    {
      title: '캠페인별 전환율',
      relatedTables: ['campaigns', 'sessions', 'events'],
      sql: `SELECT
  c.name,
  COUNT(DISTINCT s.id) AS sessions,
  COUNT(DISTINCT CASE WHEN e.event_name IN ('signup_submit', 'purchase') THEN s.id END) AS converted_sessions,
  ROUND(COUNT(DISTINCT CASE WHEN e.event_name IN ('signup_submit', 'purchase') THEN s.id END) * 100.0 / COUNT(DISTINCT s.id), 1) AS conversion_rate
FROM campaigns c
LEFT JOIN sessions s ON s.campaign_id = c.id
LEFT JOIN events e ON e.session_id = s.id
GROUP BY c.id, c.name
ORDER BY conversion_rate DESC;`,
    },
    {
      title: '세션별 이벤트 순서',
      relatedTables: ['sessions', 'events', 'pages'],
      sql: `SELECT
  e.session_id,
  ROW_NUMBER() OVER (PARTITION BY e.session_id ORDER BY e.occurred_at) AS step_no,
  e.event_name,
  p.path
FROM events e
JOIN pages p ON p.id = e.page_id
ORDER BY e.session_id, step_no;`,
    },
    {
      title: '세션별 첫 페이지',
      relatedTables: ['sessions', 'events', 'pages'],
      sql: `WITH ranked_events AS (
  SELECT e.*, ROW_NUMBER() OVER (PARTITION BY e.session_id ORDER BY e.occurred_at) AS rank_no
  FROM events e
)
SELECT r.session_id, p.path AS first_path, r.occurred_at
FROM ranked_events r
JOIN pages p ON p.id = r.page_id
WHERE r.rank_no = 1
ORDER BY r.session_id;`,
    },
    {
      title: '디바이스별 평균 세션 길이',
      relatedTables: ['devices', 'sessions'],
      sql: `SELECT d.device_type, ROUND(AVG((julianday(s.ended_at) - julianday(s.started_at)) * 24 * 60), 1) AS avg_minutes
FROM sessions s
JOIN devices d ON d.id = s.device_id
WHERE s.ended_at IS NOT NULL
GROUP BY d.device_type
ORDER BY avg_minutes DESC;`,
    },
    {
      title: '회원가입 퍼널 세션',
      relatedTables: ['sessions', 'events'],
      sql: `SELECT
  s.id AS session_id,
  SUM(CASE WHEN e.event_name = 'page_view' THEN 1 ELSE 0 END) AS page_views,
  SUM(CASE WHEN e.event_name = 'signup_submit' THEN 1 ELSE 0 END) AS signup_submits
FROM sessions s
LEFT JOIN events e ON e.session_id = s.id
GROUP BY s.id
HAVING signup_submits > 0
ORDER BY s.id;`,
    },
    {
      title: '캠페인 없는 자연 유입',
      relatedTables: ['sessions', 'events'],
      sql: `SELECT s.id, COUNT(e.id) AS event_count
FROM sessions s
LEFT JOIN events e ON e.session_id = s.id
WHERE s.campaign_id IS NULL
GROUP BY s.id
ORDER BY event_count DESC;`,
    },
    {
      title: '마케팅 동의 사용자 이벤트',
      relatedTables: ['users', 'sessions', 'events'],
      sql: `SELECT u.email, COUNT(e.id) AS event_count
FROM users u
JOIN sessions s ON s.user_id = u.id
JOIN events e ON e.session_id = s.id
WHERE u.marketing_opt_in = 1
GROUP BY u.id, u.email
ORDER BY event_count DESC;`,
    },
    {
      title: '일자별 구매 금액',
      relatedTables: ['events'],
      sql: `SELECT date(occurred_at) AS event_date, SUM(event_value) AS purchase_amount
FROM events
WHERE event_name = 'purchase'
GROUP BY date(occurred_at)
ORDER BY event_date;`,
    },
    {
      title: '분석 종합 리포트',
      relatedTables: ['campaigns', 'sessions', 'events'],
      sql: `SELECT
  COALESCE(c.name, 'organic') AS campaign_name,
  COUNT(DISTINCT s.id) AS session_count,
  COUNT(e.id) AS event_count,
  SUM(CASE WHEN e.event_name = 'purchase' THEN COALESCE(e.event_value, 0) ELSE 0 END) AS purchase_amount
FROM sessions s
LEFT JOIN campaigns c ON c.id = s.campaign_id
LEFT JOIN events e ON e.session_id = s.id
GROUP BY COALESCE(c.name, 'organic')
ORDER BY session_count DESC;`,
    },
  ],
})
