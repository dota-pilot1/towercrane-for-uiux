import { defineExampleSet } from './shared'

export const supportTicketExamples = defineExampleSet('06_support_ticket.sql', {
  beginner: [
    {
      title: '고객 플랜별 수',
      relatedTables: ['customers'],
      sql: `SELECT plan, COUNT(*) AS customer_count
FROM customers
GROUP BY plan
ORDER BY customer_count DESC;`,
    },
    {
      title: '활성 상담원 목록',
      relatedTables: ['agents'],
      sql: `SELECT id, name, team
FROM agents
WHERE is_active = 1
ORDER BY team, name;`,
    },
    {
      title: '티켓 상태별 수',
      relatedTables: ['tickets'],
      sql: `SELECT status, COUNT(*) AS ticket_count
FROM tickets
GROUP BY status
ORDER BY ticket_count DESC;`,
    },
    {
      title: '높은 우선순위 티켓',
      relatedTables: ['tickets'],
      sql: `SELECT id, subject, status, created_at
FROM tickets
WHERE priority = 'HIGH'
ORDER BY created_at;`,
    },
    {
      title: '미해결 티켓',
      relatedTables: ['tickets'],
      sql: `SELECT id, subject, priority, status
FROM tickets
WHERE resolved_at IS NULL
ORDER BY created_at;`,
    },
    {
      title: '메시지 발신자별 수',
      relatedTables: ['ticket_messages'],
      sql: `SELECT sender_type, COUNT(*) AS message_count
FROM ticket_messages
GROUP BY sender_type
ORDER BY message_count DESC;`,
    },
    {
      title: '태그별 티켓 수',
      relatedTables: ['ticket_tags'],
      sql: `SELECT tag, COUNT(*) AS tag_count
FROM ticket_tags
GROUP BY tag
ORDER BY tag_count DESC;`,
    },
    {
      title: '상태 변경 로그',
      relatedTables: ['ticket_status_logs'],
      sql: `SELECT ticket_id, from_status, to_status, changed_at
FROM ticket_status_logs
ORDER BY changed_at;`,
    },
    {
      title: '담당자 없는 티켓',
      relatedTables: ['tickets'],
      sql: `SELECT id, subject, priority, status
FROM tickets
WHERE agent_id IS NULL
ORDER BY created_at;`,
    },
    {
      title: '팀별 상담원 수',
      relatedTables: ['agents'],
      sql: `SELECT team, COUNT(*) AS agent_count
FROM agents
GROUP BY team
ORDER BY agent_count DESC;`,
    },
  ],
  intermediate: [
    {
      title: '티켓과 고객 정보',
      relatedTables: ['tickets', 'customers'],
      sql: `SELECT t.id, c.name AS customer_name, c.plan, t.subject, t.status
FROM tickets t
JOIN customers c ON c.id = t.customer_id
ORDER BY t.created_at;`,
    },
    {
      title: '티켓과 상담원',
      relatedTables: ['tickets', 'agents'],
      sql: `SELECT t.id, t.subject, a.name AS agent_name, a.team
FROM tickets t
LEFT JOIN agents a ON a.id = t.agent_id
ORDER BY t.id;`,
    },
    {
      title: '상담원별 담당 티켓 수',
      relatedTables: ['agents', 'tickets'],
      sql: `SELECT a.name, COUNT(t.id) AS assigned_count
FROM agents a
LEFT JOIN tickets t ON t.agent_id = a.id
GROUP BY a.id, a.name
ORDER BY assigned_count DESC;`,
    },
    {
      title: '고객별 티켓 수',
      relatedTables: ['customers', 'tickets'],
      sql: `SELECT c.name, COUNT(t.id) AS ticket_count
FROM customers c
LEFT JOIN tickets t ON t.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY ticket_count DESC;`,
    },
    {
      title: '티켓별 메시지 수',
      relatedTables: ['tickets', 'ticket_messages'],
      sql: `SELECT t.subject, COUNT(m.id) AS message_count
FROM tickets t
LEFT JOIN ticket_messages m ON m.ticket_id = t.id
GROUP BY t.id, t.subject
ORDER BY message_count DESC;`,
    },
    {
      title: '티켓별 태그 목록',
      relatedTables: ['tickets', 'ticket_tags'],
      sql: `SELECT t.subject, GROUP_CONCAT(tt.tag, ', ') AS tags
FROM tickets t
LEFT JOIN ticket_tags tt ON tt.ticket_id = t.id
GROUP BY t.id, t.subject
ORDER BY t.id;`,
    },
    {
      title: '최근 상태 변경 시각',
      relatedTables: ['tickets', 'ticket_status_logs'],
      sql: `SELECT t.id, t.subject, MAX(l.changed_at) AS last_changed_at
FROM tickets t
JOIN ticket_status_logs l ON l.ticket_id = t.id
GROUP BY t.id, t.subject
ORDER BY last_changed_at DESC;`,
    },
    {
      title: 'TECH팀 담당 티켓',
      relatedTables: ['agents', 'tickets'],
      sql: `SELECT a.name, t.subject, t.priority, t.status
FROM tickets t
JOIN agents a ON a.id = t.agent_id
WHERE a.team = 'TECH'
ORDER BY t.created_at;`,
    },
    {
      title: '플랜별 미해결 티켓',
      relatedTables: ['customers', 'tickets'],
      sql: `SELECT c.plan, COUNT(t.id) AS open_ticket_count
FROM customers c
JOIN tickets t ON t.customer_id = c.id
WHERE t.resolved_at IS NULL
GROUP BY c.plan
ORDER BY open_ticket_count DESC;`,
    },
    {
      title: '티켓 메시지 상세',
      relatedTables: ['tickets', 'ticket_messages'],
      sql: `SELECT t.subject, m.sender_type, m.body, m.created_at
FROM ticket_messages m
JOIN tickets t ON t.id = m.ticket_id
ORDER BY m.created_at;`,
    },
  ],
  advanced: [
    {
      title: '티켓 해결 시간 계산',
      relatedTables: ['tickets', 'customers'],
      sql: `SELECT
  t.id,
  c.name AS customer_name,
  t.subject,
  ROUND((julianday(t.resolved_at) - julianday(t.created_at)) * 24, 2) AS resolution_hours
FROM tickets t
JOIN customers c ON c.id = t.customer_id
WHERE t.resolved_at IS NOT NULL
ORDER BY resolution_hours DESC;`,
    },
    {
      title: '상담원별 해결 티켓 수',
      relatedTables: ['agents', 'tickets'],
      sql: `SELECT a.name, COUNT(t.id) AS resolved_count
FROM agents a
LEFT JOIN tickets t ON t.agent_id = a.id AND t.status = 'RESOLVED'
GROUP BY a.id, a.name
ORDER BY resolved_count DESC;`,
    },
    {
      title: '고객 플랜별 평균 메시지 수',
      relatedTables: ['customers', 'tickets', 'ticket_messages'],
      sql: `WITH ticket_message_counts AS (
  SELECT t.id, c.plan, COUNT(m.id) AS message_count
  FROM tickets t
  JOIN customers c ON c.id = t.customer_id
  LEFT JOIN ticket_messages m ON m.ticket_id = t.id
  GROUP BY t.id, c.plan
)
SELECT plan, ROUND(AVG(message_count), 2) AS avg_messages
FROM ticket_message_counts
GROUP BY plan
ORDER BY avg_messages DESC;`,
    },
    {
      title: '상태 변경 없는 열린 티켓',
      relatedTables: ['tickets', 'ticket_status_logs'],
      sql: `SELECT t.id, t.subject, t.status
FROM tickets t
LEFT JOIN ticket_status_logs l ON l.ticket_id = t.id
WHERE l.id IS NULL
  AND t.status = 'OPEN'
ORDER BY t.id;`,
    },
    {
      title: '태그별 미해결 티켓',
      relatedTables: ['tickets', 'ticket_tags'],
      sql: `SELECT tt.tag, COUNT(t.id) AS open_count
FROM ticket_tags tt
JOIN tickets t ON t.id = tt.ticket_id
WHERE t.resolved_at IS NULL
GROUP BY tt.tag
ORDER BY open_count DESC;`,
    },
    {
      title: '티켓 상태 전환 요약',
      relatedTables: ['ticket_status_logs'],
      sql: `SELECT
  COALESCE(from_status, 'START') AS from_status,
  to_status,
  COUNT(*) AS transition_count
FROM ticket_status_logs
GROUP BY COALESCE(from_status, 'START'), to_status
ORDER BY transition_count DESC;`,
    },
    {
      title: '우선순위별 평균 해결 시간',
      relatedTables: ['tickets'],
      sql: `SELECT
  priority,
  ROUND(AVG((julianday(resolved_at) - julianday(created_at)) * 24), 2) AS avg_resolution_hours
FROM tickets
WHERE resolved_at IS NOT NULL
GROUP BY priority
ORDER BY avg_resolution_hours DESC;`,
    },
    {
      title: '상담원 업무 큐 리포트',
      relatedTables: ['agents', 'tickets'],
      sql: `SELECT
  a.name,
  COUNT(t.id) AS assigned_count,
  SUM(CASE WHEN t.resolved_at IS NULL THEN 1 ELSE 0 END) AS open_count,
  SUM(CASE WHEN t.status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved_count
FROM agents a
LEFT JOIN tickets t ON t.agent_id = a.id
GROUP BY a.id, a.name
ORDER BY open_count DESC;`,
    },
    {
      title: '최신 메시지 발신자',
      relatedTables: ['tickets', 'ticket_messages'],
      sql: `WITH ranked_messages AS (
  SELECT
    m.*,
    ROW_NUMBER() OVER (PARTITION BY m.ticket_id ORDER BY m.created_at DESC) AS rank_no
  FROM ticket_messages m
)
SELECT t.subject, r.sender_type, r.body, r.created_at
FROM ranked_messages r
JOIN tickets t ON t.id = r.ticket_id
WHERE r.rank_no = 1
ORDER BY r.created_at DESC;`,
    },
    {
      title: '고객지원 종합 현황',
      relatedTables: ['customers', 'tickets', 'ticket_messages', 'ticket_tags'],
      sql: `SELECT
  c.name AS customer_name,
  COUNT(DISTINCT t.id) AS ticket_count,
  COUNT(DISTINCT m.id) AS message_count,
  COUNT(DISTINCT tt.id) AS tag_count
FROM customers c
LEFT JOIN tickets t ON t.customer_id = c.id
LEFT JOIN ticket_messages m ON m.ticket_id = t.id
LEFT JOIN ticket_tags tt ON tt.ticket_id = t.id
GROUP BY c.id, c.name
ORDER BY ticket_count DESC;`,
    },
  ],
})
