# SQL 연습장 예제 별도 페이지 + ERD 구현 계획

## 목표

현재 SQL 연습장의 11개 기본 seed 파일마다 초보, 중수, 고수 예제를 각 10개씩 제공한다.
예제 화면은 기존 파일 관리 다이얼로그와 분리된 별도 페이지로 만들고, 같은 화면에서 현재 seed의 ERD를 함께 볼 수 있게 한다.

대상 seed:

- `01_board_basic.sql`
- `02_shop_order.sql`
- `03_hr_attendance.sql`
- `04_project_task.sql`
- `05_reservation_schedule.sql`
- `06_support_ticket.sql`
- `07_sales_crm.sql`
- `08_analytics_event.sql`
- `09_finance_reconciliation.sql`
- `10_inventory_supply_chain.sql`
- `11_join_special.sql`

총 문제 수는 `11개 seed x 3개 난이도 x 10개 = 330개`다.

## 추천 UX

예제 버튼은 SQL 연습장 오른쪽 사이드바의 진입점으로 유지하되, 클릭 시 다이얼로그가 아니라 전용 페이지로 이동한다.

추천 라우트:

- `/sql/examples`

탭 구성:

- `ERD`
- `초보`
- `중수`
- `고수`

탭 순서는 ERD를 먼저 둔다. 사용자가 현재 DB 구조를 확인한 뒤 문제를 푸는 흐름이 자연스럽다.

화면 구성:

- 상단: 현재 seed 이름, 설명, 테이블 수, seed 변경/SQL 연습장으로 돌아가기 버튼
- 좌측: 현재 탭의 문제 10개 리스트
- 우측: 선택한 문제 상세
- ERD 탭: 현재 seed의 Mermaid ERD 전체 표시
- 문제 상세: 문제 설명, 관련 테이블, 힌트, 정답 보기, 정답 SQL, 해설, 입력창에 넣기

## 데이터 모델

초기 구현은 프론트 정적 데이터로 시작한다. 서버 API까지 바로 만들면 330개 문제 작성 전에 구조가 무거워진다.

파일 위치 추천:

- `towercrane-for-uiux-front/src/entities/sql-practice/model/example-types.ts`
- `towercrane-for-uiux-front/src/features/sql-practice/model/sql-practice-examples.ts`

타입 초안:

```ts
export type SqlExampleLevel = 'beginner' | 'intermediate' | 'advanced'

export type SqlPracticeExample = {
  id: string
  seedFile: string
  level: SqlExampleLevel
  order: number
  title: string
  description: string
  relatedTables: string[]
  hint: string
  answerSql: string
  explanation: string
}

export type SqlPracticeExampleSet = {
  seedFile: string
  beginner: SqlPracticeExample[]
  intermediate: SqlPracticeExample[]
  advanced: SqlPracticeExample[]
}
```

ID 규칙:

- `02_shop_order.beginner.01`
- `02_shop_order.intermediate.04`
- `11_join_special.advanced.10`

## 구현 단계

1. `SqlExamplesDialog`를 제거하거나 라우팅 진입 안내용으로 축소한다.
2. `SqlSchemaSidebar`의 `예제` 버튼을 `/sql/examples` 이동 버튼으로 바꾼다.
3. 라우터에 `/sql/examples` 페이지를 추가한다.
4. `SqlPracticeExamplesPage`를 만든다.
5. 현재 활성 seed는 기존 `useSqlPracticeTables`, `useSqlPracticeSeeds`, `useSqlPracticeErd` 흐름을 재사용한다.
6. `ERD` 탭에서는 기존 `SqlErdView`를 재사용한다.
7. `초보/중수/고수` 탭에서는 현재 seed에 맞는 문제 10개만 필터링한다.
8. 문제 상세의 `정답 보기` 상태는 문제별 local state로 관리한다.
9. `입력창에 넣기`는 2차 구현으로 둔다. 현재 SQL 입력 상태가 page-local이면 공유 store 또는 URL state가 필요하다.
10. 11개 seed 전체에 대해 330개 예제를 채운다.

## 난이도 기준

초보:

- 단일 테이블 조회
- `SELECT`, `WHERE`, `ORDER BY`, `LIMIT`
- 기본 집계 `COUNT`, `SUM`, `AVG`
- 단순 `GROUP BY`

중수:

- 2~3개 테이블 `JOIN`
- 그룹 집계와 `HAVING`
- 날짜/상태/카테고리 조건 조합
- `CASE` 기반 분류

고수:

- 다중 JOIN
- 서브쿼리 또는 CTE
- 누락/불일치 데이터 찾기
- 랭킹, 비율, 기간 비교, 재고/정산/퍼널 분석

## 파일별 예제 작성 전략

각 seed마다 먼저 ERD와 테이블 의미를 요약한 뒤 문제를 만든다.

권장 순서:

1. seed SQL의 테이블 목록과 컬럼을 읽는다.
2. ERD에서 FK 관계를 확인한다.
3. 초보 10개는 테이블별 기본 조회와 단일 집계로 만든다.
4. 중수 10개는 핵심 FK 관계 중심으로 만든다.
5. 고수 10개는 실무 질문 형태로 만든다.
6. 모든 정답 SQL은 실제 `practice.sqlite`에서 실행 가능한 SQLite 문법으로 검증한다.

## 검증

필수:

- `npm run typecheck`
- `npm run build`
- 각 seed별 예제 SQL 최소 1회 실행 검증

권장:

- `/sql/examples` 데스크톱 화면 확인
- 모바일 폭에서 탭, 문제 리스트, 정답 SQL overflow 확인
- ERD 탭에서 11개 seed 전부 렌더링 확인

## 1차 범위

1차 PR에서는 전체 330문제를 한 번에 채우지 않는다.

권장 1차 범위:

- 별도 페이지 라우팅
- 4탭 UI
- 현재 seed의 ERD 탭
- `02_shop_order.sql` 기준 초보/중수/고수 각 2개 샘플
- 데이터 구조 확정

그 다음 seed별 문제 데이터는 별도 커밋으로 쌓는다.
