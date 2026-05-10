# 05. 단계별 구현 체크리스트

## Phase 0. 기준 확인

- [x] 현재 프로젝트의 `docs-for-업무 관리 구현 계획` 형식 확인
- [x] 팔란티어 원본 `/api-doc` 파일 확인
- [x] towercrane의 API base URL이 `/api`를 포함한다는 점 확인
- [x] raw Tailwind 팔레트 금지 규칙 확인

## Phase 1. DB 스키마/DDL

수정 파일:

```text
towercrane-for-uiux-server/src/database/schema.ts
towercrane-for-uiux-server/src/database/database.service.ts
```

작업:

- [x] `ApiDocHttpMethod`, `ApiDocBlockType` 타입 추가
- [x] `apiDocCategoriesTable` 추가
- [x] `apiDocEndpointsTable` 추가
- [x] `apiDocBlocksTable` 추가
- [x] `schema` 객체에 신규 테이블 추가
- [x] `$inferSelect`, `$inferInsert` type export 추가
- [x] `database.service.ts` DDL 추가
- [x] 관련 index 추가

## Phase 2. DB 메뉴 추가

수정 파일:

```text
towercrane-for-uiux-server/src/database/database.service.ts
```

작업:

- [x] 초기 메뉴 seed에 `API 문서` 추가
- [x] 기존 DB에 `section_id = 'api_doc'`가 없으면 추가
- [x] `업무 관리` 다음, `Admin` 이전 순서로 배치

## Phase 3. Nest API

새 파일:

```text
towercrane-for-uiux-server/src/api-doc/api-doc.module.ts
towercrane-for-uiux-server/src/api-doc/api-doc.controller.ts
towercrane-for-uiux-server/src/api-doc/api-doc.service.ts
towercrane-for-uiux-server/src/api-doc/api-doc.schemas.ts
```

수정 파일:

```text
towercrane-for-uiux-server/src/app.module.ts
```

작업:

- [x] `ApiDocModule` 작성
- [x] `AppModule`에 등록
- [x] 카테고리 CRUD API
- [x] 엔드포인트 CRUD API
- [x] 카테고리/엔드포인트 reorder API
- [x] 블록 조회/저장 API
- [x] 조회는 로그인, 편집은 admin으로 제한

## Phase 4. 프론트 타입/API/hook

새 파일:

```text
towercrane-for-uiux-front/src/entities/api-doc/model/types.ts
towercrane-for-uiux-front/src/entities/api-doc/api/api-doc-api.ts
towercrane-for-uiux-front/src/features/api-doc/model/use-api-doc-queries.ts
towercrane-for-uiux-front/src/features/api-doc/model/api-env-store.ts
```

작업:

- [x] 타입 정의
- [x] API wrapper 작성
- [x] Query/mutation hook 작성
- [x] 환경 변수 store 작성
- [x] `/api` 중복 경로 없음 확인

## Phase 5. 프론트 UI

새 파일:

```text
towercrane-for-uiux-front/src/pages/api-doc/ui/api-doc-page.tsx
towercrane-for-uiux-front/src/features/api-doc/ui/api-tester-panel.tsx
```

수정 파일:

```text
towercrane-for-uiux-front/src/app/App.tsx
```

작업:

- [x] 3열 API 문서 페이지 작성
- [x] 카테고리 추가/수정/삭제/정렬
- [x] 엔드포인트 추가/수정/삭제/정렬
- [x] 요청 편집 패널 작성
- [x] Params / Headers / Body 탭
- [x] Send 실행과 Response 표시
- [x] 환경 변수 선택/편집 모달
- [x] 저장/초기화 동작
- [x] 일반 사용자 읽기 전용 처리
- [x] `activeSection === 'api_doc'` 연결

## Phase 6. 검증

- [x] 서버 TypeScript build
- [x] 프론트 TypeScript build
- [x] raw Tailwind 금지 패턴 신규 파일 검사
- [x] API 경로 `/api/api-doc` 중복 없음 확인
- [x] 메뉴 seed가 기존 DB에도 적용되는지 확인
