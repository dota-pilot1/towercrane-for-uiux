import { defineExampleSet } from './shared'

export const reservationScheduleExamples = defineExampleSet('05_reservation_schedule.sql', {
  beginner: [
    {
      title: '활성 리소스 목록',
      relatedTables: ['resources'],
      sql: `SELECT id, name, resource_type, capacity
FROM resources
WHERE is_active = 1
ORDER BY resource_type, name;`,
    },
    {
      title: '예약 상태별 건수',
      relatedTables: ['reservations'],
      sql: `SELECT status, COUNT(*) AS reservation_count
FROM reservations
GROUP BY status
ORDER BY reservation_count DESC;`,
    },
    {
      title: '가격 높은 예약 항목',
      relatedTables: ['reservation_items'],
      sql: `SELECT reservation_id, resource_id, price
FROM reservation_items
ORDER BY price DESC;`,
    },
    {
      title: '차단 기간 목록',
      relatedTables: ['blackout_periods'],
      sql: `SELECT resource_id, reason, starts_at, ends_at
FROM blackout_periods
ORDER BY starts_at;`,
    },
    {
      title: '점검 필요 리소스',
      relatedTables: ['resource_maintenance'],
      sql: `SELECT resource_id, manager_name, status
FROM resource_maintenance
WHERE status != 'OK'
ORDER BY checked_at;`,
    },
    {
      title: '리소스 유형별 수',
      relatedTables: ['resources'],
      sql: `SELECT resource_type, COUNT(*) AS resource_count
FROM resources
GROUP BY resource_type
ORDER BY resource_count DESC;`,
    },
    {
      title: '고객 메모 있는 목록',
      relatedTables: ['customers'],
      sql: `SELECT name, phone, memo
FROM customers
WHERE memo IS NOT NULL
ORDER BY name;`,
    },
    {
      title: '확정 예약만 보기',
      relatedTables: ['reservations'],
      sql: `SELECT id, customer_id, requested_at
FROM reservations
WHERE status = 'CONFIRMED'
ORDER BY requested_at;`,
    },
    {
      title: '예약 항목 시간순',
      relatedTables: ['reservation_items'],
      sql: `SELECT reservation_id, resource_id, starts_at, ends_at
FROM reservation_items
ORDER BY starts_at;`,
    },
    {
      title: '리소스별 예약 항목 수',
      relatedTables: ['reservation_items'],
      sql: `SELECT resource_id, COUNT(*) AS booking_count
FROM reservation_items
GROUP BY resource_id
ORDER BY booking_count DESC;`,
    },
  ],
  intermediate: [
    {
      title: '예약과 고객명',
      relatedTables: ['reservations', 'customers'],
      sql: `SELECT r.id, c.name AS customer_name, r.status, r.requested_at
FROM reservations r
JOIN customers c ON c.id = r.customer_id
ORDER BY r.requested_at;`,
    },
    {
      title: '예약 항목과 리소스명',
      relatedTables: ['reservation_items', 'resources'],
      sql: `SELECT ri.reservation_id, res.name AS resource_name, ri.starts_at, ri.ends_at, ri.price
FROM reservation_items ri
JOIN resources res ON res.id = ri.resource_id
ORDER BY ri.starts_at;`,
    },
    {
      title: '리소스별 예약 매출',
      relatedTables: ['resources', 'reservation_items'],
      sql: `SELECT res.name, SUM(ri.price) AS total_price
FROM resources res
LEFT JOIN reservation_items ri ON ri.resource_id = res.id
GROUP BY res.id, res.name
ORDER BY total_price DESC;`,
    },
    {
      title: '예약별 총 금액',
      relatedTables: ['reservations', 'reservation_items'],
      sql: `SELECT r.id, r.status, SUM(ri.price) AS reservation_total
FROM reservations r
JOIN reservation_items ri ON ri.reservation_id = r.id
GROUP BY r.id, r.status
ORDER BY reservation_total DESC;`,
    },
    {
      title: '고객별 예약 수',
      relatedTables: ['customers', 'reservations'],
      sql: `SELECT c.name, COUNT(r.id) AS reservation_count
FROM customers c
LEFT JOIN reservations r ON r.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY reservation_count DESC;`,
    },
    {
      title: '차단 리소스명 확인',
      relatedTables: ['blackout_periods', 'resources'],
      sql: `SELECT res.name, b.reason, b.starts_at, b.ends_at
FROM blackout_periods b
JOIN resources res ON res.id = b.resource_id
ORDER BY b.starts_at;`,
    },
    {
      title: '점검 상태와 리소스',
      relatedTables: ['resource_maintenance', 'resources'],
      sql: `SELECT res.name, m.manager_name, m.checked_at, m.status
FROM resource_maintenance m
JOIN resources res ON res.id = m.resource_id
ORDER BY m.checked_at;`,
    },
    {
      title: 'CONFIRMED 예약 리소스',
      relatedTables: ['reservations', 'reservation_items', 'resources'],
      sql: `SELECT r.id AS reservation_id, res.name AS resource_name, ri.starts_at
FROM reservations r
JOIN reservation_items ri ON ri.reservation_id = r.id
JOIN resources res ON res.id = ri.resource_id
WHERE r.status = 'CONFIRMED'
ORDER BY ri.starts_at;`,
    },
    {
      title: '활성 리소스별 예약 여부',
      relatedTables: ['resources', 'reservation_items'],
      sql: `SELECT res.name, COUNT(ri.id) AS booking_count
FROM resources res
LEFT JOIN reservation_items ri ON ri.resource_id = res.id
WHERE res.is_active = 1
GROUP BY res.id, res.name
ORDER BY booking_count DESC;`,
    },
    {
      title: '시간 겹치는 차단 기간',
      relatedTables: ['resources', 'blackout_periods'],
      sql: `SELECT res.name, b.reason, b.starts_at, b.ends_at
FROM blackout_periods b
JOIN resources res ON res.id = b.resource_id
WHERE b.starts_at <= '2026-05-12 15:00'
  AND b.ends_at >= '2026-05-12 13:00'
ORDER BY b.starts_at;`,
    },
  ],
  advanced: [
    {
      title: '예약 항목과 차단 기간 충돌',
      relatedTables: ['reservation_items', 'blackout_periods', 'resources'],
      sql: `SELECT
  ri.reservation_id,
  res.name AS resource_name,
  ri.starts_at AS reservation_start,
  ri.ends_at AS reservation_end,
  b.reason
FROM reservation_items ri
JOIN resources res ON res.id = ri.resource_id
JOIN blackout_periods b ON b.resource_id = ri.resource_id
WHERE ri.starts_at < b.ends_at
  AND ri.ends_at > b.starts_at
ORDER BY ri.reservation_id;`,
    },
    {
      title: '리소스별 가동 금액 순위',
      relatedTables: ['resources', 'reservation_items'],
      sql: `SELECT
  res.name,
  COALESCE(SUM(ri.price), 0) AS total_price,
  RANK() OVER (ORDER BY COALESCE(SUM(ri.price), 0) DESC) AS revenue_rank
FROM resources res
LEFT JOIN reservation_items ri ON ri.resource_id = res.id
GROUP BY res.id, res.name
ORDER BY revenue_rank;`,
    },
    {
      title: '예약별 사용 시간',
      relatedTables: ['reservations', 'reservation_items'],
      sql: `SELECT
  r.id AS reservation_id,
  SUM((julianday(ri.ends_at) - julianday(ri.starts_at)) * 24) AS reserved_hours
FROM reservations r
JOIN reservation_items ri ON ri.reservation_id = r.id
GROUP BY r.id
ORDER BY reserved_hours DESC;`,
    },
    {
      title: '미점검 활성 리소스',
      relatedTables: ['resources', 'resource_maintenance'],
      sql: `SELECT res.id, res.name
FROM resources res
LEFT JOIN resource_maintenance m ON m.resource_id = res.id
WHERE res.is_active = 1
  AND m.id IS NULL
ORDER BY res.id;`,
    },
    {
      title: '점검 필요 리소스 예약 영향',
      relatedTables: ['resources', 'resource_maintenance', 'reservation_items'],
      sql: `SELECT res.name, m.status, COUNT(ri.id) AS affected_booking_count
FROM resource_maintenance m
JOIN resources res ON res.id = m.resource_id
LEFT JOIN reservation_items ri ON ri.resource_id = res.id
WHERE m.status != 'OK'
GROUP BY res.id, res.name, m.status;`,
    },
    {
      title: '예약 상태별 매출',
      relatedTables: ['reservations', 'reservation_items'],
      sql: `SELECT r.status, SUM(ri.price) AS total_price
FROM reservations r
JOIN reservation_items ri ON ri.reservation_id = r.id
GROUP BY r.status
ORDER BY total_price DESC;`,
    },
    {
      title: '리소스 유형별 평균 예약가',
      relatedTables: ['resources', 'reservation_items'],
      sql: `SELECT res.resource_type, ROUND(AVG(ri.price), 0) AS avg_price
FROM resources res
JOIN reservation_items ri ON ri.resource_id = res.id
GROUP BY res.resource_type
ORDER BY avg_price DESC;`,
    },
    {
      title: '예약 없는 활성 리소스',
      relatedTables: ['resources', 'reservation_items'],
      sql: `SELECT res.id, res.name
FROM resources res
LEFT JOIN reservation_items ri ON ri.resource_id = res.id
WHERE res.is_active = 1
GROUP BY res.id, res.name
HAVING COUNT(ri.id) = 0;`,
    },
    {
      title: '고객별 확정 예약 금액',
      relatedTables: ['customers', 'reservations', 'reservation_items'],
      sql: `SELECT c.name, SUM(ri.price) AS confirmed_price
FROM customers c
JOIN reservations r ON r.customer_id = c.id
JOIN reservation_items ri ON ri.reservation_id = r.id
WHERE r.status = 'CONFIRMED'
GROUP BY c.id, c.name
ORDER BY confirmed_price DESC;`,
    },
    {
      title: '리소스 운영 상태 종합',
      relatedTables: ['resources', 'reservation_items', 'blackout_periods', 'resource_maintenance'],
      sql: `SELECT
  res.name,
  COUNT(DISTINCT ri.id) AS booking_count,
  COUNT(DISTINCT b.id) AS blackout_count,
  MAX(m.status) AS latest_maintenance_status
FROM resources res
LEFT JOIN reservation_items ri ON ri.resource_id = res.id
LEFT JOIN blackout_periods b ON b.resource_id = res.id
LEFT JOIN resource_maintenance m ON m.resource_id = res.id
GROUP BY res.id, res.name
ORDER BY booking_count DESC;`,
    },
  ],
})
