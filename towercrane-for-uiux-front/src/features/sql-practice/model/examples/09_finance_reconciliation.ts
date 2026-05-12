import { defineExampleSet } from './shared'

export const financeReconciliationExamples = defineExampleSet('09_finance_reconciliation.sql', {
  beginner: [
    {
      title: '가맹점 수수료율 목록',
      relatedTables: ['merchants'],
      sql: `SELECT id, name, fee_rate, settlement_day
FROM merchants
ORDER BY fee_rate DESC;`,
    },
    {
      title: '주문 금액 큰 순서',
      relatedTables: ['orders'],
      sql: `SELECT order_no, merchant_id, order_amount, ordered_at
FROM orders
ORDER BY order_amount DESC;`,
    },
    {
      title: '결제 수단별 금액',
      relatedTables: ['payments'],
      sql: `SELECT method, SUM(amount) AS payment_amount
FROM payments
GROUP BY method
ORDER BY payment_amount DESC;`,
    },
    {
      title: '결제 상태별 수',
      relatedTables: ['payments'],
      sql: `SELECT status, COUNT(*) AS payment_count
FROM payments
GROUP BY status
ORDER BY payment_count DESC;`,
    },
    {
      title: '환불 사유별 금액',
      relatedTables: ['refunds'],
      sql: `SELECT reason, SUM(amount) AS refund_amount
FROM refunds
GROUP BY reason
ORDER BY refund_amount DESC;`,
    },
    {
      title: '정산 차액 보기',
      relatedTables: ['settlements'],
      sql: `SELECT merchant_id, settlement_month, expected_amount, settled_amount,
  expected_amount - settled_amount AS diff
FROM settlements
ORDER BY ABS(expected_amount - settled_amount) DESC;`,
    },
    {
      title: '수수료 유형별 금액',
      relatedTables: ['fees'],
      sql: `SELECT fee_type, SUM(amount) AS fee_amount
FROM fees
GROUP BY fee_type
ORDER BY fee_amount DESC;`,
    },
    {
      title: '열린 미수금',
      relatedTables: ['receivables'],
      sql: `SELECT merchant_id, order_id, amount, due_date
FROM receivables
WHERE status = 'OPEN'
ORDER BY due_date;`,
    },
    {
      title: '월별 정산 건수',
      relatedTables: ['settlements'],
      sql: `SELECT settlement_month, COUNT(*) AS settlement_count
FROM settlements
GROUP BY settlement_month
ORDER BY settlement_month;`,
    },
    {
      title: '승인 결제 목록',
      relatedTables: ['payments'],
      sql: `SELECT order_id, amount, method, approved_at
FROM payments
WHERE status = 'APPROVED'
ORDER BY approved_at;`,
    },
  ],
  intermediate: [
    {
      title: '가맹점별 승인 결제액',
      relatedTables: ['merchants', 'orders', 'payments'],
      sql: `SELECT m.name, SUM(p.amount) AS paid_amount
FROM merchants m
JOIN orders o ON o.merchant_id = m.id
JOIN payments p ON p.order_id = o.id
WHERE p.status = 'APPROVED'
GROUP BY m.id, m.name
ORDER BY paid_amount DESC;`,
    },
    {
      title: '주문별 환불 합계',
      relatedTables: ['orders', 'refunds'],
      sql: `SELECT o.order_no, COALESCE(SUM(r.amount), 0) AS refund_total
FROM orders o
LEFT JOIN refunds r ON r.order_id = o.id
GROUP BY o.id, o.order_no
ORDER BY refund_total DESC;`,
    },
    {
      title: '결제별 수수료',
      relatedTables: ['payments', 'fees'],
      sql: `SELECT p.id AS payment_id, p.amount, COALESCE(SUM(f.amount), 0) AS fee_amount
FROM payments p
LEFT JOIN fees f ON f.payment_id = p.id
GROUP BY p.id, p.amount
ORDER BY fee_amount DESC;`,
    },
    {
      title: '가맹점별 미수금',
      relatedTables: ['merchants', 'receivables'],
      sql: `SELECT m.name, SUM(r.amount) AS open_receivable
FROM merchants m
JOIN receivables r ON r.merchant_id = m.id
WHERE r.status = 'OPEN'
GROUP BY m.id, m.name
ORDER BY open_receivable DESC;`,
    },
    {
      title: '정산과 가맹점명',
      relatedTables: ['merchants', 'settlements'],
      sql: `SELECT m.name, s.settlement_month, s.expected_amount, s.settled_amount
FROM settlements s
JOIN merchants m ON m.id = s.merchant_id
ORDER BY s.settlement_month, m.name;`,
    },
    {
      title: '주문과 결제 비교',
      relatedTables: ['orders', 'payments'],
      sql: `SELECT o.order_no, o.order_amount, p.amount AS payment_amount, p.status
FROM orders o
JOIN payments p ON p.order_id = o.id
ORDER BY o.id;`,
    },
    {
      title: '가맹점별 환불 금액',
      relatedTables: ['merchants', 'orders', 'refunds'],
      sql: `SELECT m.name, COALESCE(SUM(r.amount), 0) AS refund_amount
FROM merchants m
LEFT JOIN orders o ON o.merchant_id = m.id
LEFT JOIN refunds r ON r.order_id = o.id
GROUP BY m.id, m.name
ORDER BY refund_amount DESC;`,
    },
    {
      title: '정산 차액 있는 가맹점',
      relatedTables: ['merchants', 'settlements'],
      sql: `SELECT m.name, s.expected_amount, s.settled_amount,
  s.expected_amount - s.settled_amount AS diff
FROM settlements s
JOIN merchants m ON m.id = s.merchant_id
WHERE s.expected_amount != s.settled_amount
ORDER BY ABS(diff) DESC;`,
    },
    {
      title: '주문별 순매출',
      relatedTables: ['orders', 'refunds'],
      sql: `SELECT o.order_no, o.order_amount, COALESCE(SUM(r.amount), 0) AS refund_amount,
  o.order_amount - COALESCE(SUM(r.amount), 0) AS net_amount
FROM orders o
LEFT JOIN refunds r ON r.order_id = o.id
GROUP BY o.id, o.order_no, o.order_amount
ORDER BY net_amount DESC;`,
    },
    {
      title: '가맹점별 주문 수와 금액',
      relatedTables: ['merchants', 'orders'],
      sql: `SELECT m.name, COUNT(o.id) AS order_count, SUM(o.order_amount) AS order_amount
FROM merchants m
JOIN orders o ON o.merchant_id = m.id
GROUP BY m.id, m.name
ORDER BY order_amount DESC;`,
    },
  ],
  advanced: [
    {
      title: '예상 정산액 재계산',
      relatedTables: ['merchants', 'orders', 'payments', 'refunds'],
      sql: `WITH paid AS (
  SELECT o.merchant_id, SUM(p.amount) AS paid_amount
  FROM orders o
  JOIN payments p ON p.order_id = o.id
  WHERE p.status = 'APPROVED'
  GROUP BY o.merchant_id
),
refunded AS (
  SELECT o.merchant_id, SUM(r.amount) AS refund_amount
  FROM orders o
  JOIN refunds r ON r.order_id = o.id
  GROUP BY o.merchant_id
)
SELECT
  m.name,
  paid.paid_amount,
  COALESCE(refunded.refund_amount, 0) AS refund_amount,
  ROUND((paid.paid_amount - COALESCE(refunded.refund_amount, 0)) * (1 - m.fee_rate), 0) AS calculated_settlement
FROM merchants m
JOIN paid ON paid.merchant_id = m.id
LEFT JOIN refunded ON refunded.merchant_id = m.id
ORDER BY calculated_settlement DESC;`,
    },
    {
      title: '정산 불일치 검증',
      relatedTables: ['merchants', 'settlements'],
      sql: `SELECT
  m.name,
  s.expected_amount,
  s.settled_amount,
  s.expected_amount - s.settled_amount AS diff
FROM settlements s
JOIN merchants m ON m.id = s.merchant_id
WHERE s.expected_amount != s.settled_amount
ORDER BY ABS(diff) DESC;`,
    },
    {
      title: '수수료율과 실제 수수료 비교',
      relatedTables: ['merchants', 'orders', 'payments', 'fees'],
      sql: `SELECT
  m.name,
  p.id AS payment_id,
  p.amount,
  ROUND(p.amount * m.fee_rate, 0) AS expected_fee,
  SUM(f.amount) AS actual_fee
FROM payments p
JOIN orders o ON o.id = p.order_id
JOIN merchants m ON m.id = o.merchant_id
LEFT JOIN fees f ON f.payment_id = p.id
GROUP BY m.name, p.id, p.amount, m.fee_rate
ORDER BY p.id;`,
    },
    {
      title: '가맹점별 순매출 순위',
      relatedTables: ['merchants', 'orders', 'refunds'],
      sql: `SELECT
  m.name,
  SUM(o.order_amount) - COALESCE(SUM(r.amount), 0) AS net_sales,
  RANK() OVER (ORDER BY SUM(o.order_amount) - COALESCE(SUM(r.amount), 0) DESC) AS sales_rank
FROM merchants m
JOIN orders o ON o.merchant_id = m.id
LEFT JOIN refunds r ON r.order_id = o.id
GROUP BY m.id, m.name
ORDER BY sales_rank;`,
    },
    {
      title: '미수금과 정산 차액 연결',
      relatedTables: ['merchants', 'settlements', 'receivables'],
      sql: `SELECT
  m.name,
  s.expected_amount - s.settled_amount AS settlement_diff,
  COALESCE(SUM(r.amount), 0) AS open_receivable
FROM merchants m
JOIN settlements s ON s.merchant_id = m.id
LEFT JOIN receivables r ON r.merchant_id = m.id AND r.status = 'OPEN'
GROUP BY m.id, m.name, s.expected_amount, s.settled_amount
ORDER BY open_receivable DESC;`,
    },
    {
      title: '환불 후 결제 잔액',
      relatedTables: ['payments', 'refunds', 'orders'],
      sql: `SELECT
  o.order_no,
  p.amount AS payment_amount,
  COALESCE(SUM(r.amount), 0) AS refund_amount,
  p.amount - COALESCE(SUM(r.amount), 0) AS remaining_amount
FROM payments p
JOIN orders o ON o.id = p.order_id
LEFT JOIN refunds r ON r.payment_id = p.id
GROUP BY o.order_no, p.id, p.amount
ORDER BY remaining_amount DESC;`,
    },
    {
      title: '월 정산 지급률',
      relatedTables: ['settlements', 'merchants'],
      sql: `SELECT
  m.name,
  s.settlement_month,
  ROUND(s.settled_amount * 100.0 / s.expected_amount, 1) AS payout_rate
FROM settlements s
JOIN merchants m ON m.id = s.merchant_id
ORDER BY payout_rate ASC;`,
    },
    {
      title: '주문 정산 종합표',
      relatedTables: ['orders', 'payments', 'refunds', 'fees', 'merchants'],
      sql: `SELECT
  m.name,
  o.order_no,
  o.order_amount,
  p.amount AS paid_amount,
  COALESCE(SUM(DISTINCT r.amount), 0) AS refund_amount,
  COALESCE(SUM(DISTINCT f.amount), 0) AS fee_amount
FROM orders o
JOIN merchants m ON m.id = o.merchant_id
JOIN payments p ON p.order_id = o.id
LEFT JOIN refunds r ON r.order_id = o.id
LEFT JOIN fees f ON f.payment_id = p.id
GROUP BY m.name, o.order_no, o.order_amount, p.amount
ORDER BY o.order_no;`,
    },
    {
      title: '가맹점별 미수금 비중',
      relatedTables: ['merchants', 'receivables', 'settlements'],
      sql: `SELECT
  m.name,
  COALESCE(SUM(r.amount), 0) AS open_receivable,
  MAX(s.expected_amount) AS expected_amount,
  ROUND(COALESCE(SUM(r.amount), 0) * 100.0 / MAX(s.expected_amount), 2) AS receivable_rate
FROM merchants m
LEFT JOIN receivables r ON r.merchant_id = m.id AND r.status = 'OPEN'
LEFT JOIN settlements s ON s.merchant_id = m.id
GROUP BY m.id, m.name
ORDER BY receivable_rate DESC;`,
    },
    {
      title: '정산 완료 지연 일수',
      relatedTables: ['merchants', 'settlements'],
      sql: `SELECT
  m.name,
  s.settlement_month,
  s.settled_at,
  julianday(s.settled_at) - julianday(s.settlement_month || '-' || printf('%02d', m.settlement_day)) AS delay_days
FROM settlements s
JOIN merchants m ON m.id = s.merchant_id
WHERE s.settled_at IS NOT NULL
ORDER BY delay_days DESC;`,
    },
  ],
})
