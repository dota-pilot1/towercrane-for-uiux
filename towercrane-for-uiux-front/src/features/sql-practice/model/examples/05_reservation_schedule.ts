import { defineExampleSet } from './shared'

export const reservationScheduleExamples = defineExampleSet('05_reservation_schedule.sql', {
  beginner: [
    {
      id: '05_reservation_schedule.beginner.01',
      title: '활성 리소스 목록',
      description: '현재 운영 중인 리소스의 ID, 이름(name), 유형(resource_type), 수용 인원(capacity)을 보여 주세요. 유형 가나다순으로 묶고 같은 유형 안에서는 이름순으로 정렬합니다.',
      hint: '단일 테이블 필터 + 다중 컬럼 정렬',
      explanation: 'is_active 컬럼으로 운영 중 리소스만 걸러낸 뒤 ORDER BY에 두 개의 컬럼을 차례로 지정해 1차/2차 정렬을 만듭니다.',
      relatedTables: ['resources'],
      sql: `SELECT id, name, resource_type, capacity
FROM resources
WHERE is_active = 1
ORDER BY resource_type, name;`,
    },
    {
      id: '05_reservation_schedule.beginner.02',
      title: '예약 상태별 건수',
      description: '예약 상태(status)별로 몇 건이 있는지 집계해 상태와 건수(reservation_count)를 보여 주세요. 건수가 많은 순으로 정렬합니다.',
      hint: '카테고리별 COUNT 집계',
      explanation: 'GROUP BY로 status 값을 묶고 COUNT(*)로 그룹 크기를 구합니다. 집계 결과 자체를 ORDER BY에 사용해 정렬할 수 있습니다.',
      relatedTables: ['reservations'],
      sql: `SELECT status, COUNT(*) AS reservation_count
FROM reservations
GROUP BY status
ORDER BY reservation_count DESC;`,
    },
    {
      id: '05_reservation_schedule.beginner.03',
      title: '가격 높은 예약 항목',
      description: '예약 라인 중 가격이 높은 것부터 보여 주세요. 예약 ID(reservation_id), 리소스 ID(resource_id), 가격(price)을 출력합니다.',
      hint: '단일 컬럼 내림차순 정렬',
      explanation: 'ORDER BY price DESC로 큰 값을 위로 올립니다. 별도 집계 없이 원본 행을 정렬만 하는 패턴입니다.',
      relatedTables: ['reservation_items'],
      sql: `SELECT reservation_id, resource_id, price
FROM reservation_items
ORDER BY price DESC;`,
    },
    {
      id: '05_reservation_schedule.beginner.04',
      title: '차단 기간 목록',
      description: '리소스별 차단 기간을 시작 시각이 빠른 순서로 보여 주세요. 리소스 ID(resource_id), 사유(reason), 시작(starts_at)과 종료(ends_at) 시각을 출력합니다.',
      hint: '시간순 정렬',
      explanation: '시간 컬럼은 그대로 ORDER BY에 넣으면 오래된 것부터 정렬됩니다. 필터 없이 모든 행을 보여 주는 단순 조회입니다.',
      relatedTables: ['blackout_periods'],
      sql: `SELECT resource_id, reason, starts_at, ends_at
FROM blackout_periods
ORDER BY starts_at;`,
    },
    {
      id: '05_reservation_schedule.beginner.05',
      title: '점검 필요 리소스',
      description: '점검 상태가 정상(OK)이 아닌 이력만 골라 리소스 ID(resource_id), 담당자(manager_name), 상태(status)를 보여 주세요. 점검 일시가 빠른 순으로 정렬합니다.',
      hint: '같지 않음 비교 필터',
      explanation: '!= 연산자로 OK가 아닌 값만 통과시킵니다. 동일하게 <> 연산자도 같은 결과를 줍니다.',
      relatedTables: ['resource_maintenance'],
      sql: `SELECT resource_id, manager_name, status
FROM resource_maintenance
WHERE status != 'OK'
ORDER BY checked_at;`,
    },
    {
      id: '05_reservation_schedule.beginner.06',
      title: '리소스 유형별 수',
      description: '리소스 유형(resource_type)별로 등록된 리소스 개수(resource_count)를 보여 주세요. 개수가 많은 유형이 먼저 오게 정렬합니다.',
      hint: '범주별 COUNT 집계',
      explanation: 'GROUP BY로 유형을 묶어 COUNT(*)를 세고, 집계 결과를 기준으로 내림차순 정렬합니다.',
      relatedTables: ['resources'],
      sql: `SELECT resource_type, COUNT(*) AS resource_count
FROM resources
GROUP BY resource_type
ORDER BY resource_count DESC;`,
    },
    {
      id: '05_reservation_schedule.beginner.07',
      title: '고객 메모 있는 목록',
      description: '메모(memo)가 비어 있지 않은 고객만 골라 이름(name), 전화번호(phone), 메모를 보여 주세요. 이름 가나다순으로 정렬합니다.',
      hint: 'NULL 아님 필터',
      explanation: 'IS NOT NULL 로 빈 메모 값을 제외합니다. NULL 비교에는 =/!= 가 통하지 않으므로 IS NULL / IS NOT NULL 을 써야 합니다.',
      relatedTables: ['customers'],
      sql: `SELECT name, phone, memo
FROM customers
WHERE memo IS NOT NULL
ORDER BY name;`,
    },
    {
      id: '05_reservation_schedule.beginner.08',
      title: '확정 예약만 보기',
      description: '상태가 확정(CONFIRMED)인 예약만 골라 예약 ID(id), 고객 ID(customer_id), 요청 시각(requested_at)을 보여 주세요. 요청 시각이 빠른 순으로 정렬합니다.',
      hint: '단일 값 동등 필터',
      explanation: 'WHERE status = \'CONFIRMED\' 로 특정 상태만 통과시키는 가장 기본적인 필터링 패턴입니다.',
      relatedTables: ['reservations'],
      sql: `SELECT id, customer_id, requested_at
FROM reservations
WHERE status = 'CONFIRMED'
ORDER BY requested_at;`,
    },
    {
      id: '05_reservation_schedule.beginner.09',
      title: '예약 항목 시간순',
      description: '예약 라인을 시작 시각이 빠른 순으로 보여 주세요. 예약 ID(reservation_id), 리소스 ID(resource_id), 시작(starts_at)/종료(ends_at) 시각을 출력합니다.',
      hint: '타임라인 정렬',
      explanation: 'starts_at 컬럼 하나만으로 정렬해 시간 흐름대로 일정을 나열합니다. 시간 컬럼은 사전식 비교가 아니라 시간 순서로 비교됩니다.',
      relatedTables: ['reservation_items'],
      sql: `SELECT reservation_id, resource_id, starts_at, ends_at
FROM reservation_items
ORDER BY starts_at;`,
    },
    {
      id: '05_reservation_schedule.beginner.10',
      title: '리소스별 예약 항목 수',
      description: '리소스 ID(resource_id)별로 예약된 라인 수(booking_count)를 보여 주세요. 많이 예약된 리소스가 먼저 오게 정렬합니다.',
      hint: '그룹별 카운트 + 정렬',
      explanation: 'GROUP BY resource_id 로 같은 리소스 행을 묶고 COUNT(*)로 라인 수를 셉니다. 별칭(AS)을 ORDER BY에서 그대로 활용합니다.',
      relatedTables: ['reservation_items'],
      sql: `SELECT resource_id, COUNT(*) AS booking_count
FROM reservation_items
GROUP BY resource_id
ORDER BY booking_count DESC;`,
    },
  ],
  intermediate: [
    {
      id: '05_reservation_schedule.intermediate.01',
      title: '예약과 고객명',
      description: '예약 목록에 고객 이름을 붙여서 보여 주세요. 예약 ID(id), 고객명(customer_name), 상태(status), 요청 시각(requested_at)을 출력하고 요청 시각이 빠른 순으로 정렬합니다.',
      hint: '두 테이블 INNER JOIN',
      explanation: 'reservations 와 customers 를 customer_id 로 연결합니다. JOIN 으로 다른 테이블의 컬럼을 같은 행에 끌어와 표시할 수 있습니다.',
      relatedTables: ['reservations', 'customers'],
      sql: `SELECT r.id, c.name AS customer_name, r.status, r.requested_at
FROM reservations r
JOIN customers c ON c.id = r.customer_id
ORDER BY r.requested_at;`,
    },
    {
      id: '05_reservation_schedule.intermediate.02',
      title: '예약 항목과 리소스명',
      description: '예약 라인에 리소스 이름을 붙여서 보여 주세요. 예약 ID(reservation_id), 리소스명(resource_name), 시작/종료 시각(starts_at, ends_at), 가격(price)을 출력하고 시작 시각이 빠른 순으로 정렬합니다.',
      hint: '라인 + 마스터 JOIN',
      explanation: 'reservation_items 의 resource_id 를 resources 의 id 와 매칭해 이름을 결합합니다. 외래 키 → 마스터 테이블 형태의 전형적인 JOIN 입니다.',
      relatedTables: ['reservation_items', 'resources'],
      sql: `SELECT ri.reservation_id, res.name AS resource_name, ri.starts_at, ri.ends_at, ri.price
FROM reservation_items ri
JOIN resources res ON res.id = ri.resource_id
ORDER BY ri.starts_at;`,
    },
    {
      id: '05_reservation_schedule.intermediate.03',
      title: '리소스별 예약 매출',
      description: '리소스별 예약 매출 합계(total_price)를 이름(name)과 함께 보여 주세요. 예약 라인이 하나도 없는 리소스도 포함되어야 하며 매출이 큰 순으로 정렬합니다.',
      hint: 'LEFT JOIN + SUM',
      explanation: 'LEFT JOIN 으로 매칭되는 예약 라인이 없는 리소스도 결과에 남깁니다. 이 경우 SUM 결과는 NULL 이 되어 정렬 시 가장 아래에 위치합니다.',
      relatedTables: ['resources', 'reservation_items'],
      sql: `SELECT res.name, SUM(ri.price) AS total_price
FROM resources res
LEFT JOIN reservation_items ri ON ri.resource_id = res.id
GROUP BY res.id, res.name
ORDER BY total_price DESC;`,
    },
    {
      id: '05_reservation_schedule.intermediate.04',
      title: '예약별 총 금액',
      description: '예약 단위로 라인 가격을 합산해 예약 ID(id), 상태(status), 예약 총액(reservation_total)을 보여 주세요. 금액이 큰 예약이 먼저 오게 정렬합니다.',
      hint: '헤더 + 라인 SUM',
      explanation: 'reservations(헤더)와 reservation_items(라인)을 JOIN 한 뒤 GROUP BY 로 예약별 합계를 만듭니다. SELECT 의 비집계 컬럼은 모두 GROUP BY 에 포함해야 합니다.',
      relatedTables: ['reservations', 'reservation_items'],
      sql: `SELECT r.id, r.status, SUM(ri.price) AS reservation_total
FROM reservations r
JOIN reservation_items ri ON ri.reservation_id = r.id
GROUP BY r.id, r.status
ORDER BY reservation_total DESC;`,
    },
    {
      id: '05_reservation_schedule.intermediate.05',
      title: '고객별 예약 수',
      description: '고객별 예약 건수(reservation_count)를 이름(name)과 함께 보여 주세요. 한 번도 예약하지 않은 고객도 0건으로 포함하고 건수가 많은 순으로 정렬합니다.',
      hint: 'LEFT JOIN + COUNT',
      explanation: 'LEFT JOIN 으로 예약이 없는 고객도 남기고 COUNT(r.id) 처럼 JOIN 쪽 키를 세면 NULL 은 0 으로 계산됩니다.',
      relatedTables: ['customers', 'reservations'],
      sql: `SELECT c.name, COUNT(r.id) AS reservation_count
FROM customers c
LEFT JOIN reservations r ON r.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY reservation_count DESC;`,
    },
    {
      id: '05_reservation_schedule.intermediate.06',
      title: '차단 리소스명 확인',
      description: '차단 기간에 어떤 리소스가 묶여 있는지 리소스명(name), 사유(reason), 시작(starts_at)/종료(ends_at) 시각을 보여 주세요. 시작 시각이 빠른 순으로 정렬합니다.',
      hint: '차단 + 리소스 JOIN',
      explanation: 'blackout_periods 의 resource_id 로 resources 와 연결해 ID 대신 이름을 보여 줍니다. 보고서에서 흔히 쓰는 ID → 이름 치환 패턴입니다.',
      relatedTables: ['blackout_periods', 'resources'],
      sql: `SELECT res.name, b.reason, b.starts_at, b.ends_at
FROM blackout_periods b
JOIN resources res ON res.id = b.resource_id
ORDER BY b.starts_at;`,
    },
    {
      id: '05_reservation_schedule.intermediate.07',
      title: '점검 상태와 리소스',
      description: '점검 이력에 리소스명을 붙여서 보여 주세요. 리소스명(name), 담당자(manager_name), 점검 일시(checked_at), 상태(status)를 출력하고 점검 일시가 빠른 순으로 정렬합니다.',
      hint: '점검 + 리소스 JOIN',
      explanation: 'resource_maintenance 와 resources 를 resource_id 로 연결해 보고서 형태로 만듭니다. 시간 컬럼으로 정렬하면 점검 타임라인이 됩니다.',
      relatedTables: ['resource_maintenance', 'resources'],
      sql: `SELECT res.name, m.manager_name, m.checked_at, m.status
FROM resource_maintenance m
JOIN resources res ON res.id = m.resource_id
ORDER BY m.checked_at;`,
    },
    {
      id: '05_reservation_schedule.intermediate.08',
      title: 'CONFIRMED 예약 리소스',
      description: '확정된 예약에 묶인 리소스 사용 일정을 보여 주세요. 예약 ID(reservation_id), 리소스명(resource_name), 시작 시각(starts_at)을 출력하고 시작 시각이 빠른 순으로 정렬합니다.',
      hint: '세 테이블 JOIN + 상태 필터',
      explanation: 'reservations → reservation_items → resources 를 차례로 JOIN 한 뒤 WHERE 로 상태를 좁힙니다. 키 체인을 따라 여러 테이블을 연결하는 기본 패턴입니다.',
      relatedTables: ['reservations', 'reservation_items', 'resources'],
      sql: `SELECT r.id AS reservation_id, res.name AS resource_name, ri.starts_at
FROM reservations r
JOIN reservation_items ri ON ri.reservation_id = r.id
JOIN resources res ON res.id = ri.resource_id
WHERE r.status = 'CONFIRMED'
ORDER BY ri.starts_at;`,
    },
    {
      id: '05_reservation_schedule.intermediate.09',
      title: '활성 리소스별 예약 여부',
      description: '운영 중인 리소스 각각의 예약 라인 수(booking_count)를 이름(name)과 함께 보여 주세요. 예약이 0건인 리소스도 포함하고 예약이 많은 순으로 정렬합니다.',
      hint: 'LEFT JOIN + WHERE + GROUP BY',
      explanation: '리소스를 기준으로 LEFT JOIN 해야 예약 없는 리소스도 남습니다. 활성 필터는 마스터 테이블 컬럼이므로 WHERE 절에 두어도 LEFT JOIN 결과를 망치지 않습니다.',
      relatedTables: ['resources', 'reservation_items'],
      sql: `SELECT res.name, COUNT(ri.id) AS booking_count
FROM resources res
LEFT JOIN reservation_items ri ON ri.resource_id = res.id
WHERE res.is_active = 1
GROUP BY res.id, res.name
ORDER BY booking_count DESC;`,
    },
    {
      id: '05_reservation_schedule.intermediate.10',
      title: '시간 겹치는 차단 기간',
      description: '특정 시간대(2026-05-12 13:00 ~ 15:00)와 겹치는 차단 기간을 리소스명(name), 사유(reason), 시작(starts_at)/종료(ends_at) 시각으로 보여 주세요. 시작 시각이 빠른 순으로 정렬합니다.',
      hint: '구간 겹침(overlap) 조건',
      explanation: '두 구간이 겹치는 조건은 A.start <= B.end AND A.end >= B.start 입니다. 일정 충돌 검사에 자주 쓰이는 표현입니다.',
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
      id: '05_reservation_schedule.advanced.01',
      title: '예약 항목과 차단 기간 충돌',
      description: '예약 라인 중 같은 리소스의 차단 기간과 시간이 겹치는 건을 찾아 주세요. 예약 ID(reservation_id), 리소스명(resource_name), 예약 시작/종료(reservation_start, reservation_end), 차단 사유(reason)를 보여 주고 예약 ID 순으로 정렬합니다.',
      hint: '같은 리소스 + 구간 겹침 조인',
      explanation: 'reservation_items 와 blackout_periods 를 resource_id 로 JOIN 한 뒤 start < other_end AND end > other_start 조건으로 시간이 겹치는 행만 남깁니다.',
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
      id: '05_reservation_schedule.advanced.02',
      title: '리소스별 가동 금액 순위',
      description: '리소스별 매출 합계(total_price)와 매출 순위(revenue_rank)를 이름(name)과 함께 보여 주세요. 예약이 없는 리소스는 0원으로 처리하고 순위가 빠른 것부터 정렬합니다.',
      hint: 'LEFT JOIN + RANK() 윈도우',
      explanation: 'COALESCE 로 NULL 합계를 0 으로 바꾼 뒤 RANK() OVER (ORDER BY ...) 로 매출 순위를 매깁니다. 윈도우 함수는 GROUP BY 결과 위에서 동작합니다.',
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
      id: '05_reservation_schedule.advanced.03',
      title: '예약별 사용 시간',
      description: '예약별 총 사용 시간(reserved_hours)을 시간 단위로 계산해 예약 ID(reservation_id)와 함께 보여 주세요. 사용 시간이 긴 예약부터 정렬합니다.',
      hint: '시간 차이(julianday) 합계',
      explanation: 'SQLite 에서는 julianday(end) - julianday(start) 가 일(day) 단위 차이를 돌려주므로 24 를 곱해 시간으로 환산합니다. 라인별 시간을 SUM 으로 합쳐 예약 총 시간을 만듭니다.',
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
      id: '05_reservation_schedule.advanced.04',
      title: '미점검 활성 리소스',
      description: '운영 중이지만 점검 이력이 전혀 없는 리소스의 ID(id)와 이름(name)을 보여 주세요. ID 오름차순으로 정렬합니다.',
      hint: 'LEFT JOIN + IS NULL 안티 조인',
      explanation: '리소스를 점검 이력에 LEFT JOIN 한 뒤 매칭되는 점검이 없는(NULL) 행만 남기는 안티 조인 패턴입니다.',
      relatedTables: ['resources', 'resource_maintenance'],
      sql: `SELECT res.id, res.name
FROM resources res
LEFT JOIN resource_maintenance m ON m.resource_id = res.id
WHERE res.is_active = 1
  AND m.id IS NULL
ORDER BY res.id;`,
    },
    {
      id: '05_reservation_schedule.advanced.05',
      title: '점검 필요 리소스 예약 영향',
      description: '점검 상태가 정상(OK)이 아닌 리소스 각각에 묶인 예약 라인 수(affected_booking_count)를 리소스명(name), 점검 상태(status)와 함께 보여 주세요.',
      hint: '필터 + LEFT JOIN + COUNT',
      explanation: 'resource_maintenance 를 기준으로 정상이 아닌 상태만 추린 뒤 reservation_items 를 LEFT JOIN 해 영향 받을 예약 라인 수를 셉니다.',
      relatedTables: ['resources', 'resource_maintenance', 'reservation_items'],
      sql: `SELECT res.name, m.status, COUNT(ri.id) AS affected_booking_count
FROM resource_maintenance m
JOIN resources res ON res.id = m.resource_id
LEFT JOIN reservation_items ri ON ri.resource_id = res.id
WHERE m.status != 'OK'
GROUP BY res.id, res.name, m.status;`,
    },
    {
      id: '05_reservation_schedule.advanced.06',
      title: '예약 상태별 매출',
      description: '예약 상태(status)별 매출 합계(total_price)를 보여 주세요. 매출이 많은 상태부터 정렬합니다.',
      hint: 'JOIN + 상태 그룹 합계',
      explanation: 'reservations 와 reservation_items 를 JOIN 한 뒤 상태별로 GROUP BY 하여 SUM 으로 합계를 만듭니다.',
      relatedTables: ['reservations', 'reservation_items'],
      sql: `SELECT r.status, SUM(ri.price) AS total_price
FROM reservations r
JOIN reservation_items ri ON ri.reservation_id = r.id
GROUP BY r.status
ORDER BY total_price DESC;`,
    },
    {
      id: '05_reservation_schedule.advanced.07',
      title: '리소스 유형별 평균 예약가',
      description: '리소스 유형(resource_type)별 예약 라인의 평균 가격(avg_price)을 정수로 반올림해서 보여 주세요. 평균이 비싼 유형부터 정렬합니다.',
      hint: 'JOIN + AVG + ROUND',
      explanation: 'AVG 로 평균을 구하고 ROUND(x, 0) 으로 소수점을 정리합니다. 카테고리별 단가 비교에 자주 쓰는 형태입니다.',
      relatedTables: ['resources', 'reservation_items'],
      sql: `SELECT res.resource_type, ROUND(AVG(ri.price), 0) AS avg_price
FROM resources res
JOIN reservation_items ri ON ri.resource_id = res.id
GROUP BY res.resource_type
ORDER BY avg_price DESC;`,
    },
    {
      id: '05_reservation_schedule.advanced.08',
      title: '예약 없는 활성 리소스',
      description: '운영 중이지만 예약 라인이 단 한 건도 없는 리소스의 ID(id)와 이름(name)을 보여 주세요.',
      hint: 'LEFT JOIN + HAVING COUNT=0',
      explanation: 'LEFT JOIN 후 그룹별 COUNT 가 0 인 행을 HAVING 으로 남깁니다. WHERE 와 달리 HAVING 은 집계 결과에 조건을 걸 수 있습니다.',
      relatedTables: ['resources', 'reservation_items'],
      sql: `SELECT res.id, res.name
FROM resources res
LEFT JOIN reservation_items ri ON ri.resource_id = res.id
WHERE res.is_active = 1
GROUP BY res.id, res.name
HAVING COUNT(ri.id) = 0;`,
    },
    {
      id: '05_reservation_schedule.advanced.09',
      title: '고객별 확정 예약 금액',
      description: '확정(CONFIRMED) 예약 기준으로 고객별 결제 합계(confirmed_price)를 이름(name)과 함께 보여 주세요. 금액이 큰 고객부터 정렬합니다.',
      hint: '세 테이블 JOIN + 필터 + SUM',
      explanation: 'customers → reservations → reservation_items 를 차례로 JOIN 한 뒤 확정 상태만 남기고 고객별로 SUM 합계를 만듭니다.',
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
      id: '05_reservation_schedule.advanced.10',
      title: '리소스 운영 상태 종합',
      description: '리소스별 예약 라인 수(booking_count), 차단 기간 수(blackout_count), 가장 최근 점검 상태(latest_maintenance_status)를 이름(name)과 함께 한 줄로 보여 주세요. 예약이 많은 리소스부터 정렬합니다.',
      hint: '여러 테이블 LEFT JOIN + DISTINCT COUNT',
      explanation: '한 리소스에 여러 자식 테이블을 LEFT JOIN 하면 카티시안 곱 때문에 행이 부풀므로 COUNT(DISTINCT ...) 로 중복을 제거해야 정확한 개수가 나옵니다.',
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
