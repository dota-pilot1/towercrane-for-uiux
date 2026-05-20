# SQL 연습장(유저) 구현 계획

## 결론

1차 MVP에서는 sqlite 파일 업로드를 열지 않는다.

대신 `SQL 연습장(유저)` 전용 기본 DB를 하나 제공하고, 유저들이 그 DB의 테이블 설계와 문제를 직접 만들고 공유할 수 있게 한다.

파일을 여러 개 업로드하고 문제를 파일별로 매핑하는 구조는 이후 확장으로 미룬다. 공식 연습장처럼 파일, 예제, ERD가 코드에 고정된 구조는 정적 콘텐츠에는 맞지만, 유저가 직접 출제하는 영역에는 유지보수 부담이 크다.

기본 DB 주제는 `커머스 운영 DB`로 잡는다. 고객, 상품, 주문, 결제, 배송, 재고, 리뷰처럼 의미가 명확하고 보편적인 테이블을 제공하면 초보자도 이해하기 쉽고, 난이도가 올라갈수록 JOIN, 집계, 서브쿼리, 윈도우 함수 문제로 자연스럽게 확장할 수 있다.

추후 유저나 관리자가 sqlite 파일 자체를 교체하는 기능은 고려한다. 사용자 경험상으로는 현재 연습장 파일을 `덮어쓰기/교체`하는 기능이 맞다. 다만 내부 데이터는 기존 문제와 제출 기록을 보호하기 위해 새 schema version으로 보존한다. 즉 화면에서는 새 파일이 현재 활성 DB가 되고, 기존 문제와 제출 기록은 이전 schema version에 그대로 남긴다.

## 왜 파일 업로드를 미루는가

- sqlite 파일 업로드를 허용하면 파일 검증, 저장, 버전 관리, 삭제, 권한, 악성/대용량 파일 방어가 필요하다.
- 여러 파일을 허용하면 문제와 DB 파일의 매핑, ERD 매핑, 채점 기준 매핑이 급격히 복잡해진다.
- 유저가 만든 문제는 특정 테이블 구조에 강하게 의존하므로, 파일이 여러 개면 문제 재사용성과 탐색 UX가 흔들린다.
- MVP 목표는 “유저가 문제를 만들고 다른 유저가 풀 수 있는가”를 검증하는 것이므로 파일 업로드는 핵심 검증 대상이 아니다.

## 기본 DB 주제

### 주제

`커머스 운영 DB`

### 선택 이유

- 도메인 의미가 명확해서 유저가 테이블을 이해하기 쉽다.
- SQL 연습의 핵심 패턴을 거의 모두 만들 수 있다.
- 공식 연습장의 쇼핑몰 주문 예제와 이어져 학습 흐름이 자연스럽다.
- 유저가 문제를 출제할 때도 업무 상황을 떠올리기 쉽다.

### 기본 테이블 후보

```text
customers
categories
products
orders
order_items
payments
shipments
inventory
reviews
coupons
coupon_redemptions
```

### 관계 초안

```text
customers 1:N orders
orders 1:N order_items
products 1:N order_items
categories 1:N products
orders 1:N payments
orders 1:1 shipments
products 1:1 inventory
customers 1:N reviews
products 1:N reviews
coupons 1:N coupon_redemptions
orders 1:N coupon_redemptions
```

### 문제 예시

```text
Level 1
- 최근 주문부터 보기
- 품절 상품 찾기
- 특정 고객 주문 목록 조회

Level 2
- 카테고리별 평균 상품 가격
- 주문 상태별 주문 건수
- 결제 수단별 총 결제액

Level 3
- 고객별 총 구매액
- 상품별 판매 수량
- 배송 지연 주문 찾기

Level 4
- 월별 매출과 전월 대비 증감률
- 재구매 고객 찾기
- 쿠폰 사용 주문과 미사용 주문의 평균 결제액 비교

Level 5
- VIP 고객 세그먼트 만들기
- 상품별 매출, 리뷰 평점, 재고를 함께 분석하기
- 재고 부족 가능성이 높은 상품 찾기
```

## MVP 범위

### 제공할 것

- `SQL 연습장(유저)` 전용 커머스 기본 DB 1개
- 오른쪽 사이드바에서 테이블 목록, 컬럼, ERD 확인
- 관리자 또는 권한 있는 유저가 테이블 설계를 수정할 수 있는 기능
- 왼쪽 사이드바에서 유저가 문제 추가/수정/삭제
- 문제 난이도 분류
- 문제 공개 상태
- 문제 풀이 및 제출 기록

