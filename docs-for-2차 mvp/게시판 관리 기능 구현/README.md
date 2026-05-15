# 게시판 관리 기능 구현 계획

RestaurantBook의 `BoardConfig + Board + BoardComment` 구조를 참고하되, 이 프로젝트의 NestJS/Drizzle/SQLite/Vite 구조에 맞춰 다시 설계한다.

## 결론

게시판을 `notice`, `inquiry` 같은 하드코딩된 타입으로만 두는 것보다, **게시판 자체를 데이터로 추가/수정/비활성화하는 방식**이 확장성에서 낫다.

이유:

- 공지, 문의, FAQ, 채용, 이벤트처럼 게시판이 늘어나도 게시글 테이블과 화면을 재사용할 수 있다.
- 작성 허용, 댓글 허용, 활성 여부, 정렬 순서 같은 정책이 `board_configs` 한 곳에 모인다.
- 관리자 화면에서 새 게시판을 만들 수 있어 다음 MVP에서 메뉴/권한/노출 정책만 붙이면 된다.
- RestaurantBook에서 이미 검증한 관리 UX와 API 형태를 이 프로젝트에 맞게 축소 이식할 수 있다.

## 설계 원칙

- `board_configs`: 게시판 정의와 정책
- `boards`: 게시글
- `board_comments`: 댓글/관리자 답변
- MVP 기본 시드: `notice`, `inquiry`
- 사용자 라우트는 로그인 필요
- 관리자 라우트는 `role === 'admin'` 필요
- 첨부파일은 이번 범위에서 제외하고, 필요하면 기존 `upload` 모듈을 재사용한다.
- 본문 저장은 일단 plain text/markdown 스타일 문자열로 시작하고, Lexical JSON 전환은 별도 단계로 분리한다.

## 문서 구성

1. [00-개요-결정사항.md](./00-개요-결정사항.md)
2. [01-백엔드-DB-마이그레이션-계획.md](./01-백엔드-DB-마이그레이션-계획.md)
3. [02-백엔드-API-서비스-계획.md](./02-백엔드-API-서비스-계획.md)
4. [03-프론트엔드-데이터-라우팅-계획.md](./03-프론트엔드-데이터-라우팅-계획.md)
5. [04-프론트엔드-UI-관리화면-계획.md](./04-프론트엔드-UI-관리화면-계획.md)
6. [05-단계별-파일-체크리스트.md](./05-단계별-파일-체크리스트.md)

## RestaurantBook 참고 파일

- `/Users/terecal/RestaurantBook/docs-for-필수 기능 개발-2차 mvp/게시판 관리 기능 구현 계획/`
- `/Users/terecal/RestaurantBook/restaurant-book-server/src/main/java/com/cj/restaurantbook/board/`
- `/Users/terecal/RestaurantBook/restaurant-book-front/src/entities/board/`
- `/Users/terecal/RestaurantBook/restaurant-book-front/src/features/board-admin/`
- `/Users/terecal/RestaurantBook/restaurant-book-front/src/features/board-customer/`

