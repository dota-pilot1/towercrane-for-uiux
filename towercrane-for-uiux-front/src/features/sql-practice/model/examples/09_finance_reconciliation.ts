import { defineExampleSet } from './shared'

export const financeReconciliationExamples = defineExampleSet('09_finance_reconciliation.sql', {
  beginner: [
    {
      title: '가맹점 수수료율 목록',
      description: '가맹점 정보를 한눈에 확인하려고 합니다. 가맹점 아이디(id), 이름(name), 수수료율(fee_rate), 정산일(settlement_day)을 수수료율이 높은 순서로 보여주세요.',
      hint: '단일 테이블 정렬 조회',
      explanation: 'merchants 테이블에서 필요한 컬럼을 SELECT 하고 ORDER BY fee_rate DESC 로 내림차순 정렬합니다. 가장 단순한 조회 패턴입니다.',
      relatedTables: ['merchants'],
      sql: `SELECT id, name, fee_rate, settlement_day
FROM merchants
ORDER BY fee_rate DESC;`,
    },
    {
      title: '주문 금액 큰 순서',
      description: '고액 주문부터 살펴보려고 합니다. 주문번호(order_no), 가맹점 아이디(merchant_id), 주문 금액(order_amount), 주문 일시(ordered_at)를 주문 금액이 큰 순서로 정렬해 주세요.',
      hint: '단일 테이블 정렬',
      explanation: 'orders 테이블에서 필요한 컬럼을 가져와 ORDER BY order_amount DESC 로 정렬합니다. 정렬 기준 컬럼을 명확히 지정하는 것이 핵심입니다.',
      relatedTables: ['orders'],
      sql: `SELECT order_no, merchant_id, order_amount, ordered_at
FROM orders
ORDER BY order_amount DESC;`,
    },
    {
      title: '결제 수단별 금액',
      description: '결제 수단(method)별로 매출 분포를 파악하고 싶습니다. 결제 수단별로 결제 금액(amount) 합계를 구해 합계가 큰 순서로 보여주세요.',
      hint: '단순 그룹 합계',
      explanation: 'GROUP BY method 로 결제 수단별로 묶고 SUM(amount) 로 금액을 합산합니다. 집계 결과를 ORDER BY 로 정렬해 가독성을 높입니다.',
      relatedTables: ['payments'],
      sql: `SELECT method, SUM(amount) AS payment_amount
FROM payments
GROUP BY method
ORDER BY payment_amount DESC;`,
    },
    {
      title: '결제 상태별 수',
      description: '결제 상태(status)별 분포를 확인하려고 합니다. 상태별로 결제 건수를 세어서 건수가 많은 순서로 보여주세요.',
      hint: '그룹 카운트',
      explanation: 'GROUP BY status 로 상태별로 묶은 후 COUNT(*) 로 건수를 셉니다. 결제 상태 분포 점검에 자주 쓰이는 패턴입니다.',
      relatedTables: ['payments'],
      sql: `SELECT status, COUNT(*) AS payment_count
FROM payments
GROUP BY status
ORDER BY payment_count DESC;`,
    },
    {
      title: '환불 사유별 금액',
      description: '환불 사유(reason)별로 손실 규모를 파악하고 싶습니다. 사유별 환불 금액(amount) 합계를 합계가 큰 순서로 보여주세요.',
      hint: '사유별 합계 집계',
      explanation: 'GROUP BY reason 으로 사유별로 묶고 SUM(amount) 로 합산합니다. 집계 후 정렬해 어느 사유의 손실이 가장 큰지 한눈에 봅니다.',
      relatedTables: ['refunds'],
      sql: `SELECT reason, SUM(amount) AS refund_amount
FROM refunds
GROUP BY reason
ORDER BY refund_amount DESC;`,
    },
    {
      title: '정산 차액 보기',
      description: '월별 정산에서 예상액과 실지급액의 차이를 확인하려고 합니다. 가맹점 아이디(merchant_id), 정산월(settlement_month), 예상 금액(expected_amount), 정산 금액(settled_amount)과 그 차이를 차이의 절대값이 큰 순서로 보여주세요.',
      hint: '계산 컬럼 + 절대값 정렬',
      explanation: 'SELECT 절에서 expected_amount - settled_amount 로 차액 컬럼을 만들고 ORDER BY ABS(...) 로 차이 크기 순으로 정렬합니다.',
      relatedTables: ['settlements'],
      sql: `SELECT merchant_id, settlement_month, expected_amount, settled_amount,
  expected_amount - settled_amount AS diff
FROM settlements
ORDER BY ABS(expected_amount - settled_amount) DESC;`,
    },
    {
      title: '수수료 유형별 금액',
      description: '수수료 유형(fee_type)별 비용 규모를 확인하려고 합니다. 유형별 수수료 금액(amount) 합계를 합계가 큰 순서로 보여주세요.',
      hint: '유형별 합계',
      explanation: 'GROUP BY fee_type 으로 묶고 SUM(amount) 로 합계를 냅니다. 비용 분석의 기본 패턴입니다.',
      relatedTables: ['fees'],
      sql: `SELECT fee_type, SUM(amount) AS fee_amount
FROM fees
GROUP BY fee_type
ORDER BY fee_amount DESC;`,
    },
    {
      title: '열린 미수금',
      description: '아직 회수되지 않은 미수금만 모아 보려고 합니다. 상태(status)가 OPEN 인 항목의 가맹점 아이디(merchant_id), 주문 아이디(order_id), 금액(amount), 만기일(due_date)을 만기일이 빠른 순서로 보여주세요.',
      hint: '단일 조건 필터링',
      explanation: 'WHERE status = \'OPEN\' 으로 미수금만 추리고 ORDER BY due_date 로 만기일 순서대로 정렬합니다.',
      relatedTables: ['receivables'],
      sql: `SELECT merchant_id, order_id, amount, due_date
FROM receivables
WHERE status = 'OPEN'
ORDER BY due_date;`,
    },
    {
      title: '월별 정산 건수',
      description: '월별로 정산이 몇 건씩 발생했는지 추세를 보려고 합니다. 정산월(settlement_month)별 정산 건수를 월 오름차순으로 보여주세요.',
      hint: '시간 단위 그룹 카운트',
      explanation: 'GROUP BY settlement_month 로 월별로 묶고 COUNT(*) 로 건수를 셉니다. 시계열 흐름을 보기 위해 월 오름차순으로 정렬합니다.',
      relatedTables: ['settlements'],
      sql: `SELECT settlement_month, COUNT(*) AS settlement_count
FROM settlements
GROUP BY settlement_month
ORDER BY settlement_month;`,
    },
    {
      title: '승인 결제 목록',
      description: '정상 승인된 결제만 시간 순으로 살펴보려고 합니다. 상태(status)가 APPROVED 인 결제의 주문 아이디(order_id), 금액(amount), 결제 수단(method), 승인 일시(approved_at)를 승인 일시 순으로 보여주세요.',
      hint: '필터 + 시간 정렬',
      explanation: 'WHERE 로 승인 건만 추리고 ORDER BY approved_at 으로 시간 흐름대로 정렬합니다. 거래 흐름 점검에 자주 사용됩니다.',
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
      description: '가맹점별 실제 매출(승인된 결제만 합산)을 비교하고 싶습니다. 가맹점 이름(name)별로 승인된 결제의 금액(amount) 합계를 합계가 큰 순서로 보여주세요.',
      hint: '3중 조인 + 조건부 합계',
      explanation: 'merchants-orders-payments 를 JOIN 으로 연결하고 WHERE 로 APPROVED 만 필터링한 뒤 가맹점별로 GROUP BY 해 SUM 합니다.',
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
      description: '주문 하나당 환불이 얼마나 발생했는지 확인하려고 합니다. 환불이 없는 주문은 0 으로 표시하고, 주문번호(order_no)와 환불 합계를 환불이 큰 순서로 보여주세요.',
      hint: 'LEFT JOIN + COALESCE',
      explanation: 'LEFT JOIN 으로 환불이 없는 주문도 살리고, COALESCE(SUM(...), 0) 으로 NULL 을 0 으로 치환합니다. 누락 데이터 처리의 표준 패턴입니다.',
      relatedTables: ['orders', 'refunds'],
      sql: `SELECT o.order_no, COALESCE(SUM(r.amount), 0) AS refund_total
FROM orders o
LEFT JOIN refunds r ON r.order_id = o.id
GROUP BY o.id, o.order_no
ORDER BY refund_total DESC;`,
    },
    {
      title: '결제별 수수료',
      description: '결제 한 건당 부과된 수수료 총액을 확인하려고 합니다. 결제 아이디(payment_id), 결제 금액(amount), 수수료 합계를 수수료가 큰 순서로 보여주세요. 수수료가 없으면 0 으로 표시합니다.',
      hint: 'LEFT JOIN + 그룹 합계',
      explanation: 'payments 에 fees 를 LEFT JOIN 해 수수료가 없는 결제도 포함시키고, COALESCE 로 NULL 을 0 으로 변환합니다.',
      relatedTables: ['payments', 'fees'],
      sql: `SELECT p.id AS payment_id, p.amount, COALESCE(SUM(f.amount), 0) AS fee_amount
FROM payments p
LEFT JOIN fees f ON f.payment_id = p.id
GROUP BY p.id, p.amount
ORDER BY fee_amount DESC;`,
    },
    {
      title: '가맹점별 미수금',
      description: '아직 받지 못한 미수금을 가맹점별로 집계하려고 합니다. 상태(status)가 OPEN 인 미수금만 합산해서 가맹점 이름(name)과 미수금 합계를 합계가 큰 순서로 보여주세요.',
      hint: '조인 + 조건부 합계',
      explanation: 'merchants 와 receivables 를 JOIN 한 뒤 WHERE 로 OPEN 만 필터링하고 가맹점별로 GROUP BY 해 SUM 합니다.',
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
      description: '정산 기록에 가맹점 이름까지 함께 표시하려고 합니다. 가맹점 이름(name), 정산월(settlement_month), 예상 금액(expected_amount), 정산 금액(settled_amount)을 월·이름 순으로 정렬해 보여주세요.',
      hint: '코드값을 이름으로 치환하는 조인',
      explanation: 'settlements 에 merchants 를 JOIN 해 merchant_id 대신 가맹점 이름을 표시합니다. 두 컬럼 기준 정렬은 ORDER BY 에 콤마로 나열합니다.',
      relatedTables: ['merchants', 'settlements'],
      sql: `SELECT m.name, s.settlement_month, s.expected_amount, s.settled_amount
FROM settlements s
JOIN merchants m ON m.id = s.merchant_id
ORDER BY s.settlement_month, m.name;`,
    },
    {
      title: '주문과 결제 비교',
      description: '주문 금액과 실제 결제 금액을 나란히 비교하려고 합니다. 주문번호(order_no), 주문 금액(order_amount), 결제 금액(amount), 결제 상태(status)를 주문 순으로 보여주세요.',
      hint: '주문·결제 1:1 매핑 조인',
      explanation: 'orders 와 payments 를 order_id 로 JOIN 해 같은 행에 주문과 결제 정보를 나란히 표시합니다. 금액 차이 검증의 기초가 됩니다.',
      relatedTables: ['orders', 'payments'],
      sql: `SELECT o.order_no, o.order_amount, p.amount AS payment_amount, p.status
FROM orders o
JOIN payments p ON p.order_id = o.id
ORDER BY o.id;`,
    },
    {
      title: '가맹점별 환불 금액',
      description: '가맹점별 환불 손실 규모를 보려고 합니다. 환불이 없는 가맹점은 0 으로 표시하고, 가맹점 이름(name)과 환불 금액 합계를 합계가 큰 순서로 보여주세요.',
      hint: '다단 LEFT JOIN + COALESCE',
      explanation: 'merchants → orders → refunds 를 LEFT JOIN 으로 연결해 환불이 없는 가맹점도 결과에 포함시키고 COALESCE 로 0 처리합니다.',
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
      description: '예상 정산액과 실제 지급액이 다른 건만 추려 보려고 합니다. 가맹점 이름(name), 예상 금액(expected_amount), 정산 금액(settled_amount), 차액을 차액 절대값이 큰 순서로 보여주세요.',
      hint: '불일치 필터 + 절대값 정렬',
      explanation: 'WHERE expected_amount != settled_amount 로 불일치 건만 골라 보여줍니다. ABS(diff) 로 정렬해 가장 큰 어긋남부터 우선 점검합니다.',
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
      description: '환불을 차감한 주문별 실제 매출을 확인하려고 합니다. 주문번호(order_no), 주문 금액(order_amount), 환불 금액, 그리고 주문 금액에서 환불을 뺀 순매출을 순매출이 큰 순서로 보여주세요.',
      hint: 'LEFT JOIN + 계산 컬럼',
      explanation: 'refunds 를 LEFT JOIN 한 뒤 SUM 으로 환불 합계를 만들고, 주문 금액에서 빼서 순매출을 계산합니다. COALESCE 로 환불 없는 주문을 0 처리합니다.',
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
      description: '가맹점별 거래량과 거래 규모를 동시에 보려고 합니다. 가맹점 이름(name), 주문 건수, 주문 금액 합계를 금액이 큰 순서로 보여주세요.',
      hint: '동시 집계',
      explanation: '같은 GROUP BY 안에서 COUNT 와 SUM 을 동시에 적용해 건수와 금액을 한 번에 산출합니다.',
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
      description: '결제와 환불 내역으로 가맹점별 정산 예상액을 직접 계산하려고 합니다. 승인 결제 합계에서 환불을 빼고 수수료율(fee_rate)을 적용해 가맹점 이름(name), 결제액, 환불액, 계산된 정산액을 정산액이 큰 순서로 보여주세요.',
      hint: 'CTE 두 개 + 가중치 계산',
      explanation: 'WITH 구문으로 결제 합계와 환불 합계를 각각 CTE 로 만든 뒤 merchants 와 JOIN 해 (결제-환불) × (1 - fee_rate) 로 정산액을 계산합니다.',
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
      description: '예상 정산액과 실제 지급액 사이에 오차가 있는 건만 골라 감사하려고 합니다. 가맹점 이름(name), 예상 금액(expected_amount), 정산 금액(settled_amount), 차액을 차액 절대값이 큰 순서로 보여주세요.',
      hint: '불일치 필터링',
      explanation: 'WHERE 로 expected_amount != settled_amount 인 건만 추리고 차액을 계산해 ABS 기준으로 정렬합니다. 재무 감사의 출발점입니다.',
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
      description: '가맹점 계약 수수료율로 산출한 예상 수수료와 실제 부과된 수수료를 결제 단위로 비교하려고 합니다. 가맹점 이름(name), 결제 아이디(payment_id), 결제 금액(amount), 예상 수수료, 실제 수수료를 결제 순으로 보여주세요.',
      hint: '계산식 vs 실제값 비교',
      explanation: 'p.amount × m.fee_rate 로 이론값을 만들고 fees 합계와 나란히 표시합니다. 계약 수수료율 위반을 잡아내는 패턴입니다.',
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
      description: '가맹점별 순매출(주문 금액에서 환불 차감)을 계산해 순위를 매기려고 합니다. 가맹점 이름(name), 순매출, 순위를 순위 순서로 보여주세요.',
      hint: '윈도우 함수 RANK',
      explanation: 'RANK() OVER (ORDER BY ...) 윈도우 함수로 집계 결과에 순위를 부여합니다. 동률은 같은 순위, 다음 순위가 건너뛰는 표준 랭킹입니다.',
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
      description: '정산 차액과 미수금이 함께 큰 가맹점을 식별하려고 합니다. 가맹점 이름(name), 정산 차액(예상-지급), 열린 미수금 합계를 미수금이 큰 순서로 보여주세요.',
      hint: '서로 다른 두 지표 결합',
      explanation: 'settlements 와 receivables 를 각각 JOIN 하고, 미수금은 OPEN 상태만 조건부 LEFT JOIN 으로 가져와 한 행에 두 지표를 합칩니다.',
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
      description: '결제별로 환불을 차감하고 남은 잔액을 확인하려고 합니다. 주문번호(order_no), 결제 금액, 환불 합계, 잔액을 잔액이 큰 순서로 보여주세요.',
      hint: '결제 단위 차감 계산',
      explanation: 'payments 에 refunds 를 LEFT JOIN 해 결제 한 건에 매달린 환불을 합산하고, 결제 금액에서 빼 잔액을 만듭니다.',
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
      description: '예상 정산액 대비 실제 지급된 비율을 확인하려고 합니다. 가맹점 이름(name), 정산월(settlement_month), 지급률(퍼센트)을 지급률이 낮은 순서로 보여주세요.',
      hint: '비율 계산 + 소수점 반올림',
      explanation: 'settled_amount × 100.0 / expected_amount 로 비율을 계산하고 ROUND 로 소수 한 자리로 정리합니다. 100 을 정수 100 이 아닌 100.0 으로 쓰는 이유는 정수 나눗셈을 피하기 위함입니다.',
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
      description: '주문 한 건에 얽힌 결제, 환불, 수수료를 한 줄로 종합해서 보려고 합니다. 가맹점 이름(name), 주문번호(order_no), 주문 금액(order_amount), 결제 금액, 환불 합계, 수수료 합계를 주문번호 순으로 보여주세요.',
      hint: '복수 LEFT JOIN + DISTINCT 합계',
      explanation: '환불과 수수료가 모두 1:N 으로 붙으면 곱 효과로 합계가 부풀려지므로 SUM(DISTINCT ...) 로 중복을 제거합니다. 다대다 조인의 함정을 다루는 패턴입니다.',
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
      description: '예상 정산액 대비 미수금이 차지하는 비중을 확인하려고 합니다. 가맹점 이름(name), 열린 미수금 합계, 예상 정산액, 미수금 비율(퍼센트)을 비율이 높은 순서로 보여주세요.',
      hint: '집계 + 비율 + 조건부 조인',
      explanation: 'receivables 는 OPEN 만 조건부로 LEFT JOIN 하고, settlements 의 expected_amount 는 MAX 로 집계 컨텍스트에 끼워 넣어 비율을 계산합니다.',
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
      description: '정산이 약속한 정산일보다 며칠 늦게 처리됐는지 확인하려고 합니다. 가맹점 이름(name), 정산월(settlement_month), 실제 정산 일시(settled_at), 지연 일수를 지연이 큰 순서로 보여주세요.',
      hint: '날짜 차이 계산 (julianday)',
      explanation: 'julianday 함수로 두 날짜의 차이를 일 단위로 구합니다. 정산월과 가맹점의 settlement_day 를 합쳐 약속 날짜를 만들고 실제 완료일과 비교합니다.',
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
