import { defineExampleSet } from './shared'

export const inventorySupplyChainExamples = defineExampleSet('10_inventory_supply_chain.sql', {
  beginner: [
    {
      id: '10_inventory_supply_chain.beginner.01',
      title: '활성 창고 목록',
      description: '현재 운영 중인 창고의 식별자(id), 이름(name), 지역(region)을 보여 주세요. 지역과 이름 순서로 정렬해 어느 권역에 어떤 창고가 있는지 한눈에 파악할 수 있게 해 주세요.',
      hint: '활성 플래그 필터 + 다중 정렬',
      explanation: 'WHERE 절로 is_active = 1 조건을 걸어 운영 중인 창고만 추리고, ORDER BY 에 region, name 두 컬럼을 넘겨 1차·2차 정렬을 동시에 적용합니다.',
      relatedTables: ['warehouses'],
      sql: `SELECT id, name, region
FROM warehouses
WHERE is_active = 1
ORDER BY region, name;`,
    },
    {
      id: '10_inventory_supply_chain.beginner.02',
      title: '공급사 리드타임 순서',
      description: '공급사 이름(name), 국가(country), 평균 리드타임(lead_time_days)을 리드타임이 긴 순서대로 보여 주세요. 발주 시 어느 공급사가 더 오래 걸리는지 비교할 수 있게 해 주세요.',
      hint: '단일 컬럼 내림차순 정렬',
      explanation: 'ORDER BY lead_time_days DESC 로 숫자 컬럼을 내림차순 정렬합니다. 정렬 키를 SELECT 에 포함시키면 결과에서 값을 바로 확인할 수 있습니다.',
      relatedTables: ['suppliers'],
      sql: `SELECT name, country, lead_time_days
FROM suppliers
ORDER BY lead_time_days DESC;`,
    },
    {
      id: '10_inventory_supply_chain.beginner.03',
      title: '상품 안전재고 목록',
      description: '상품 코드(sku), 이름(name), 안전재고 기준(safety_stock)을 안전재고가 큰 순서로 정리해 주세요. 어떤 상품이 더 많은 비축이 필요한지 보이게 해 주세요.',
      hint: '단순 SELECT + 내림차순',
      explanation: '단일 테이블에서 필요한 컬럼만 추리고 ORDER BY 로 정렬하는 가장 기본적인 조회 패턴입니다.',
      relatedTables: ['products'],
      sql: `SELECT sku, name, safety_stock
FROM products
ORDER BY safety_stock DESC;`,
    },
    {
      id: '10_inventory_supply_chain.beginner.04',
      title: '입출고 유형별 수량',
      description: '입출고 유형(movement_type)별로 총 이동 수량을 합산해 보여 주세요. 입고와 출고 중 어느 쪽 물량이 더 많은지 비교할 수 있게 정렬해 주세요.',
      hint: '카테고리별 SUM 집계',
      explanation: 'GROUP BY movement_type 으로 유형별 그룹을 만들고 SUM(quantity) 로 그룹별 합계를 구합니다. 집계 결과는 별칭(total_qty)으로 정렬에 활용합니다.',
      relatedTables: ['stock_movements'],
      sql: `SELECT movement_type, SUM(quantity) AS total_qty
FROM stock_movements
GROUP BY movement_type
ORDER BY total_qty DESC;`,
    },
    {
      id: '10_inventory_supply_chain.beginner.05',
      title: '발주 상태별 수',
      description: '발주 상태(status)별 건수를 집계해 어떤 상태(예: 대기·부분입고·완료)에 발주가 몰려 있는지 보여 주세요. 건수가 많은 순으로 정렬해 주세요.',
      hint: '상태 컬럼 COUNT 집계',
      explanation: 'GROUP BY 와 COUNT(*) 의 조합으로 카테고리별 행 수를 셉니다. 집계 결과 별칭을 ORDER BY 에 그대로 쓸 수 있습니다.',
      relatedTables: ['purchase_orders'],
      sql: `SELECT status, COUNT(*) AS order_count
FROM purchase_orders
GROUP BY status
ORDER BY order_count DESC;`,
    },
    {
      id: '10_inventory_supply_chain.beginner.06',
      title: '미입고 발주',
      description: '아직 입고가 완료되지 않은 발주의 식별자(id), 공급사(supplier_id), 상태(status), 발주 일시(ordered_at)를 발주가 오래된 순으로 보여 주세요.',
      hint: 'NULL 조건 필터',
      explanation: '입고일이 비어 있는 행은 received_at IS NULL 로 걸러 냅니다. NULL 비교에는 = 대신 IS / IS NOT 을 써야 합니다.',
      relatedTables: ['purchase_orders'],
      sql: `SELECT id, supplier_id, status, ordered_at
FROM purchase_orders
WHERE received_at IS NULL
ORDER BY ordered_at;`,
    },
    {
      id: '10_inventory_supply_chain.beginner.07',
      title: '발주 품목 금액',
      description: '발주 라인별로 발주 수량(ordered_qty) × 단가(unit_cost) 로 발주 금액을 계산해 보여 주세요. 금액이 큰 순으로 정렬해 주세요.',
      hint: '컬럼 간 곱셈 계산',
      explanation: 'SELECT 절에서 두 컬럼을 곱한 식을 별칭으로 노출하고, 같은 별칭을 ORDER BY 에서 그대로 참조할 수 있습니다.',
      relatedTables: ['purchase_order_items'],
      sql: `SELECT purchase_order_id, product_id, ordered_qty * unit_cost AS ordered_amount
FROM purchase_order_items
ORDER BY ordered_amount DESC;`,
    },
    {
      id: '10_inventory_supply_chain.beginner.08',
      title: '현재고 스냅샷',
      description: '창고(warehouse_id) · 상품(product_id) 별 현재 보유 수량(on_hand_qty)과 예약 수량(reserved_qty)을 보여 주세요. 창고와 상품 순서로 정렬해 주세요.',
      hint: '두 컬럼 정렬',
      explanation: 'ORDER BY 에 두 개 이상의 키를 넘기면 첫 키로 묶고 그 안에서 두 번째 키로 정렬되는 계층적 정렬이 적용됩니다.',
      relatedTables: ['stock_snapshots'],
      sql: `SELECT warehouse_id, product_id, on_hand_qty, reserved_qty
FROM stock_snapshots
ORDER BY warehouse_id, product_id;`,
    },
    {
      id: '10_inventory_supply_chain.beginner.09',
      title: '예약 가능 재고',
      description: '창고 · 상품 별로 실제 출고 가능한 수량(보유 - 예약)을 계산해 보여 주세요. 가용 재고가 적은 행을 위로 올려 부족 위험 항목이 먼저 보이게 해 주세요.',
      hint: '컬럼 간 뺄셈 + 오름차순 정렬',
      explanation: 'SELECT 절에서 두 컬럼을 빼서 파생 컬럼을 만들고 별칭을 ORDER BY 에 사용합니다. 오름차순 정렬은 ASC(기본값) 로 명시하면 의도가 분명해집니다.',
      relatedTables: ['stock_snapshots'],
      sql: `SELECT warehouse_id, product_id, on_hand_qty - reserved_qty AS available_qty
FROM stock_snapshots
ORDER BY available_qty ASC;`,
    },
    {
      id: '10_inventory_supply_chain.beginner.10',
      title: '국가별 공급사 수',
      description: '국가(country)별로 공급사가 몇 곳 등록되어 있는지 집계해 주세요. 공급사가 많은 국가가 위로 오도록 정렬해 주세요.',
      hint: '카테고리별 COUNT',
      explanation: 'GROUP BY country 로 국가별 묶음을 만들고 COUNT(*) 로 각 그룹의 행 수를 셉니다. 가장 기본적인 빈도 집계 패턴입니다.',
      relatedTables: ['suppliers'],
      sql: `SELECT country, COUNT(*) AS supplier_count
FROM suppliers
GROUP BY country
ORDER BY supplier_count DESC;`,
    },
  ],
  intermediate: [
    {
      id: '10_inventory_supply_chain.intermediate.01',
      title: '상품과 공급사',
      description: '상품 코드(sku), 상품 이름(product_name), 공급사 이름(supplier_name), 공급사 국가(country)를 함께 보여 주세요. 상품 코드 순서로 정렬해 주세요.',
      hint: '두 테이블 INNER JOIN',
      explanation: 'products 와 suppliers 를 supplier_id 키로 INNER JOIN 해 양쪽 컬럼을 한 행에 모읍니다. 같은 컬럼명을 구분하려고 별칭을 부여했습니다.',
      relatedTables: ['products', 'suppliers'],
      sql: `SELECT p.sku, p.name AS product_name, s.name AS supplier_name, s.country
FROM products p
JOIN suppliers s ON s.id = p.supplier_id
ORDER BY p.sku;`,
    },
    {
      id: '10_inventory_supply_chain.intermediate.02',
      title: '입출고와 창고명',
      description: '입출고 이력에 창고 이름(warehouse_name), 상품 이름(product_name), 유형(movement_type), 수량(quantity), 이동 일시(moved_at)를 함께 보여 주세요. 이동 시각 순으로 정렬해 주세요.',
      hint: '세 테이블 INNER JOIN',
      explanation: 'stock_movements 를 중심으로 warehouses, products 를 차례로 JOIN 해 ID 만 들어 있던 이력에 사람이 읽기 쉬운 이름을 붙입니다.',
      relatedTables: ['stock_movements', 'warehouses', 'products'],
      sql: `SELECT w.name AS warehouse_name, p.name AS product_name, sm.movement_type, sm.quantity, sm.moved_at
FROM stock_movements sm
JOIN warehouses w ON w.id = sm.warehouse_id
JOIN products p ON p.id = sm.product_id
ORDER BY sm.moved_at;`,
    },
    {
      id: '10_inventory_supply_chain.intermediate.03',
      title: '상품별 순입출고',
      description: '상품별 순이동량(입고 - 출고)을 계산해 어떤 상품이 순증가했고 어떤 상품이 순감소했는지 보여 주세요. 순이동량이 큰 순으로 정렬해 주세요.',
      hint: 'CASE 식을 활용한 부호 집계',
      explanation: 'CASE 로 입고는 +, 출고는 - 부호를 부여한 뒤 SUM 으로 합하면 한 번의 집계로 순증감을 구할 수 있습니다.',
      relatedTables: ['products', 'stock_movements'],
      sql: `SELECT p.name, SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity ELSE -sm.quantity END) AS net_qty
FROM products p
JOIN stock_movements sm ON sm.product_id = p.id
GROUP BY p.id, p.name
ORDER BY net_qty DESC;`,
    },
    {
      id: '10_inventory_supply_chain.intermediate.04',
      title: '창고별 보유 재고',
      description: '창고별로 보유 수량(on_hand_qty) 합계를 보여 주세요. 보유량이 많은 창고가 위에 오도록 정렬해 주세요.',
      hint: 'JOIN 후 그룹 합계',
      explanation: 'stock_snapshots 를 warehouses 와 JOIN 한 뒤 창고 단위로 GROUP BY 해 SUM 으로 합계를 냅니다.',
      relatedTables: ['warehouses', 'stock_snapshots'],
      sql: `SELECT w.name, SUM(s.on_hand_qty) AS on_hand_qty
FROM warehouses w
JOIN stock_snapshots s ON s.warehouse_id = w.id
GROUP BY w.id, w.name
ORDER BY on_hand_qty DESC;`,
    },
    {
      id: '10_inventory_supply_chain.intermediate.05',
      title: '안전재고 미달 상품',
      description: '보유 수량(on_hand_qty)이 안전재고 기준(safety_stock)보다 낮은 상품을 찾아 상품 이름, 보유 수량, 안전재고를 보여 주세요. 부족이 심한 순으로 정렬해 주세요.',
      hint: '두 컬럼 비교 + JOIN',
      explanation: 'WHERE 절에서 두 테이블의 컬럼끼리 비교해 안전재고 미달 행만 추립니다. JOIN 으로 가져온 컬럼도 그대로 조건에 쓸 수 있습니다.',
      relatedTables: ['products', 'stock_snapshots'],
      sql: `SELECT p.name, s.on_hand_qty, p.safety_stock
FROM stock_snapshots s
JOIN products p ON p.id = s.product_id
WHERE s.on_hand_qty < p.safety_stock
ORDER BY s.on_hand_qty;`,
    },
    {
      id: '10_inventory_supply_chain.intermediate.06',
      title: '발주와 공급사',
      description: '발주 식별자(id), 공급사 이름, 입고 창고 이름, 상태, 발주 일시를 함께 보여 주세요. 발주가 오래된 순으로 정렬해 주세요.',
      hint: '세 테이블 결합',
      explanation: 'purchase_orders 를 중심으로 suppliers, warehouses 를 JOIN 해 ID 만 있던 발주에 의미 있는 이름을 붙이는 표준 결합 패턴입니다.',
      relatedTables: ['purchase_orders', 'suppliers', 'warehouses'],
      sql: `SELECT po.id, s.name AS supplier_name, w.name AS warehouse_name, po.status, po.ordered_at
FROM purchase_orders po
JOIN suppliers s ON s.id = po.supplier_id
JOIN warehouses w ON w.id = po.warehouse_id
ORDER BY po.ordered_at;`,
    },
    {
      id: '10_inventory_supply_chain.intermediate.07',
      title: '발주별 총 금액',
      description: '발주 한 건당 모든 품목의 금액(수량 × 단가)을 합산해 발주 금액 합계를 보여 주세요. 상태와 함께 표시하고 금액이 큰 발주가 위에 오도록 정렬해 주세요.',
      hint: '헤더-라인 JOIN 후 그룹 합계',
      explanation: '발주 헤더(purchase_orders)와 라인(purchase_order_items)을 JOIN 한 뒤 발주 단위로 GROUP BY 해 라인 금액의 합을 구합니다.',
      relatedTables: ['purchase_orders', 'purchase_order_items'],
      sql: `SELECT po.id, po.status, SUM(i.ordered_qty * i.unit_cost) AS ordered_amount
FROM purchase_orders po
JOIN purchase_order_items i ON i.purchase_order_id = po.id
GROUP BY po.id, po.status
ORDER BY ordered_amount DESC;`,
    },
    {
      id: '10_inventory_supply_chain.intermediate.08',
      title: '공급사별 발주 금액',
      description: '공급사별로 발주 금액 합계(수량 × 단가)를 집계해 어느 공급사와의 거래 규모가 큰지 보여 주세요. 금액이 큰 순으로 정렬해 주세요.',
      hint: '세 테이블 JOIN 후 공급사 단위 집계',
      explanation: 'suppliers → purchase_orders → purchase_order_items 를 차례로 JOIN 한 뒤 공급사 단위로 묶어 라인 금액의 SUM 을 구합니다.',
      relatedTables: ['suppliers', 'purchase_orders', 'purchase_order_items'],
      sql: `SELECT s.name, SUM(i.ordered_qty * i.unit_cost) AS ordered_amount
FROM suppliers s
JOIN purchase_orders po ON po.supplier_id = s.id
JOIN purchase_order_items i ON i.purchase_order_id = po.id
GROUP BY s.id, s.name
ORDER BY ordered_amount DESC;`,
    },
    {
      id: '10_inventory_supply_chain.intermediate.09',
      title: '부분 입고 품목',
      description: '입고된 수량(received_qty)이 발주 수량(ordered_qty)에 못 미치는 라인을 찾아, 발주 식별자, 상품 이름, 발주/입고 수량을 보여 주세요. 발주 식별자 순으로 정렬해 주세요.',
      hint: '두 컬럼 비교 필터',
      explanation: 'WHERE 절에서 received_qty < ordered_qty 조건으로 미완 입고 라인을 추리고, products 와 JOIN 해 상품 이름까지 함께 노출합니다.',
      relatedTables: ['purchase_orders', 'purchase_order_items', 'products'],
      sql: `SELECT po.id AS purchase_order_id, p.name, i.ordered_qty, i.received_qty
FROM purchase_order_items i
JOIN purchase_orders po ON po.id = i.purchase_order_id
JOIN products p ON p.id = i.product_id
WHERE i.received_qty < i.ordered_qty
ORDER BY po.id;`,
    },
    {
      id: '10_inventory_supply_chain.intermediate.10',
      title: '창고별 예약 재고 비율',
      description: '창고별로 예약 수량 합계와 보유 수량 합계를 보여 주고, 보유 대비 예약 비율(%)도 함께 계산해 주세요. 예약 비율이 높은 창고가 위로 오게 정렬해 주세요.',
      hint: '집계값 간 비율 계산',
      explanation: '그룹 합계끼리 나누어 비율을 만들 때는 100.0 을 곱해 정수 나눗셈을 피하고, ROUND 로 소수 자릿수를 정리합니다.',
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
      id: '10_inventory_supply_chain.advanced.01',
      title: '입고 리드타임 분석',
      description: '입고가 완료된 발주에 대해 실제 소요일(입고일 - 발주일)과 공급사 평균 리드타임(lead_time_days)을 나란히 보여 주세요. 실제 소요일이 긴 순으로 정렬해 주세요.',
      hint: '날짜 차이 계산 + 기대값 비교',
      explanation: 'SQLite 의 julianday() 로 날짜를 숫자(일 단위)로 바꿔 빼면 두 시점의 간격(일)이 나옵니다. 공급사 기대 리드타임과 같은 행에 두어 비교가 쉽게 만듭니다.',
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
      id: '10_inventory_supply_chain.advanced.02',
      title: '리드타임 초과 발주',
      description: '입고가 완료됐지만 공급사 평균 리드타임을 넘긴 발주만 골라 식별자, 공급사 이름, 발주일, 입고일을 보여 주세요.',
      hint: '계산식 결과를 조건으로 사용',
      explanation: 'WHERE 절에서 julianday 차이를 lead_time_days 와 직접 비교해 기대치를 초과한 발주만 추립니다. NULL 인 입고일은 IS NOT NULL 로 제외합니다.',
      relatedTables: ['purchase_orders', 'suppliers'],
      sql: `SELECT po.id, s.name, po.ordered_at, po.received_at
FROM purchase_orders po
JOIN suppliers s ON s.id = po.supplier_id
WHERE po.received_at IS NOT NULL
  AND julianday(po.received_at) - julianday(po.ordered_at) > s.lead_time_days
ORDER BY po.id;`,
    },
    {
      id: '10_inventory_supply_chain.advanced.03',
      title: '상품별 가용재고와 안전재고',
      description: '상품별로 가용 재고 합계(보유 - 예약)와 안전재고를 비교해, 안전재고와의 차이(safety_gap)를 함께 보여 주세요. 부족이 심한 상품을 위로 올려 주세요.',
      hint: '집계값과 단일값의 차이',
      explanation: '여러 창고 스냅샷을 상품 단위로 합쳐 가용 합계를 만든 뒤, 안전재고와 빼서 갭을 노출합니다. GROUP BY 에는 SELECT 의 비집계 컬럼을 모두 포함시켜야 합니다.',
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
      id: '10_inventory_supply_chain.advanced.04',
      title: '상품별 재고 이동 누계',
      description: '상품별로 시간 순 입출고 이력을 따라가며 누적 재고 변화(running_qty)를 보여 주세요. 상품과 이동 시각 순서로 정렬해 주세요.',
      hint: '윈도 함수 PARTITION + 누적합',
      explanation: 'SUM() OVER (PARTITION BY ... ORDER BY ...) 윈도 함수로 그룹 안에서 누적합을 계산합니다. CASE 로 입출고 부호를 정한 뒤 누적해 시점별 재고 변화를 추적합니다.',
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
      id: '10_inventory_supply_chain.advanced.05',
      title: '창고별 안전재고 미달 수',
      description: '창고별로 안전재고를 밑돈 상품이 몇 종 있는지 집계해 주세요. 미달 품목이 많은 창고를 위로 올려 주세요.',
      hint: '조건 필터 후 그룹 카운트',
      explanation: 'WHERE 로 미달 행만 추린 뒤 창고 단위로 GROUP BY 하고 COUNT(*) 로 행 수를 셉니다. 운영 우선순위가 높은 창고를 빠르게 식별할 수 있습니다.',
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
      id: '10_inventory_supply_chain.advanced.06',
      title: '발주 잔량 계산',
      description: '발주 라인별로 아직 입고되지 않은 잔량(발주 - 입고)을 계산해, 발주 식별자, 상품 이름, 발주/입고/잔량을 보여 주세요. 잔량이 많은 순으로 정렬해 주세요.',
      hint: '컬럼 간 차이로 잔량 계산',
      explanation: 'ordered_qty - received_qty 로 잔량을 만들고 별칭으로 노출합니다. 양수만 있어도 되지만 전체를 보여 줘 입고 완료/미완 모두 확인할 수 있게 합니다.',
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
      id: '10_inventory_supply_chain.advanced.07',
      title: '공급사별 평균 리드타임 차이',
      description: '공급사별 평균 실제 리드타임을 계약상 평균 리드타임(lead_time_days)과 함께 보여 주세요. 실제 평균이 긴 공급사를 위로 올려 주세요.',
      hint: '날짜 차이의 AVG',
      explanation: 'julianday 차이의 평균을 AVG 로 구해 공급사별 실제 소요 일수를 계산합니다. 기대 리드타임과 같이 노출해 격차를 한눈에 보게 합니다.',
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
      id: '10_inventory_supply_chain.advanced.08',
      title: '재고 금액 추정',
      description: '상품별 보유 수량 합계에 최근 매입 단가를 곱해 재고 가치를 추정해 주세요. 상품 이름, 보유 합계, 적용 단가, 추정 재고 금액을 함께 보여 주고 금액이 큰 순으로 정렬해 주세요.',
      hint: 'CTE 로 상품별 단가 표 준비 후 결합',
      explanation: 'WITH 절(CTE)로 상품별 최근 단가 표를 먼저 만든 다음 본 쿼리에서 JOIN 해 사용합니다. 중간 결과를 분리하면 가독성과 재사용성이 높아집니다.',
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
      id: '10_inventory_supply_chain.advanced.09',
      title: '입출고 참조번호별 흐름',
      description: '입출고 이력에 참조번호(reference_no), 창고 이름, 상품 이름, 유형, 수량, 이동 시각을 함께 보여 주세요. 같은 참조번호의 행이 모이도록 정렬해 주세요.',
      hint: '세 테이블 JOIN + 참조 키 정렬',
      explanation: '참조번호로 정렬하면 동일 트랜잭션(이송·반품 등)에 묶인 입출고가 인접하게 모여 흐름 추적이 쉬워집니다.',
      relatedTables: ['stock_movements', 'warehouses', 'products'],
      sql: `SELECT sm.reference_no, w.name AS warehouse_name, p.name AS product_name,
  sm.movement_type, sm.quantity, sm.moved_at
FROM stock_movements sm
JOIN warehouses w ON w.id = sm.warehouse_id
JOIN products p ON p.id = sm.product_id
ORDER BY sm.reference_no;`,
    },
    {
      id: '10_inventory_supply_chain.advanced.10',
      title: '재고 운영 종합 리포트',
      description: '창고 · 상품 조합별로 보유 수량, 예약 수량, 그리고 해당 조합에서 발생한 입출고 건수를 한 행에 모아 주세요. 이동 이력이 없는 조합도 빠지지 않게 해 주세요.',
      hint: 'LEFT JOIN + 그룹 카운트',
      explanation: '스냅샷을 기준으로 stock_movements 를 LEFT JOIN 해 이동 이력이 없는 조합은 0건으로 남깁니다. 두 키(warehouse_id, product_id) 모두를 JOIN 조건에 포함해야 잘못된 매칭을 막을 수 있습니다.',
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
