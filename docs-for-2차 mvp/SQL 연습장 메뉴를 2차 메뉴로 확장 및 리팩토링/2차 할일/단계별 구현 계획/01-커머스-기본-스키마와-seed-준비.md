# 1단계 - 커머스 기본 스키마와 seed 준비

## 목표

`SQL 연습장(유저)`가 사용할 기본 커머스 운영 DB를 만든다.

공식 연습장처럼 여러 seed를 선택하는 구조가 아니라, 유저 연습장 전용 기본 스키마 하나를 먼저 제공한다.

## 기본 테이블

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

## 설계 기준

- 테이블명과 컬럼명은 직관적인 영어로 둔다.
- 초보 문제를 위해 단일 테이블만으로도 의미 있는 조회가 가능해야 한다.
- 중급 이상 문제를 위해 주문, 결제, 배송, 재고, 리뷰가 서로 연결되어야 한다.
- 날짜 컬럼을 충분히 넣어 정렬, 기간 필터, 월별 집계 문제를 만들 수 있게 한다.
- 상태 컬럼을 넣어 `WHERE`, `GROUP BY`, 조건부 집계 문제를 만들 수 있게 한다.

## 산출물

- 유저 연습장용 seed SQL
- 유저 연습장용 Mermaid ERD
- 테이블별 샘플 데이터
- 서버에서 이 seed를 runtime sqlite DB로 빌드하는 로직

## 완료 기준

- 오른쪽 사이드바에서 모든 테이블과 컬럼이 보인다.
- ERD가 정상 렌더링된다.
- `SELECT`, `JOIN`, `GROUP BY` 예시 쿼리가 정상 실행된다.
