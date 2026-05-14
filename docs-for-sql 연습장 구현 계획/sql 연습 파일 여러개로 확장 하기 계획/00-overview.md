# 00. 전체 확장 방향

## 결론

연습 SQL 파일 여러 개를 미리 준비하고, 사용자가 다이얼로그에서 하나를 선택하는 방식이 가장 합리적이다.

사용 시나리오:

1. `/sql` 페이지 오른쪽 `테이블 정보` 헤더에 톱니바퀴 버튼을 둔다.
2. 톱니바퀴를 누르면 `SQL 연습 파일 관리` 다이얼로그가 열린다.
3. 다이얼로그에는 기본 제공 seed와 업로드 seed가 함께 표시된다.
4. 사용자가 하나를 선택하면 해당 seed 기준으로 연습 DB를 새로 만든다.
5. 오른쪽 테이블 목록은 선택된 seed의 테이블로 갱신된다.

## 왜 파일 여러 개가 필요한가

`seed.sql` 하나는 MVP에는 적합하지만, SQL 초보자에서 중급자 이상으로 올라가는 학습에는 도메인별 데이터셋이 필요하다.

특히 SI 프로젝트에서는 다음 유형의 쿼리가 반복된다.

- 게시판/댓글/좋아요
- 쇼핑몰 주문/결제/배송
- 직원/부서/근태
- 프로젝트/업무/담당자
- 예약/일정/리소스
- 고객 문의/처리 이력
- 영업/CRM
- 로그/이벤트 분석
- 정산/환불/미수금
- 재고/입출고/발주

이 주제들을 각각 독립 seed 파일로 두면 학습 흐름과 실무 감각이 모두 좋아진다.

## 핵심 정책

| 항목 | 결정 |
|---|---|
| seed 선택 단위 | `.sql` 파일 하나 |
| 선택 시 동작 | `practice.sqlite` clean rebuild |
| 파일별 DB 상태 보존 | 1차 제외 |
| 기본 seed 위치 | `src/sql-practice/seeds/*.sql` |
| 업로드 seed 위치 | `data/sql-practice/seeds/*.sql` |
| 활성 seed 기록 | `data/sql-practice/active-seed.json` |
| seed 메타 | SQL 파일 상단 주석 |
| seed 목록 조회 | 로그인 사용자 가능 |
| seed 활성화 | admin 권장 |
| seed 업로드 | admin 필수 |

## SQL 파일 메타 형식

```sql
-- @title 쇼핑몰 주문/결제 세트
-- @slug shop-order
-- @level beginner
-- @description 상품, 주문, 주문상품, 결제, 배송 테이블로 JOIN과 집계를 연습합니다.
-- @topics JOIN, GROUP BY, SUM, HAVING, CASE
-- @tables customers, products, orders, order_items, payments, shipments
-- @recommendedQueries SELECT * FROM orders LIMIT 10; | SELECT p.name, SUM(oi.quantity) FROM products p JOIN order_items oi ON oi.product_id = p.id GROUP BY p.id;
```

파싱 규칙:

- `-- @key value` 형태만 읽는다.
- `topics`, `tables`, `recommendedQueries`는 쉼표 또는 `|`로 배열화한다.
- 메타가 빠진 파일은 파일명 기반 fallback을 제공한다.

## 데이터 보존 기준

메인 DB:

```text
data/towercrane-catalog.sqlite
```

연습 DB:

```text
data/sql-practice/runtime/practice.sqlite
```

업로드 seed:

```text
data/sql-practice/seeds/*.sql
```

메인 DB와 연습 DB는 계속 분리한다. 사용자가 입력한 SQL은 절대 메인 DB 연결에 실행하지 않는다.

