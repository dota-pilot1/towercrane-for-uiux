# 03. 10개 SQL 연습 파일 커리큘럼

## 전체 구성

| No | 파일 | 난이도 | 주제 |
|---:|---|---|---|
| 1 | `01_board_basic.sql` | beginner | 게시판, 댓글, 좋아요 |
| 2 | `02_shop_order.sql` | beginner | 쇼핑몰 주문, 상품, 결제 |
| 3 | `03_hr_attendance.sql` | beginner | 직원, 부서, 근태 |
| 4 | `04_project_task.sql` | basic | SI 프로젝트, 업무, 담당자 |
| 5 | `05_reservation_schedule.sql` | basic | 예약, 일정, 리소스 배정 |
| 6 | `06_support_ticket.sql` | basic | 고객 문의, 처리 이력 |
| 7 | `07_sales_crm.sql` | intermediate | 영업, 고객, 상담, 계약 |
| 8 | `08_analytics_event.sql` | intermediate | 로그, 이벤트, 방문 분석 |
| 9 | `09_finance_reconciliation.sql` | advanced | 정산, 결제, 환불, 미수금 |
| 10 | `10_inventory_supply_chain.sql` | advanced | 재고, 입출고, 발주, 공급망 |

## 작성 기준

- 테이블 5~8개
- 핵심 테이블 10~80행
- SQLite 문법만 사용
- 외래키 관계를 명확히 둔다
- 실무 컬럼명을 사용한다
- 한국어 샘플 데이터를 섞는다
- 모든 파일 상단에 `-- @key value` 메타를 둔다

## 파일별 테이블

### `01_board_basic.sql`

테이블:

- `users`
- `profiles`
- `boards`
- `posts`
- `comments`
- `likes`

연습:

- 기본 조회
- 게시글/댓글 JOIN
- 사용자별 게시글 수
- 댓글 많은 게시글
- 좋아요 랭킹

### `02_shop_order.sql`

테이블:

- `customers`
- `products`
- `orders`
- `order_items`
- `payments`
- `shipments`

연습:

- 주문 상세 조회
- 주문 합계
- 상품별 매출
- 결제 상태별 집계
- 배송 지연 조회

### `03_hr_attendance.sql`

테이블:

- `departments`
- `employees`
- `attendance_logs`
- `leave_requests`
- `work_schedules`

연습:

- 부서별 인원
- 월별 근태 집계
- 지각/결근 조회
- 휴가 승인 상태

### `04_project_task.sql`

테이블:

- `clients`
- `projects`
- `members`
- `project_members`
- `tasks`
- `task_comments`
- `task_logs`

연습:

- 프로젝트별 진행률
- 담당자별 업무량
- 지연 업무
- 상태 변경 이력
- SI 관리자 화면형 집계

### `05_reservation_schedule.sql`

테이블:

- `resources`
- `customers`
- `reservations`
- `reservation_items`
- `blackout_periods`
- `resource_maintenance`

연습:

- 기간 겹침
- 예약 가능 리소스
- 취소율
- 유지보수 기간 제외

### `06_support_ticket.sql`

테이블:

- `customers`
- `agents`
- `tickets`
- `ticket_messages`
- `ticket_status_logs`
- `ticket_tags`

연습:

- 최신 상태 조회
- 평균 처리 시간
- 담당자별 처리량
- 태그별 문의량

### `07_sales_crm.sql`

테이블:

- `accounts`
- `contacts`
- `sales_reps`
- `leads`
- `opportunities`
- `activities`
- `contracts`

연습:

- 영업 퍼널
- 전환율
- 담당자 랭킹
- 계약 예정 금액

### `08_analytics_event.sql`

테이블:

- `users`
- `sessions`
- `events`
- `pages`
- `campaigns`
- `devices`

연습:

- 일자별 방문자
- 이벤트 전환
- 캠페인별 성과
- 재방문 사용자

### `09_finance_reconciliation.sql`

테이블:

- `merchants`
- `orders`
- `payments`
- `refunds`
- `settlements`
- `fees`
- `receivables`

연습:

- 결제/환불/정산 매칭
- 미정산 금액
- 수수료 계산
- 월별 차액 탐지
- CTE 기반 검증 쿼리

### `10_inventory_supply_chain.sql`

테이블:

- `warehouses`
- `suppliers`
- `products`
- `stock_movements`
- `purchase_orders`
- `purchase_order_items`
- `stock_snapshots`

연습:

- 현재 재고
- 누적 입출고
- 안전재고 미달
- 발주 리드타임
- 윈도우 함수 기반 누적 계산

## 난이도 흐름

```text
beginner:
SELECT / WHERE / ORDER BY / LIMIT / 기본 JOIN

basic:
다중 JOIN / GROUP BY / HAVING / CASE / 날짜 조건

intermediate:
서브쿼리 / 최신 이력 조회 / 집계 리포트 / 퍼널 분석

advanced:
CTE / 윈도우 함수 / 누적 집계 / 차이 검출 / 운영 데이터 검증
```

