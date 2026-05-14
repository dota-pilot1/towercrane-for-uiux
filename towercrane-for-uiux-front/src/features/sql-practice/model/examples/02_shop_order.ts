import { defineExampleSet } from './shared'

export const shopOrderExamples = defineExampleSet('02_shop_order.sql', {
  beginner: [
    {
      id: '02_shop_order.beginner.01',
      title: '최근 주문부터 보기',
      description:
        '쇼핑몰 주문 내역을 최신순으로 확인하세요. 주문번호(id), 고객번호(customer_id), 주문 상태(status), 주문일시(ordered_at)를 최근 주문부터 위에 보여줍니다.',
      hint: '날짜 컬럼 기준으로 내림차순 정렬하는 가장 기본적인 패턴입니다.',
      explanation:
        'ORDER BY ordered_at DESC로 최신 주문이 상단에 오도록 정렬합니다. 운영 대시보드에서 "최근 활동" 목록을 만들 때 가장 많이 쓰이는 기본 쿼리입니다.',
      relatedTables: ['orders'],
      sql: `SELECT id, customer_id, status, ordered_at
FROM orders
ORDER BY ordered_at DESC;`,
    },
    {
      id: '02_shop_order.beginner.02',
      title: '재고가 적은 상품 찾기',
      description:
        '재고가 15개 이하로 부족한 상품을 찾으세요. 상품명(name), 카테고리(category), 가격(price), 재고 수량(stock_qty)을 재고가 적은 순으로 보여줍니다.',
      hint: '특정 컬럼 값이 임계값 이하인 행만 필터링한 뒤 오름차순 정렬하는 패턴입니다.',
      explanation:
        'WHERE stock_qty <= 15로 재고 부족 상품만 거르고 ORDER BY stock_qty ASC로 적은 순서대로 표시합니다. 발주 우선순위 산정 같은 운영 쿼리에 자주 쓰이는 패턴입니다.',
      relatedTables: ['products'],
      sql: `SELECT name, category, price, stock_qty
FROM products
WHERE stock_qty <= 15
ORDER BY stock_qty ASC;`,
    },
    {
      id: '02_shop_order.beginner.03',
      title: '고객 등급별 인원',
      description:
        'VIP, REGULAR 같은 고객 등급별로 몇 명이 있는지 집계하세요. 등급(grade)과 고객 수(customer_count)를 인원이 많은 등급부터 보여줍니다.',
      hint: '등급 컬럼으로 그룹을 묶고 행 개수를 세는 기본 집계 패턴입니다.',
      explanation:
        'GROUP BY grade로 등급별 묶음을 만든 뒤 COUNT(*)로 인원을 셉니다. 카테고리/등급/상태 분포를 보는 가장 전형적인 집계 쿼리입니다.',
      relatedTables: ['customers'],
      sql: `SELECT grade, COUNT(*) AS customer_count
FROM customers
GROUP BY grade
ORDER BY customer_count DESC;`,
    },
    {
      id: '02_shop_order.beginner.04',
      title: '가격이 높은 상품',
      description:
        '가장 비싼 상품 상위 3개를 찾으세요. 상품명(name), 카테고리(category), 가격(price)을 가격이 높은 순으로 보여줍니다.',
      hint: '정렬 후 상위 N건만 잘라내는 Top-N 패턴입니다.',
      explanation:
        'ORDER BY price DESC로 비싼 순으로 정렬한 뒤 LIMIT 3으로 상위 3건만 가져옵니다. "최고 매출 상품 Top 5" 같은 랭킹 쿼리의 가장 기본 형태입니다.',
      relatedTables: ['products'],
      sql: `SELECT name, category, price
FROM products
ORDER BY price DESC
LIMIT 3;`,
    },
    {
      id: '02_shop_order.beginner.05',
      title: '결제 상태별 건수',
      description:
        '승인·대기·실패 같은 결제 상태별로 건수를 집계하세요. 상태(status)와 결제 건수(payment_count)를 건수가 많은 상태부터 보여줍니다.',
      hint: '상태 컬럼으로 묶고 개수를 세는 그룹별 집계 패턴입니다.',
      explanation:
        'GROUP BY status로 결제 상태별 묶음을 만들고 COUNT(*)로 건수를 셉니다. 결제 모니터링 대시보드에서 실패율을 빠르게 파악할 때 쓰는 기본 쿼리입니다.',
      relatedTables: ['payments'],
      sql: `SELECT status, COUNT(*) AS payment_count
FROM payments
GROUP BY status
ORDER BY payment_count DESC;`,
    },
    {
      id: '02_shop_order.beginner.06',
      title: '배송 대기 주문',
      description:
        '아직 고객에게 도착하지 않은 배송 건을 찾으세요. 주문번호(order_id), 배송사(carrier), 배송 상태(status)를 주문번호 순으로 보여주며, 준비 중이거나 운송 중인 건만 대상입니다.',
      hint: 'NULL 검사와 다중 값 매칭(IN)을 함께 쓰는 필터링 패턴입니다.',
      explanation:
        'delivered_at IS NULL로 미배송 건을 거르고 status IN (...)으로 특정 단계만 포함시킵니다. NULL 비교는 `=`가 아닌 IS NULL을 써야 한다는 점이 핵심입니다.',
      relatedTables: ['shipments'],
      sql: `SELECT order_id, carrier, status
FROM shipments
WHERE delivered_at IS NULL
  AND status IN ('READY', 'IN_TRANSIT')
ORDER BY order_id;`,
    },
    {
      id: '02_shop_order.beginner.07',
      title: '상품 카테고리별 평균 가격',
      description:
        '상품 카테고리별 평균 단가를 구하세요. 카테고리(category)와 평균 가격(avg_price)을 평균 가격이 비싼 카테고리부터 보여줍니다.',
      hint: '그룹별 평균을 구하는 집계 함수 패턴입니다.',
      explanation:
        'GROUP BY category와 AVG(price)를 조합해 카테고리 단위 평균 단가를 구합니다. ROUND로 소수점을 다듬어 사람이 보기 좋은 형태로 만드는 것도 흔한 마무리입니다.',
      relatedTables: ['products'],
      sql: `SELECT category, ROUND(AVG(price), 0) AS avg_price
FROM products
GROUP BY category
ORDER BY avg_price DESC;`,
    },
    {
      id: '02_shop_order.beginner.08',
      title: '주문 상태별 건수',
      description:
        '결제 대기·결제 완료·취소 같은 주문 상태별로 몇 건씩 있는지 집계하세요. 상태(status)와 주문 건수(order_count)를 건수가 많은 순으로 보여줍니다.',
      hint: '상태 컬럼 그룹별 개수를 세는 집계 패턴입니다.',
      explanation:
        'GROUP BY status + COUNT(*) 조합으로 주문 단계별 분포를 한눈에 확인합니다. 운영팀이 PENDING이 비정상적으로 많은지 점검할 때 자주 쓰는 쿼리입니다.',
      relatedTables: ['orders'],
      sql: `SELECT status, COUNT(*) AS order_count
FROM orders
GROUP BY status
ORDER BY order_count DESC;`,
    },
    {
      id: '02_shop_order.beginner.09',
      title: '결제 수단별 결제액',
      description:
        '카드·현금 등 결제 수단별 총 결제 금액을 집계하세요. 결제 수단(method)과 총 금액(total_amount)을 금액이 큰 수단부터 보여줍니다.',
      hint: '그룹별 합계를 구하는 집계 함수 패턴입니다.',
      explanation:
        'GROUP BY method + SUM(amount)로 결제 수단별 매출 비중을 봅니다. COUNT 대신 SUM을 써서 "건수"가 아닌 "금액"을 집계한다는 점이 핵심입니다.',
      relatedTables: ['payments'],
      sql: `SELECT method, SUM(amount) AS total_amount
FROM payments
GROUP BY method
ORDER BY total_amount DESC;`,
    },
    {
      id: '02_shop_order.beginner.10',
      title: '주문 상품 수량 큰 순서',
      description:
        '어떤 주문이 가장 많은 상품을 담았는지 보세요. 주문번호(order_id)와 총 상품 수량(item_qty)을 수량이 많은 주문부터 보여줍니다.',
      hint: '주문번호로 묶어 수량을 합산하는 그룹별 집계 패턴입니다.',
      explanation:
        'GROUP BY order_id로 한 주문의 여러 라인을 묶고 SUM(quantity)로 총 수량을 더합니다. 라인 단위 테이블을 헤더 단위로 요약할 때 쓰는 가장 기본 형태입니다.',
      relatedTables: ['order_items'],
      sql: `SELECT order_id, SUM(quantity) AS item_qty
FROM order_items
GROUP BY order_id
ORDER BY item_qty DESC;`,
    },
  ],
  intermediate: [
    {
      id: '02_shop_order.intermediate.01',
      title: '주문별 결제 대상 금액 계산',
      description:
        '주문별로 실제 결제해야 할 금액을 계산하세요. 주문번호(order_id), 고객명(customer_name), 주문 상태(status), 주문 합계(order_total)를 금액이 큰 주문부터 보여줍니다.',
      hint: '세 테이블을 키로 연결한 뒤 주문별로 라인 금액을 합산하는 패턴입니다.',
      explanation:
        'orders·customers·order_items를 JOIN한 뒤 GROUP BY로 주문 단위로 묶고 SUM(quantity * unit_price)으로 합계를 냅니다. 라인 테이블의 수량×단가를 헤더 레벨로 끌어올리는 전형적인 영수증 계산 쿼리입니다.',
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
      id: '02_shop_order.intermediate.02',
      title: '카테고리별 판매 수량과 매출',
      description:
        '취소된 주문을 제외하고 카테고리별 판매 수량과 매출을 집계하세요. 카테고리(category), 판매 수량(sold_qty), 매출(revenue)을 매출이 큰 카테고리부터 보여줍니다.',
      hint: '여러 테이블을 연결한 뒤 특정 상태를 제외하고 카테고리로 묶어 집계하는 패턴입니다.',
      explanation:
        '주문·라인·상품을 JOIN하고 WHERE status != "CANCELLED"로 취소 건을 제외한 뒤 GROUP BY p.category로 묶어 SUM 두 개를 동시에 집계합니다. 매출 분석에서 "유효 주문"만 거르는 일반적인 패턴입니다.',
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
      id: '02_shop_order.intermediate.03',
      title: '고객별 주문 횟수',
      description:
        '주문이 한 번도 없는 고객까지 포함해서 고객별 주문 횟수를 구하세요. 고객명(name)과 주문 건수(order_count)를 주문이 많은 고객부터 보여줍니다.',
      hint: '주문이 없는 고객도 0으로 보여줘야 하므로 한쪽을 기준으로 남기는 조인이 필요합니다.',
      explanation:
        'LEFT JOIN으로 주문이 없는 고객도 결과에 남기고 COUNT(o.id)는 NULL을 세지 않으므로 자연스럽게 0이 됩니다. INNER JOIN을 쓰면 주문 없는 고객이 누락되므로 차이를 이해하는 것이 핵심입니다.',
      relatedTables: ['customers', 'orders'],
      sql: `SELECT c.name, COUNT(o.id) AS order_count
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY order_count DESC;`,
    },
    {
      id: '02_shop_order.intermediate.04',
      title: '주문별 배송 상태',
      description:
        '각 주문이 어떤 배송 단계에 있는지 확인하세요. 주문번호(order_id), 주문 상태(order_status), 배송 상태(shipment_status), 배송사(carrier)를 주문번호 순으로 보여줍니다.',
      hint: '두 테이블을 주문번호 키로 연결해 한 줄로 펼치는 조인 패턴입니다.',
      explanation:
        'orders와 shipments를 order_id로 INNER JOIN해 1:1 관계를 한 행으로 합칩니다. 같은 status 컬럼이 양쪽에 존재할 때 별칭(AS)으로 구분하는 것이 핵심입니다.',
      relatedTables: ['orders', 'shipments'],
      sql: `SELECT o.id AS order_id, o.status AS order_status, s.status AS shipment_status, s.carrier
FROM orders o
JOIN shipments s ON s.order_id = o.id
ORDER BY o.id;`,
    },
    {
      id: '02_shop_order.intermediate.05',
      title: '주문별 결제 상태',
      description:
        '각 주문의 결제 정보를 한눈에 확인하세요. 주문번호(order_id), 주문 상태(order_status), 결제 수단(method), 결제 상태(payment_status), 결제 금액(amount)을 주문번호 순으로 보여줍니다.',
      hint: '주문과 결제를 키로 연결해 결제 정보를 주문 행에 붙이는 조인 패턴입니다.',
      explanation:
        'orders와 payments를 order_id로 JOIN해 주문 한 건의 결제 상세를 같은 행에 표시합니다. 양쪽 모두 status 컬럼이 있어 별칭으로 구분하는 점이 주문별 배송 상태 조회와 같은 구조입니다.',
      relatedTables: ['orders', 'payments'],
      sql: `SELECT o.id AS order_id, o.status AS order_status, p.method, p.status AS payment_status, p.amount
FROM orders o
JOIN payments p ON p.order_id = o.id
ORDER BY o.id;`,
    },
    {
      id: '02_shop_order.intermediate.06',
      title: '상품별 판매 수량',
      description:
        '한 번도 팔리지 않은 상품까지 포함해 상품별 판매 수량을 구하세요. 상품명(name)과 판매 수량(sold_qty)을 많이 팔린 상품부터 보여줍니다.',
      hint: '판매 이력이 없는 상품도 결과에 남겨야 하므로 한쪽 기준 조인 + 합계 패턴이 필요합니다.',
      explanation:
        'LEFT JOIN으로 주문 라인이 없는 상품도 보존하고 SUM(oi.quantity)는 매칭되는 라인이 없으면 NULL이 됩니다. 0으로 보이게 하려면 COALESCE를 추가하는 변형도 자주 쓰입니다.',
      relatedTables: ['products', 'order_items'],
      sql: `SELECT p.name, SUM(oi.quantity) AS sold_qty
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id
GROUP BY p.id, p.name
ORDER BY sold_qty DESC;`,
    },
    {
      id: '02_shop_order.intermediate.07',
      title: '고객별 승인 결제액',
      description:
        '결제가 정상 승인된 건만 합산해 고객별 결제 금액을 구하세요. 고객명(name)과 승인 결제액(approved_amount)을 금액이 큰 고객부터 보여줍니다.',
      hint: '세 테이블을 연결하고 특정 상태로 필터링한 뒤 고객 단위로 합산하는 패턴입니다.',
      explanation:
        'customers·orders·payments를 JOIN한 뒤 WHERE p.status = "APPROVED"로 유효 결제만 거르고 SUM(p.amount)로 고객별 합계를 냅니다. VIP 산정처럼 "실결제 기준" 매출 집계의 표준 형태입니다.',
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
      id: '02_shop_order.intermediate.08',
      title: '배송사별 배송 건수',
      description:
        '배송사·배송 상태 조합별 건수를 집계하세요. 배송사(carrier), 상태(status), 배송 건수(shipment_count)를 배송사 가나다순, 같은 배송사 안에서는 건수가 많은 상태부터 보여줍니다.',
      hint: '두 컬럼을 동시에 묶어 집계하는 다중 키 그룹 패턴입니다.',
      explanation:
        'GROUP BY carrier, status로 두 컬럼 조합을 키로 사용해 매트릭스 형태의 집계를 만듭니다. ORDER BY에도 두 컬럼을 넣어 사람이 읽기 좋은 정렬을 만드는 것이 핵심입니다.',
      relatedTables: ['shipments'],
      sql: `SELECT carrier, status, COUNT(*) AS shipment_count
FROM shipments
GROUP BY carrier, status
ORDER BY carrier, shipment_count DESC;`,
    },
    {
      id: '02_shop_order.intermediate.09',
      title: '두 번 이상 주문한 고객',
      description:
        '재구매 고객을 찾으세요. 주문을 2건 이상 한 고객의 이름(name)과 주문 횟수(order_count)를 주문이 많은 순으로 보여줍니다.',
      hint: '그룹별 집계 결과 자체에 조건을 거는 패턴입니다.',
      explanation:
        '집계된 결과에 조건을 걸 때는 WHERE가 아닌 HAVING을 씁니다. WHERE는 그룹 만들기 전 단계, HAVING은 그룹이 만들어진 뒤에 동작한다는 차이를 이해하는 것이 핵심입니다.',
      relatedTables: ['customers', 'orders'],
      sql: `SELECT c.name, COUNT(o.id) AS order_count
FROM customers c
JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name
HAVING COUNT(o.id) >= 2
ORDER BY order_count DESC;`,
    },
    {
      id: '02_shop_order.intermediate.10',
      title: '주문 상세 라인 보기',
      description:
        '어떤 고객이 어떤 상품을 얼마에 몇 개 샀는지 라인 단위로 펼쳐 보세요. 주문번호(order_id), 고객명(customer_name), 상품명(product_name), 수량(quantity), 단가(unit_price)를 주문번호와 라인 순서대로 보여줍니다.',
      hint: '네 테이블을 키로 연결해 라인 단위 영수증을 만드는 다중 조인 패턴입니다.',
      explanation:
        'order_items를 중심으로 orders·customers·products를 차례로 JOIN해 ID만 있던 라인을 사람이 읽을 수 있는 이름으로 변환합니다. 정규화된 데이터를 보고서용으로 펼치는 전형적인 형태입니다.',
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
      id: '02_shop_order.advanced.01',
      title: '주문 합계와 결제 금액 검증',
      description:
        '주문 라인 합계와 실제 결제 금액이 다른 이상 주문을 찾으세요. 주문번호(order_id), 고객명(customer_name), 라인 합계(item_total), 결제 금액(payment_amount), 차이(diff)를 차이가 큰 순으로 보여줍니다.',
      hint: '미리 집계한 결과를 임시 테이블처럼 만들어 다른 테이블과 비교하는 패턴입니다.',
      explanation:
        'WITH 절(CTE)로 주문별 라인 합계를 먼저 계산한 뒤 결제 금액과 비교합니다. 정합성 검증이나 회계 차이 분석처럼 "집계 후 비교"가 필요할 때 쓰는 패턴이며, ABS를 정렬에 활용해 양/음 차이를 동등하게 다룹니다.',
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
      id: '02_shop_order.advanced.02',
      title: '배송 완료 주문의 리드타임 분석',
      description:
        '배송이 끝난 주문의 출고~수령까지 걸린 일수를 구하세요. 주문번호(order_id), 고객명(customer_name), 배송사(carrier), 배송 소요일(delivery_days)을 오래 걸린 주문부터 보여줍니다.',
      hint: '두 날짜 컬럼의 차이를 계산해 소요 시간으로 환산하는 패턴입니다.',
      explanation:
        'julianday로 날짜를 숫자로 바꾼 뒤 빼서 일수를 얻고, delivered_at IS NOT NULL로 완료 건만 남깁니다. DB마다 날짜 차이 함수가 다르지만(DATEDIFF, EXTRACT 등) "두 시점의 간격을 측정"하는 아이디어는 동일합니다.',
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
      id: '02_shop_order.advanced.03',
      title: '고객별 객단가',
      description:
        '고객별 주문 횟수와 1회 평균 주문 금액(객단가)을 구하세요. 고객명(name), 주문 건수(order_count), 평균 주문 금액(avg_order_total)을 객단가가 높은 고객부터 보여줍니다.',
      hint: '미리 주문별 합계를 만들어 두고 그것을 다시 고객 단위로 평균 내는 두 단계 집계 패턴입니다.',
      explanation:
        'CTE에서 주문 단위 합계를 만들고 본 쿼리에서 고객 단위로 AVG를 적용합니다. AVG(quantity * unit_price)를 한 번에 쓰면 라인 단위 평균이 되어 의미가 달라지므로, "어느 수준에서 평균을 내는가"를 분리하는 것이 핵심입니다.',
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
      id: '02_shop_order.advanced.04',
      title: '취소 주문 제외 매출 랭킹',
      description:
        '취소 주문을 제외한 상품별 매출과 순위를 구하세요. 상품명(name), 매출(revenue), 매출 순위(revenue_rank)를 순위가 높은 순으로 보여줍니다.',
      hint: '집계된 매출 위에 윈도우 함수로 순위를 매기는 패턴입니다.',
      explanation:
        'RANK() OVER (ORDER BY ...)로 집계 결과에 순위를 부여합니다. 동률일 때 같은 순위를 부여하고 다음 순위는 건너뛰는 RANK의 특성을 이해하는 것이 중요하며, 끊김 없는 순위가 필요하면 DENSE_RANK를 씁니다.',
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
      id: '02_shop_order.advanced.05',
      title: '재고 대비 판매 위험 상품',
      description:
        '지금까지 팔린 수량을 빼고 남는 재고를 계산해 재고 위험 상품을 파악하세요. 상품명(name), 현재 재고(stock_qty), 누적 판매량(sold_qty), 판매 후 잔여 재고(stock_after_sales)를 잔여 재고가 적은 순으로 보여줍니다.',
      hint: '판매 이력이 없는 상품도 0으로 보여야 하므로 한쪽 기준 조인 + NULL 처리 패턴이 필요합니다.',
      explanation:
        'LEFT JOIN으로 미판매 상품도 포함시키고 COALESCE(SUM(...), 0)으로 NULL을 0으로 바꿔 계산에 안전하게 사용합니다. NULL이 산술 연산에 끼면 결과가 NULL이 되는 함정을 막아주는 표준 방어 기법입니다.',
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
      id: '02_shop_order.advanced.06',
      title: '배송 단계별 주문 금액',
      description:
        '배송 단계별로 묶여있는 매출 규모를 파악하세요. 배송 상태(shipment_status)와 라인 합계(item_total)를 금액이 큰 단계부터 보여줍니다.',
      hint: '세 테이블을 연결한 뒤 배송 상태로 묶어 라인 금액을 합산하는 패턴입니다.',
      explanation:
        'shipments·orders·order_items를 JOIN한 뒤 GROUP BY s.status로 배송 단계 단위 합계를 냅니다. "준비 중 단계에 묶인 금액이 얼마인지"처럼 운영 단계별 자금 흐름을 보는 분석 쿼리입니다.',
      relatedTables: ['shipments', 'orders', 'order_items'],
      sql: `SELECT s.status AS shipment_status, SUM(oi.quantity * oi.unit_price) AS item_total
FROM shipments s
JOIN orders o ON o.id = s.order_id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY s.status
ORDER BY item_total DESC;`,
    },
    {
      id: '02_shop_order.advanced.07',
      title: '결제 승인 후 미배송 주문',
      description:
        '돈은 받았지만 아직 배송이 끝나지 않은 주문을 찾으세요. 주문번호(order_id), 고객명(name), 결제일시(paid_at), 배송 상태(shipment_status)를 오래된 결제부터 보여줍니다.',
      hint: '여러 테이블을 연결한 뒤 한쪽 상태는 정상, 다른 쪽은 NULL인 조건을 같이 거는 패턴입니다.',
      explanation:
        'WHERE p.status = "APPROVED" AND s.delivered_at IS NULL을 함께 걸어 "결제는 완료, 배송은 미완료" 교집합을 찾습니다. 결제는 됐는데 배송이 지연되는 CS 이슈 탐지에 직결되는 운영 쿼리입니다.',
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
      id: '02_shop_order.advanced.08',
      title: '등급별 매출 기여',
      description:
        '취소 주문을 제외하고 고객 등급별 매출 기여도를 구하세요. 등급(grade)과 매출(revenue)을 매출이 큰 등급부터 보여줍니다.',
      hint: '여러 테이블을 연결한 뒤 취소 건을 제외하고 고객 등급으로 묶어 라인 금액을 합산하는 패턴입니다.',
      explanation:
        'customers·orders·order_items를 JOIN하고 WHERE로 취소 주문을 제거한 뒤 GROUP BY c.grade로 등급 단위 합계를 냅니다. VIP가 실제로 매출에 얼마나 기여하는지 평가할 때 쓰는 표준 분석 쿼리입니다.',
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
      id: '02_shop_order.advanced.09',
      title: '주문 상태별 평균 상품 수',
      description:
        '주문 상태별로 한 주문에 평균 몇 개의 상품이 담기는지 구하세요. 상태(status)와 평균 상품 수(avg_qty)를 평균이 큰 상태부터 보여줍니다.',
      hint: '주문 단위로 먼저 합계를 만들고 그 결과를 다시 상태별로 평균 내는 두 단계 집계 패턴입니다.',
      explanation:
        'CTE에서 주문별 총 수량을 만든 뒤 본 쿼리에서 상태별 평균을 냅니다. SUM과 AVG를 한 번에 쓰면 라인 단위 평균이 되어 의미가 달라지므로, 두 단계로 나누는 것이 핵심입니다.',
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
      id: '02_shop_order.advanced.10',
      title: '상품 구매 고객 목록',
      description:
        '상품별로 그 상품을 산 고객 이름을 한 줄로 모아 보세요. 상품명(product_name)과 구매 고객 명단(customer_names)을 상품명 가나다순으로 보여주며, 같은 고객이 여러 번 샀어도 한 번만 표시합니다.',
      hint: '그룹별 여러 값을 하나의 문자열로 이어 붙이는 집계 패턴입니다.',
      explanation:
        'GROUP_CONCAT(DISTINCT ...)으로 그룹 내 값을 콤마로 이어 붙입니다. DB마다 함수 이름이 다르지만(PostgreSQL은 STRING_AGG, Oracle은 LISTAGG) "1:N을 1:1 텍스트로 압축"하는 아이디어는 동일합니다.',
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
