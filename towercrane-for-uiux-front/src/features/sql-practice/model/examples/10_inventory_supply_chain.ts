import { defineExampleSet } from './shared'

export const inventorySupplyChainExamples = defineExampleSet('10_inventory_supply_chain.sql', {
  beginner: [
    {
      title: '활성 창고 목록',
      relatedTables: ['warehouses'],
      sql: `SELECT id, name, region
FROM warehouses
WHERE is_active = 1
ORDER BY region, name;`,
    },
    {
      title: '공급사 리드타임 순서',
      relatedTables: ['suppliers'],
      sql: `SELECT name, country, lead_time_days
FROM suppliers
ORDER BY lead_time_days DESC;`,
    },
    {
      title: '상품 안전재고 목록',
      relatedTables: ['products'],
      sql: `SELECT sku, name, safety_stock
FROM products
ORDER BY safety_stock DESC;`,
    },
    {
      title: '입출고 유형별 수량',
      relatedTables: ['stock_movements'],
      sql: `SELECT movement_type, SUM(quantity) AS total_qty
FROM stock_movements
GROUP BY movement_type
ORDER BY total_qty DESC;`,
    },
    {
      title: '발주 상태별 수',
      relatedTables: ['purchase_orders'],
      sql: `SELECT status, COUNT(*) AS order_count
FROM purchase_orders
GROUP BY status
ORDER BY order_count DESC;`,
    },
    {
      title: '미입고 발주',
      relatedTables: ['purchase_orders'],
      sql: `SELECT id, supplier_id, status, ordered_at
FROM purchase_orders
WHERE received_at IS NULL
ORDER BY ordered_at;`,
    },
    {
      title: '발주 품목 금액',
      relatedTables: ['purchase_order_items'],
      sql: `SELECT purchase_order_id, product_id, ordered_qty * unit_cost AS ordered_amount
FROM purchase_order_items
ORDER BY ordered_amount DESC;`,
    },
    {
      title: '현재고 스냅샷',
      relatedTables: ['stock_snapshots'],
      sql: `SELECT warehouse_id, product_id, on_hand_qty, reserved_qty
FROM stock_snapshots
ORDER BY warehouse_id, product_id;`,
    },
    {
      title: '예약 가능 재고',
      relatedTables: ['stock_snapshots'],
      sql: `SELECT warehouse_id, product_id, on_hand_qty - reserved_qty AS available_qty
FROM stock_snapshots
ORDER BY available_qty ASC;`,
    },
    {
      title: '국가별 공급사 수',
      relatedTables: ['suppliers'],
      sql: `SELECT country, COUNT(*) AS supplier_count
FROM suppliers
GROUP BY country
ORDER BY supplier_count DESC;`,
    },
  ],
  intermediate: [
    {
      title: '상품과 공급사',
      relatedTables: ['products', 'suppliers'],
      sql: `SELECT p.sku, p.name AS product_name, s.name AS supplier_name, s.country
FROM products p
JOIN suppliers s ON s.id = p.supplier_id
ORDER BY p.sku;`,
    },
    {
      title: '입출고와 창고명',
      relatedTables: ['stock_movements', 'warehouses', 'products'],
      sql: `SELECT w.name AS warehouse_name, p.name AS product_name, sm.movement_type, sm.quantity, sm.moved_at
FROM stock_movements sm
JOIN warehouses w ON w.id = sm.warehouse_id
JOIN products p ON p.id = sm.product_id
ORDER BY sm.moved_at;`,
    },
    {
      title: '상품별 순입출고',
      relatedTables: ['products', 'stock_movements'],
      sql: `SELECT p.name, SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity ELSE -sm.quantity END) AS net_qty
FROM products p
JOIN stock_movements sm ON sm.product_id = p.id
GROUP BY p.id, p.name
ORDER BY net_qty DESC;`,
    },
    {
      title: '창고별 보유 재고',
      relatedTables: ['warehouses', 'stock_snapshots'],
      sql: `SELECT w.name, SUM(s.on_hand_qty) AS on_hand_qty
FROM warehouses w
JOIN stock_snapshots s ON s.warehouse_id = w.id
GROUP BY w.id, w.name
ORDER BY on_hand_qty DESC;`,
    },
    {
      title: '안전재고 미달 상품',
      relatedTables: ['products', 'stock_snapshots'],
      sql: `SELECT p.name, s.on_hand_qty, p.safety_stock
FROM stock_snapshots s
JOIN products p ON p.id = s.product_id
WHERE s.on_hand_qty < p.safety_stock
ORDER BY s.on_hand_qty;`,
    },
    {
      title: '발주와 공급사',
      relatedTables: ['purchase_orders', 'suppliers', 'warehouses'],
      sql: `SELECT po.id, s.name AS supplier_name, w.name AS warehouse_name, po.status, po.ordered_at
FROM purchase_orders po
JOIN suppliers s ON s.id = po.supplier_id
JOIN warehouses w ON w.id = po.warehouse_id
ORDER BY po.ordered_at;`,
    },
    {
      title: '발주별 총 금액',
      relatedTables: ['purchase_orders', 'purchase_order_items'],
      sql: `SELECT po.id, po.status, SUM(i.ordered_qty * i.unit_cost) AS ordered_amount
FROM purchase_orders po
JOIN purchase_order_items i ON i.purchase_order_id = po.id
GROUP BY po.id, po.status
ORDER BY ordered_amount DESC;`,
    },
    {
      title: '공급사별 발주 금액',
      relatedTables: ['suppliers', 'purchase_orders', 'purchase_order_items'],
      sql: `SELECT s.name, SUM(i.ordered_qty * i.unit_cost) AS ordered_amount
FROM suppliers s
JOIN purchase_orders po ON po.supplier_id = s.id
JOIN purchase_order_items i ON i.purchase_order_id = po.id
GROUP BY s.id, s.name
ORDER BY ordered_amount DESC;`,
    },
    {
      title: '부분 입고 품목',
      relatedTables: ['purchase_orders', 'purchase_order_items', 'products'],
      sql: `SELECT po.id AS purchase_order_id, p.name, i.ordered_qty, i.received_qty
FROM purchase_order_items i
JOIN purchase_orders po ON po.id = i.purchase_order_id
JOIN products p ON p.id = i.product_id
WHERE i.received_qty < i.ordered_qty
ORDER BY po.id;`,
    },
    {
      title: '창고별 예약 재고 비율',
      relatedTables: ['warehouses', 'stock_snapshots'],
      sql: `SELECT w.name, SUM(s.reserved_qty) AS reserved_qty, SUM(s.on_hand_qty) AS on_hand_qty,
  ROUND(SUM(s.reserved_qty) * 100.0 / SUM(s.on_hand_qty), 1) AS reserved_rate
FROM warehouses w
JOIN stock_snapshots s ON s.warehouse_id = w.id
GROUP BY w.id, w.name
ORDER BY reserved_rate DESC;`,
    },
  ],
  advanced: [
    {
      title: '입고 리드타임 분석',
      relatedTables: ['purchase_orders', 'suppliers'],
      sql: `SELECT
  po.id,
  s.name AS supplier_name,
  julianday(po.received_at) - julianday(po.ordered_at) AS actual_lead_days,
  s.lead_time_days AS expected_lead_days
FROM purchase_orders po
JOIN suppliers s ON s.id = po.supplier_id
WHERE po.received_at IS NOT NULL
ORDER BY actual_lead_days DESC;`,
    },
    {
      title: '리드타임 초과 발주',
      relatedTables: ['purchase_orders', 'suppliers'],
      sql: `SELECT po.id, s.name, po.ordered_at, po.received_at
FROM purchase_orders po
JOIN suppliers s ON s.id = po.supplier_id
WHERE po.received_at IS NOT NULL
  AND julianday(po.received_at) - julianday(po.ordered_at) > s.lead_time_days
ORDER BY po.id;`,
    },
    {
      title: '상품별 가용재고와 안전재고',
      relatedTables: ['products', 'stock_snapshots'],
      sql: `SELECT
  p.name,
  SUM(s.on_hand_qty - s.reserved_qty) AS available_qty,
  p.safety_stock,
  SUM(s.on_hand_qty - s.reserved_qty) - p.safety_stock AS safety_gap
FROM products p
JOIN stock_snapshots s ON s.product_id = p.id
GROUP BY p.id, p.name, p.safety_stock
ORDER BY safety_gap ASC;`,
    },
    {
      title: '상품별 재고 이동 누계',
      relatedTables: ['products', 'stock_movements'],
      sql: `SELECT
  p.name,
  sm.moved_at,
  sm.movement_type,
  sm.quantity,
  SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity ELSE -sm.quantity END)
    OVER (PARTITION BY p.id ORDER BY sm.moved_at) AS running_qty
FROM stock_movements sm
JOIN products p ON p.id = sm.product_id
ORDER BY p.name, sm.moved_at;`,
    },
    {
      title: '창고별 안전재고 미달 수',
      relatedTables: ['warehouses', 'products', 'stock_snapshots'],
      sql: `SELECT w.name, COUNT(*) AS below_safety_count
FROM stock_snapshots s
JOIN warehouses w ON w.id = s.warehouse_id
JOIN products p ON p.id = s.product_id
WHERE s.on_hand_qty < p.safety_stock
GROUP BY w.id, w.name
ORDER BY below_safety_count DESC;`,
    },
    {
      title: '발주 잔량 계산',
      relatedTables: ['purchase_orders', 'purchase_order_items', 'products'],
      sql: `SELECT
  po.id AS purchase_order_id,
  p.name,
  i.ordered_qty,
  i.received_qty,
  i.ordered_qty - i.received_qty AS remaining_qty
FROM purchase_order_items i
JOIN purchase_orders po ON po.id = i.purchase_order_id
JOIN products p ON p.id = i.product_id
ORDER BY remaining_qty DESC;`,
    },
    {
      title: '공급사별 평균 리드타임 차이',
      relatedTables: ['suppliers', 'purchase_orders'],
      sql: `SELECT
  s.name,
  s.lead_time_days,
  ROUND(AVG(julianday(po.received_at) - julianday(po.ordered_at)), 1) AS avg_actual_lead_days
FROM suppliers s
JOIN purchase_orders po ON po.supplier_id = s.id
WHERE po.received_at IS NOT NULL
GROUP BY s.id, s.name, s.lead_time_days
ORDER BY avg_actual_lead_days DESC;`,
    },
    {
      title: '재고 금액 추정',
      relatedTables: ['products', 'purchase_order_items', 'stock_snapshots'],
      sql: `WITH latest_cost AS (
  SELECT product_id, MAX(unit_cost) AS unit_cost
  FROM purchase_order_items
  GROUP BY product_id
)
SELECT p.name, SUM(s.on_hand_qty) AS on_hand_qty, lc.unit_cost,
  SUM(s.on_hand_qty) * lc.unit_cost AS inventory_value
FROM products p
JOIN stock_snapshots s ON s.product_id = p.id
JOIN latest_cost lc ON lc.product_id = p.id
GROUP BY p.id, p.name, lc.unit_cost
ORDER BY inventory_value DESC;`,
    },
    {
      title: '입출고 참조번호별 흐름',
      relatedTables: ['stock_movements', 'warehouses', 'products'],
      sql: `SELECT sm.reference_no, w.name AS warehouse_name, p.name AS product_name,
  sm.movement_type, sm.quantity, sm.moved_at
FROM stock_movements sm
JOIN warehouses w ON w.id = sm.warehouse_id
JOIN products p ON p.id = sm.product_id
ORDER BY sm.reference_no;`,
    },
    {
      title: '재고 운영 종합 리포트',
      relatedTables: ['warehouses', 'products', 'stock_snapshots', 'stock_movements'],
      sql: `SELECT
  w.name AS warehouse_name,
  p.name AS product_name,
  s.on_hand_qty,
  s.reserved_qty,
  COUNT(sm.id) AS movement_count
FROM stock_snapshots s
JOIN warehouses w ON w.id = s.warehouse_id
JOIN products p ON p.id = s.product_id
LEFT JOIN stock_movements sm ON sm.warehouse_id = s.warehouse_id AND sm.product_id = s.product_id
GROUP BY w.name, p.name, s.on_hand_qty, s.reserved_qty
ORDER BY w.name, p.name;`,
    },
  ],
})
