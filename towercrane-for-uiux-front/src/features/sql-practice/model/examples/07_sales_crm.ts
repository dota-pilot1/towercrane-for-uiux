import { defineExampleSet } from './shared'

export const salesCrmExamples = defineExampleSet('07_sales_crm.sql', {
  beginner: [
    {
      title: '거래처 지역별 수',
      relatedTables: ['accounts'],
      sql: `SELECT region, COUNT(*) AS account_count
FROM accounts
GROUP BY region
ORDER BY account_count DESC;`,
    },
    {
      title: '거래처 산업별 수',
      relatedTables: ['accounts'],
      sql: `SELECT industry, COUNT(*) AS account_count
FROM accounts
GROUP BY industry
ORDER BY account_count DESC;`,
    },
    {
      title: '영업 담당자 목록',
      relatedTables: ['sales_reps'],
      sql: `SELECT id, name, team
FROM sales_reps
ORDER BY team, name;`,
    },
    {
      title: '리드 상태별 수',
      relatedTables: ['leads'],
      sql: `SELECT status, COUNT(*) AS lead_count
FROM leads
GROUP BY status
ORDER BY lead_count DESC;`,
    },
    {
      title: '리드 소스별 수',
      relatedTables: ['leads'],
      sql: `SELECT source, COUNT(*) AS lead_count
FROM leads
GROUP BY source
ORDER BY lead_count DESC;`,
    },
    {
      title: '영업기회 단계별 파이프라인',
      relatedTables: ['opportunities'],
      sql: `SELECT stage, COUNT(*) AS opportunity_count, SUM(expected_amount) AS pipeline
FROM opportunities
GROUP BY stage
ORDER BY pipeline DESC;`,
    },
    {
      title: '예상 금액 큰 영업기회',
      relatedTables: ['opportunities'],
      sql: `SELECT name, stage, expected_amount
FROM opportunities
ORDER BY expected_amount DESC;`,
    },
    {
      title: '활동 유형별 수',
      relatedTables: ['activities'],
      sql: `SELECT activity_type, COUNT(*) AS activity_count
FROM activities
GROUP BY activity_type
ORDER BY activity_count DESC;`,
    },
    {
      title: '계약 금액 큰 순서',
      relatedTables: ['contracts'],
      sql: `SELECT account_id, contract_amount, signed_at, status
FROM contracts
ORDER BY contract_amount DESC;`,
    },
    {
      title: '월별 신규 리드',
      relatedTables: ['leads'],
      sql: `SELECT substr(created_at, 1, 7) AS lead_month, COUNT(*) AS lead_count
FROM leads
GROUP BY substr(created_at, 1, 7)
ORDER BY lead_month;`,
    },
  ],
  intermediate: [
    {
      title: '거래처와 담당자',
      relatedTables: ['accounts', 'contacts'],
      sql: `SELECT a.name AS account_name, c.name AS contact_name, c.title, c.email
FROM contacts c
JOIN accounts a ON a.id = c.account_id
ORDER BY a.name;`,
    },
    {
      title: '리드와 영업 담당자',
      relatedTables: ['leads', 'sales_reps', 'accounts'],
      sql: `SELECT a.name AS account_name, r.name AS rep_name, l.source, l.status
FROM leads l
JOIN accounts a ON a.id = l.account_id
JOIN sales_reps r ON r.id = l.sales_rep_id
ORDER BY l.created_at;`,
    },
    {
      title: '담당자별 리드 수',
      relatedTables: ['sales_reps', 'leads'],
      sql: `SELECT r.name, COUNT(l.id) AS lead_count
FROM sales_reps r
LEFT JOIN leads l ON l.sales_rep_id = r.id
GROUP BY r.id, r.name
ORDER BY lead_count DESC;`,
    },
    {
      title: '담당자별 영업기회 수',
      relatedTables: ['sales_reps', 'opportunities'],
      sql: `SELECT r.name, COUNT(o.id) AS opportunity_count
FROM sales_reps r
LEFT JOIN opportunities o ON o.sales_rep_id = r.id
GROUP BY r.id, r.name
ORDER BY opportunity_count DESC;`,
    },
    {
      title: '거래처별 파이프라인',
      relatedTables: ['accounts', 'opportunities'],
      sql: `SELECT a.name, SUM(o.expected_amount) AS pipeline
FROM accounts a
JOIN opportunities o ON o.account_id = a.id
GROUP BY a.id, a.name
ORDER BY pipeline DESC;`,
    },
    {
      title: '영업기회별 활동 수',
      relatedTables: ['opportunities', 'activities'],
      sql: `SELECT o.name, COUNT(a.id) AS activity_count
FROM opportunities o
LEFT JOIN activities a ON a.opportunity_id = o.id
GROUP BY o.id, o.name
ORDER BY activity_count DESC;`,
    },
    {
      title: '계약된 거래처',
      relatedTables: ['contracts', 'accounts'],
      sql: `SELECT a.name, c.contract_amount, c.signed_at, c.status
FROM contracts c
JOIN accounts a ON a.id = c.account_id
ORDER BY c.contract_amount DESC;`,
    },
    {
      title: '팀별 예상 매출',
      relatedTables: ['sales_reps', 'opportunities'],
      sql: `SELECT r.team, SUM(o.expected_amount) AS pipeline
FROM sales_reps r
JOIN opportunities o ON o.sales_rep_id = r.id
GROUP BY r.team
ORDER BY pipeline DESC;`,
    },
    {
      title: 'WON 영업기회와 계약',
      relatedTables: ['opportunities', 'contracts'],
      sql: `SELECT o.name, o.expected_amount, c.contract_amount, c.signed_at
FROM opportunities o
LEFT JOIN contracts c ON c.opportunity_id = o.id
WHERE o.stage = 'WON'
ORDER BY c.signed_at;`,
    },
    {
      title: '활동 담당자와 영업기회',
      relatedTables: ['activities', 'opportunities', 'sales_reps'],
      sql: `SELECT r.name AS rep_name, o.name AS opportunity_name, a.activity_type, a.occurred_at
FROM activities a
JOIN opportunities o ON o.id = a.opportunity_id
JOIN sales_reps r ON r.id = a.sales_rep_id
ORDER BY a.occurred_at;`,
    },
  ],
  advanced: [
    {
      title: '리드에서 계약까지 전환',
      relatedTables: ['leads', 'opportunities', 'contracts'],
      sql: `SELECT
  l.status,
  COUNT(DISTINCT l.id) AS lead_count,
  COUNT(DISTINCT o.id) AS opportunity_count,
  COUNT(DISTINCT c.id) AS contract_count
FROM leads l
LEFT JOIN opportunities o ON o.lead_id = l.id
LEFT JOIN contracts c ON c.opportunity_id = o.id
GROUP BY l.status
ORDER BY lead_count DESC;`,
    },
    {
      title: '담당자별 계약 전환율',
      relatedTables: ['sales_reps', 'opportunities', 'contracts'],
      sql: `SELECT
  r.name,
  COUNT(o.id) AS opportunity_count,
  COUNT(c.id) AS contract_count,
  ROUND(COUNT(c.id) * 100.0 / NULLIF(COUNT(o.id), 0), 1) AS contract_rate
FROM sales_reps r
LEFT JOIN opportunities o ON o.sales_rep_id = r.id
LEFT JOIN contracts c ON c.opportunity_id = o.id
GROUP BY r.id, r.name
ORDER BY contract_rate DESC;`,
    },
    {
      title: '단계별 평균 예상 금액',
      relatedTables: ['opportunities'],
      sql: `SELECT stage, ROUND(AVG(expected_amount), 0) AS avg_amount
FROM opportunities
GROUP BY stage
ORDER BY avg_amount DESC;`,
    },
    {
      title: '활동 없는 영업기회',
      relatedTables: ['opportunities', 'activities'],
      sql: `SELECT o.id, o.name, o.stage
FROM opportunities o
LEFT JOIN activities a ON a.opportunity_id = o.id
WHERE a.id IS NULL
ORDER BY o.id;`,
    },
    {
      title: '담당자별 최신 활동',
      relatedTables: ['sales_reps', 'activities'],
      sql: `WITH ranked_activities AS (
  SELECT
    a.*,
    ROW_NUMBER() OVER (PARTITION BY a.sales_rep_id ORDER BY a.occurred_at DESC) AS rank_no
  FROM activities a
)
SELECT r.name, ra.activity_type, ra.occurred_at
FROM ranked_activities ra
JOIN sales_reps r ON r.id = ra.sales_rep_id
WHERE ra.rank_no = 1
ORDER BY ra.occurred_at DESC;`,
    },
    {
      title: '계약 금액과 예상 금액 차이',
      relatedTables: ['opportunities', 'contracts', 'accounts'],
      sql: `SELECT a.name AS account_name, o.name AS opportunity_name, o.expected_amount, c.contract_amount,
  c.contract_amount - o.expected_amount AS diff
FROM contracts c
JOIN opportunities o ON o.id = c.opportunity_id
JOIN accounts a ON a.id = c.account_id
ORDER BY diff DESC;`,
    },
    {
      title: '지역별 계약 현황',
      relatedTables: ['accounts', 'contracts'],
      sql: `SELECT a.region, COUNT(c.id) AS contract_count, COALESCE(SUM(c.contract_amount), 0) AS contract_amount
FROM accounts a
LEFT JOIN contracts c ON c.account_id = a.id
GROUP BY a.region
ORDER BY contract_amount DESC;`,
    },
    {
      title: '리드 생성 후 예상 마감까지 일수',
      relatedTables: ['leads', 'opportunities'],
      sql: `SELECT
  o.name,
  l.created_at,
  o.expected_close_date,
  julianday(o.expected_close_date) - julianday(l.created_at) AS days_to_close
FROM opportunities o
JOIN leads l ON l.id = o.lead_id
ORDER BY days_to_close DESC;`,
    },
    {
      title: '파이프라인 누적 순위',
      relatedTables: ['opportunities'],
      sql: `SELECT
  name,
  stage,
  expected_amount,
  SUM(expected_amount) OVER (ORDER BY expected_amount DESC) AS running_pipeline
FROM opportunities
ORDER BY expected_amount DESC;`,
    },
    {
      title: '거래처 영업 종합 리포트',
      relatedTables: ['accounts', 'contacts', 'leads', 'opportunities', 'contracts'],
      sql: `SELECT
  a.name,
  COUNT(DISTINCT c.id) AS contact_count,
  COUNT(DISTINCT l.id) AS lead_count,
  COUNT(DISTINCT o.id) AS opportunity_count,
  COUNT(DISTINCT ct.id) AS contract_count
FROM accounts a
LEFT JOIN contacts c ON c.account_id = a.id
LEFT JOIN leads l ON l.account_id = a.id
LEFT JOIN opportunities o ON o.account_id = a.id
LEFT JOIN contracts ct ON ct.account_id = a.id
GROUP BY a.id, a.name
ORDER BY opportunity_count DESC;`,
    },
  ],
})
