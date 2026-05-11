# 03. SQL 세트 번호 식별성 개선안

이 문서는 2차 확장용이다. 1차 구현은 `05-single-seed-file-decision.md` 결정에 따라 `seed.sql` 파일 하나와 runtime DB 하나로 진행하고, 세트 선택 UI는 만들지 않는다.

## 문제

참조 화면의 우측 사이드바는 `1`, `2`, `3` 같은 숫자 버튼만 보여준다.

문제점:

- 어떤 SQL 파일인지 알 수 없다.
- 어떤 테이블이 들어 있는지 누르기 전에는 알 수 없다.
- 학습 난이도나 주제를 비교할 수 없다.
- 세트가 10개 이상으로 늘면 관리가 어려워진다.
- URL이나 history에 `set=3`만 남으면 나중에 의미를 추적하기 어렵다.

## 권장 해결책

숫자 기반 선택을 버리고 `sets.json` 메타데이터 기반 선택으로 바꾼다.

핵심:

- 내부 id: `boards-basic`
- 표시명: `게시판 기본`
- 짧은 표시명: `게시판`
- 설명: `users, posts, comments 중심 JOIN 연습`
- 난이도: `입문`
- 태그: `JOIN`, `GROUP BY`, `집계`
- SQL 파일: `boards-basic/schema.sql`, `boards-basic/data.sql`

## `sets.json` 구조

파일:

```text
towercrane-for-uiux-server/src/sql-practice/seeds/sets.json
```

예시:

```json
[
  {
    "id": "boards-basic",
    "label": "게시판 기본",
    "shortLabel": "게시판",
    "description": "회원, 게시판, 게시글, 댓글, 좋아요로 JOIN과 집계를 연습합니다.",
    "difficulty": "입문",
    "schemaFile": "boards-basic/schema.sql",
    "dataFile": "boards-basic/data.sql",
    "tags": ["JOIN", "GROUP BY", "COUNT"],
    "tableNames": ["users", "profiles", "boards", "posts", "comments", "likes"],
    "sampleQuery": "SELECT * FROM users LIMIT 10;"
  },
  {
    "id": "shop-orders",
    "label": "쇼핑몰 주문",
    "shortLabel": "쇼핑몰",
    "description": "상품, 고객, 주문, 주문상세, 리뷰, 쿠폰으로 주문 집계를 연습합니다.",
    "difficulty": "초급",
    "schemaFile": "shop-orders/schema.sql",
    "dataFile": "shop-orders/data.sql",
    "tags": ["N:M", "SUM", "ORDER BY"],
    "tableNames": ["categories", "products", "customers", "orders", "order_items", "reviews", "coupons", "customer_coupons"],
    "sampleQuery": "SELECT * FROM orders LIMIT 10;"
  }
]
```

## 우측 사이드바 UI

### 현재 참조 방식

```text
SET
[1] [2] [3] [4] [5]
[6] [7] [8] [9] [10]
```

### 개선 방식

```text
SQL 세트

게시판 기본      입문
6 tables         JOIN / GROUP BY

쇼핑몰 주문      초급
8 tables         SUM / 주문집계
```

선택된 세트:

- `border-brand-border`
- `bg-brand-glass`
- `text-brand-primary`

비활성 세트:

- `border-surface-border-soft`
- `bg-surface-muted`
- `text-text-secondary`

## compact 모드

사이드바 폭이 좁거나 세트가 많을 때는 select 또는 searchable popover가 낫다.

예시:

```text
[게시판 기본 v]
입문 · users/posts/comments · 6 tables
```

1차에서는 별도 popover 라이브러리 없이 다음 중 하나를 선택한다.

| 방식 | 장점 | 단점 | 권장 |
|---|---|---|---|
| 카드 리스트 | 정보가 잘 보임 | 세트가 많으면 길어짐 | 1차 기본 |
| select | 구현이 빠름 | tags/설명이 덜 보임 | mobile fallback |
| 검색형 popover | 확장성 좋음 | 구현량 증가 | 후순위 |

## URL 상태

숫자 대신 slug를 쓴다.

```text
/sql?set=boards-basic
/sql?set=shop-orders
```

장점:

- 공유 URL만 봐도 세트 의미가 드러난다.
- 세트 순서가 바뀌어도 기존 링크가 깨지지 않는다.
- `sets.json`에서 label만 바꿔도 URL 안정성이 유지된다.

## API 변경점

참조 프로젝트:

```text
GET /api/sql/tables?set=1
POST /api/sql/execute?set=1
```

현재 프로젝트 권장:

```text
GET /api/sql/tables?set=boards-basic
POST /api/sql/execute?set=boards-basic
```

호환이 필요하면 서버에서 숫자 alias를 지원할 수 있다.

예:

```json
{
  "id": "boards-basic",
  "legacyNumber": 1,
  "label": "게시판 기본"
}
```

하지만 신규 구현만 고려하면 legacy alias는 없어도 된다.

## 세트 변경 UX

세트 변경 시 처리:

1. active set 변경
2. URL search `set` 갱신
3. localStorage에 마지막 세트 저장
4. 기존 history clear
5. tables query refetch
6. selected table은 첫 번째 테이블로 자동 지정

history clear 안내:

- 세트가 바뀌면 이전 결과는 다른 DB 기준이므로 지우는 편이 안전하다.
- 필요하면 "이전 세트 결과 보기"는 후순위로 local history에 저장한다.

## 세트 요약 영역

우측 사이드바에 활성 세트 정보를 항상 노출한다.

표시:

- label
- description
- difficulty
- tags
- schema file
- data file
- table count
- reset 버튼

예:

```text
게시판 기본
회원/게시글/댓글로 JOIN과 집계를 연습합니다.

입문 · 6 tables
JOIN  GROUP BY  COUNT

schema: boards-basic/schema.sql
data: boards-basic/data.sql
```

## 확장 고려

나중에 SQL 학습 커리큘럼까지 붙이면 `sets.json`에 아래 필드를 추가할 수 있다.

```json
{
  "objectives": [
    "LEFT JOIN으로 댓글 수 계산",
    "GROUP BY로 사용자별 게시글 수 집계"
  ],
  "recommendedQueries": [
    "SELECT city, COUNT(*) FROM users GROUP BY city;"
  ],
  "expectedTables": 6
}
```

1차 구현에서는 과하게 넓히지 않고 `label`, `description`, `difficulty`, `tags`, `sampleQuery`까지만 사용한다.
