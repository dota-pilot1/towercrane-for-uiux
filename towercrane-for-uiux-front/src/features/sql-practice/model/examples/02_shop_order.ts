import { defineExampleSet } from './shared'

export const shopOrderExamples = defineExampleSet('02_shop_order.sql', {
  beginner: [
    {
      title: '최근 주문부터 보기',
      relatedTables: ['orders'],
      sql: `SELECT id, customer_id, status, ordered_at
FROM orders
ORDER BY ordered_at DESC;`,
    },
    {
      title: '재고가 적은 상품 찾기',
      relatedTables: ['products'],
      sql: `SELECT name, category, price, stock_qty
FROM products
WHERE stock_qty <= 15
ORDER BY stock_qty ASC;`,
    },
    {
      title: '고객 등급별 인원',
      relatedTables: ['customers'],
      sql: `SELECT grade, COUNT(*) AS customer_count
FROM customers
GROUP BY grade
ORDER BY customer_count DESC;`,
    },
    {
      title: '가격이 높은 상품',
      relatedTables: ['products'],
      sql: `SELECT name, category, price
FROM products
ORDER BY price DESC
LIMIT 3;`,
    },
    {
      title: '결제 상태별 건수',
      relatedTables: ['payments'],
      sql: `SELECT status, COUNT(*) AS payment_count
FROM payments
GROUP BY status
ORDER BY payment_count DESC;`,
    },
    {
      title: '배송 대기 주문',
      relatedTables: ['shipments'],
      sql: `SELECT order_id, carrier, status
FROM shipments
WHERE delivered_at IS NULL
  AND status IN ('READY', 'IN_TRANSIT')
ORDER BY order_id;`,
    },
    {
      title: '상품 카테고리별 평균 가격',
      relatedTables: ['products'],
      sql: `SELECT category, ROUND(AVG(price), 0) AS avg_price
FROM products
GROUP BY category
ORDER BY avg_price DESC;`,
    },
    {
      title: '주문 상태별 건수',
      relatedTables: ['orders'],
      sql: `SELECT status, COUNT(*) AS order_count
FROM orders
GROUP BY status
ORDER BY order_count DESC;`,
    },
    {
      title: '결제 수단별 결제액',
      relatedTables: ['payments'],
      sql: `SELECT method, SUM(amount) AS total_amount
FROM payments
GROUP BY method
ORDER BY total_amount DESC;`,
    },
    {
      title: '주문 상품 수량 큰 순서',
      relatedTables: ['order_items'],
      sql: `SELECT order_id, SUM(quantity) AS item_qty
FROM order_items
GROUP BY order_id
ORDER BY item_qty DESC;`,
    },
  ],
  intermediate: [
    {
      title: '주문별 결제 대상 금액 계산',
      relatedTables: ['customers', 'orders', 'order_items'],
      sql: `SELECT
  o.id AS order_id,
  c.name AS customer_name,
  o.status,
  SUM(oi.quantity * oi.unit_price) AS order_total
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, c.name, o.status
ORDER BY order_total DESC;`,
    },
    {
      title: '카테고리별 판매 수량과 매출',
      relatedTables: ['orders', 'order_items', 'products'],
      sql: `SELECT
  p.category,
  SUM(oi.quantity) AS sold_qty,
  SUM(oi.quantity * oi.unit_price) AS revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE o.status != 'CANCELLED'
GROUP BY p.category
ORDER BY revenue DESC;`,
    },
    {
      title: '고객별 주문 횟수',
      relatedTables: ['customers', 'orders'],
      sql: `SELECT c.name, COUNT(o.id) AS order_count
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY order_count DESC;`,
    },
    {
      title: '주문별 배송 상태',
      relatedTables: ['orders', 'shipments'],
      sql: `SELECT o.id AS order_id, o.status AS order_status, s.status AS shipment_status, s.carrier
FROM orders o
JOIN shipments s ON s.order_id = o.id
ORDER BY o.id;`,
    },
    {
      title: '주문별 결제 상태',
      relatedTables: ['orders', 'payments'],
      sql: `SELECT o.id AS order_id, o.status AS order_status, p.method, p.status AS payment_status, p.amount
FROM orders o
JOIN payments p ON p.order_id = o.id
ORDER BY o.id;`,
    },
    {
      title: '상품별 판매 수량',
      relatedTables: ['products', 'order_items'],
      sql: `SELECT p.name, SUM(oi.quantity) AS sold_qty
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id
GROUP BY p.id, p.name
ORDER BY sold_qty DESC;`,
    },
    {
      title: '고객별 승인 결제액',
      relatedTables: ['customers', 'orders', 'payments'],
      sql: `SELECT c.name, SUM(p.amount) AS approved_amount
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN payments p ON p.order_id = o.id
WHERE p.status = 'APPROVED'
GROUP BY c.id, c.name
ORDER BY approved_amount DESC;`,
    },
    {
      title: '배송사별 배송 건수',
      relatedTables: ['shipments'],
      sql: `SELECT carrier, status, COUNT(*) AS shipment_count
FROM shipments
GROUP BY carrier, status
ORDER BY carrier, shipment_count DESC;`,
    },
    {
      title: '두 번 이상 주문한 고객',
      relatedTables: ['customers', 'orders'],
      sql: `SELECT c.name, COUNT(o.id) AS order_count
FROM customers c
JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name
HAVING COUNT(o.id) >= 2
ORDER BY order_count DESC;`,
    },
    {
      title: '주문 상세 라인 보기',
      relatedTables: ['orders', 'order_items', 'products', 'customers'],
      sql: `SELECT o.id AS order_id, c.name AS customer_name, p.name AS product_name, oi.quantity, oi.unit_price
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN customers c ON c.id = o.customer_id
JOIN products p ON p.id = oi.product_id
ORDER BY o.id, oi.id;`,
    },
  ],
  advanced: [
    {
      title: '주문 합계와 결제 금액 검증',
      relatedTables: ['orders', 'order_items', 'payments', 'customers'],
      sql: `WITH order_totals AS (
  SELECT order_id, SUM(quantity * unit_price) AS item_total
  FROM order_items
  GROUP BY order_id
)
SELECT
  o.id AS order_id,
  c.name AS customer_name,
  ot.item_total,
  p.amount AS payment_amount,
  p.amount - ot.item_total AS diff
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN order_totals ot ON ot.order_id = o.id
JOIN payments p ON p.order_id = o.id
WHERE p.amount != ot.item_total
ORDER BY ABS(p.amount - ot.item_total) DESC;`,
    },
    {
      title: '배송 완료 주문의 리드타임 분석',
      relatedTables: ['customers', 'orders', 'shipments'],
      sql: `SELECT
  o.id AS order_id,
  c.name AS customer_name,
  s.carrier,
  ROUND(julianday(s.delivered_at) - julianday(s.shipped_at), 1) AS delivery_days
FROM shipments s
JOIN orders o ON o.id = s.order_id
JOIN customers c ON c.id = o.customer_id
WHERE s.delivered_at IS NOT NULL
ORDER BY delivery_days DESC;`,
    },
    {
      title: '고객별 객단가',
      relatedTables: ['customers', 'orders', 'order_items'],
      sql: `WITH order_totals AS (
  SELECT order_id, SUM(quantity * unit_price) AS order_total
  FROM order_items
  GROUP BY order_id
)
SELECT c.name, COUNT(o.id) AS order_count, ROUND(AVG(ot.order_total), 0) AS avg_order_total
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_totals ot ON ot.order_id = o.id
GROUP BY c.id, c.name
ORDER BY avg_order_total DESC;`,
    },
    {
      title: '취소 주문 제외 매출 랭킹',
      relatedTables: ['products', 'orders', 'order_items'],
      sql: `SELECT
  p.name,
  SUM(oi.quantity * oi.unit_price) AS revenue,
  RANK() OVER (ORDER BY SUM(oi.quantity * oi.unit_price) DESC) AS revenue_rank
FROM products p
JOIN order_items oi ON oi.product_id = p.id
JOIN orders o ON o.id = oi.order_id
WHERE o.status != 'CANCELLED'
GROUP BY p.id, p.name
ORDER BY revenue_rank;`,
    },
    {
      title: '재고 대비 판매 위험 상품',
      relatedTables: ['products', 'order_items'],
      sql: `SELECT
  p.name,
  p.stock_qty,
  COALESCE(SUM(oi.quantity), 0) AS sold_qty,
  p.stock_qty - COALESCE(SUM(oi.quantity), 0) AS stock_after_sales
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id
GROUP BY p.id, p.name, p.stock_qty
ORDER BY stock_after_sales ASC;`,
    },
    {
      title: '배송 단계별 주문 금액',
      relatedTables: ['shipments', 'orders', 'order_items'],
      sql: `SELECT s.status AS shipment_status, SUM(oi.quantity * oi.unit_price) AS item_total
FROM shipments s
JOIN orders o ON o.id = s.order_id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY s.status
ORDER BY item_total DESC;`,
    },
    {
      title: '결제 승인 후 미배송 주문',
      relatedTables: ['orders', 'payments', 'shipments', 'customers'],
      sql: `SELECT o.id AS order_id, c.name, p.paid_at, s.status AS shipment_status
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN payments p ON p.order_id = o.id
JOIN shipments s ON s.order_id = o.id
WHERE p.status = 'APPROVED'
  AND s.delivered_at IS NULL
ORDER BY p.paid_at;`,
    },
    {
      title: '등급별 매출 기여',
      relatedTables: ['customers', 'orders', 'order_items'],
      sql: `SELECT c.grade, SUM(oi.quantity * oi.unit_price) AS revenue
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status != 'CANCELLED'
GROUP BY c.grade
ORDER BY revenue DESC;`,
    },
    {
      title: '주문 상태별 평균 상품 수',
      relatedTables: ['orders', 'order_items'],
      sql: `WITH order_qty AS (
  SELECT o.id, o.status, SUM(oi.quantity) AS total_qty
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  GROUP BY o.id, o.status
)
SELECT status, ROUND(AVG(total_qty), 2) AS avg_qty
FROM order_qty
GROUP BY status
ORDER BY avg_qty DESC;`,
    },
    {
      title: '상품 구매 고객 목록',
      relatedTables: ['customers', 'orders', 'order_items', 'products'],
      sql: `SELECT
  p.name AS product_name,
  GROUP_CONCAT(DISTINCT c.name) AS customer_names
FROM products p
JOIN order_items oi ON oi.product_id = p.id
JOIN orders o ON o.id = oi.order_id
JOIN customers c ON c.id = o.customer_id
GROUP BY p.id, p.name
ORDER BY p.name;`,
    },
  ],
})