### 제공하지 않을 것

- sqlite 파일 직접 업로드
- 사용자별 여러 DB 파일 관리
- 파일별 ERD 업로드
- 파일별 문제 묶음/버전 관리
- 복잡한 자동 채점 규칙 편집기

### 추후 고려할 것

- 관리자 또는 권한 있는 유저의 sqlite 파일 교체
- 파일 교체 시 새 schema version 자동 생성
- 교체된 파일의 테이블/컬럼/샘플 데이터 검증
- 기존 문제를 새 schema version으로 복제하는 호환성 확인 기능

## 권장 UX

### 오른쪽 사이드바

- DB 이름: `user-practice.sqlite`
- 테이블 목록
- 테이블 상세 보기
- ERD 보기
- 테이블 설계 관리 버튼

테이블 설계 관리는 별도 다이얼로그 또는 전체 화면 편집기로 뺀다. 일반 풀이 화면의 사이드바 안에서 직접 DDL을 편집하게 만들면 화면이 복잡해진다.

### 왼쪽 사이드바

- 문제 목록
- 난이도 필터
- 문제 추가 버튼
- 내가 만든 문제 / 전체 문제 필터

문제 추가는 사이드바 안에서 바로 입력하지 말고 중앙 패널 또는 다이얼로그에서 작성하게 한다.

## 난이도 체계

초/중/고보다 `1~5` 레벨을 권장한다.

- Level 1: 단일 테이블 SELECT, WHERE, ORDER BY
- Level 2: GROUP BY, 집계, HAVING
- Level 3: JOIN, 서브쿼리
- Level 4: 윈도우 함수, CTE, 복합 조건
- Level 5: 실무형 분석 쿼리, 성능/정합성 고려

초/중/고는 직관적이지만 문제 수가 늘면 분류가 뭉개진다. 1~5는 정렬, 필터, 점수화, 랭킹에 더 유리하다.

## 데이터 모델 초안

```text
sql_user_practice_schemas
- id
- title
- description
- schema_sql
- erd_mmd
- db_file_path
- db_file_hash
- source_type
- replaced_from_schema_id
- version
- created_by
- is_active
- created_at
- updated_at

sql_user_practice_problems
- id
- schema_id
- title
- description
- level
- target_tables
- starter_sql
- answer_sql
- explanation
- created_by
- visibility
- status
- created_at
- updated_at

sql_user_practice_submissions
- id
- problem_id
- user_id
- submitted_sql
- is_correct
- score
- feedback
- created_at
```

## 테이블 설계 변경 정책

테이블 설계는 자유 편집보다 버전 방식으로 관리한다.

- 현재 활성 스키마는 하나만 둔다.
- 테이블 구조를 바꾸면 새 schema version을 만든다.
- 기존 문제는 기존 schema version에 묶어둔다.
- 새 문제는 현재 활성 schema version에 연결한다.
- sqlite 파일 자체를 교체하는 경우 화면에서는 현재 파일을 덮어쓴 것처럼 보이게 한다.
- 내부적으로는 기존 version을 보존하고 새 schema version을 활성화한다.
- 기존 제출 기록은 재채점하거나 이동하지 않는다.

이렇게 해야 테이블 설계가 바뀌어도 예전 문제가 깨지는 것을 막을 수 있다.

## 구현 순서

1. `SQL 연습장(유저)` 페이지를 공식 연습장 UI와 최대한 공유하도록 분리한다.
2. 유저 연습장 전용 기본 seed DB를 추가한다.
3. 유저 문제 CRUD API를 만든다.
4. 왼쪽 사이드바 문제 목록을 DB 기반으로 전환한다.
5. 문제 추가/수정 다이얼로그를 만든다.
6. 제출 저장과 기본 정답 비교를 붙인다.
7. 테이블 설계 관리 기능은 2차로 붙인다.
8. ERD는 우선 schema 기준 자동 생성 또는 Mermaid 직접 입력 중 하나로 시작한다.

## 이후 확장

- sqlite 파일 업로드
- sqlite 파일 교체를 통한 새 schema version 발행
- 연습장 여러 개 만들기
- 유저가 만든 연습장 공개/비공개 전환
- ERD 이미지/mermaid 업로드
- 문제 신고/검수
- 공식 문제로 승격
