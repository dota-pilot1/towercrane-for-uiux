# Postman형 API 문서/테스터 구현 계획 개요

## 목표

`/Users/terecal/mapo-palantier-project`의 `/api-doc` 기능을 참고해 `towercrane-for-uiux`에 API 문서 저장과 요청 테스트를 함께 하는 화면을 구현한다.

원본 기능은 Postman을 간단히 흉내 낸 구조다. 왼쪽에는 API 문서 카테고리와 엔드포인트 목록이 있고, 오른쪽에는 HTTP method, URL, Params, Headers, Body, Response 패널이 있다.

`towercrane-for-uiux`에는 이미 DB 기반 헤더 메뉴와 NestJS/Drizzle 백엔드가 있으므로 다음처럼 맞춘다.

| 구분 | 팔란티어 원본 | towercrane 구현 |
|---|---|---|
| 화면 | `/api-doc` 라우트 | 헤더 메뉴 `API 문서`, `activeSection === 'api_doc'` |
| 백엔드 | Spring + MyBatis `/api/api-doc` | NestJS + Drizzle `/api/api-doc` |
| DB | `api_doc_categories`, `api_doc_sections`, `api_doc_blocks` | `api_doc_categories`, `api_doc_endpoints`, `api_doc_blocks` |
| 프론트 API | fetch 직접 호출 | 기존 `apiRequest('/api-doc/...')` |
| 인증 | 로그인 필요, 관리자 편집 | 로그인 필요, 관리자만 문서 저장/구조 변경 |
| 테마 | shadcn 변수/일부 raw 팔레트 | semantic token 또는 `ui-*`만 사용 |

프론트 API 호출은 `VITE_API_BASE_URL`이 이미 `/api`를 포함하므로 항상 `apiRequest('/api-doc/categories')`처럼 작성한다. `apiRequest('/api/api-doc/...')`는 금지한다.

## 참고한 팔란티어 원본 파일

### 백엔드

- `/Users/terecal/mapo-palantier-project/parantier-api/src/main/java/com/mapo/palantier/apidoc/presentation/ApiDocController.java`
- `/Users/terecal/mapo-palantier-project/parantier-api/src/main/java/com/mapo/palantier/apidoc/application/ApiDocService.java`
- `/Users/terecal/mapo-palantier-project/parantier-api/src/main/resources/mybatis/mapper/ApiDocCategoryMapper.xml`
- `/Users/terecal/mapo-palantier-project/parantier-api/src/main/resources/mybatis/mapper/ApiDocSectionMapper.xml`
- `/Users/terecal/mapo-palantier-project/parantier-api/src/main/resources/mybatis/mapper/ApiDocBlockMapper.xml`

### 프론트엔드

- `/Users/terecal/mapo-palantier-project/parantier-front/src/pages/apidoc/ApiDocPage.tsx`
- `/Users/terecal/mapo-palantier-project/parantier-front/src/features/apidoc/components/ApiTesterPanel.tsx`
- `/Users/terecal/mapo-palantier-project/parantier-front/src/features/apidoc/api/apiDocApi.ts`
- `/Users/terecal/mapo-palantier-project/parantier-front/src/features/apidoc/types/apiDoc.types.ts`
- `/Users/terecal/mapo-palantier-project/parantier-front/src/features/apidoc/model/apiEnvStore.ts`

## 1차 구현 범위

| 기능 | 1차 포함 여부 | 비고 |
|---|---:|---|
| API 카테고리 CRUD | 포함 | 관리자만 생성/수정/삭제 |
| 엔드포인트 CRUD | 포함 | method/title/path/order 저장 |
| 엔드포인트별 요청 설정 저장 | 포함 | `api_doc_blocks`에 JSON 저장 |
| Params / Headers / Body 편집 | 포함 | Postman 핵심 흐름 |
| 브라우저 fetch 요청 실행 | 포함 | CORS 제약은 브라우저 정책을 따름 |
| Response body/header/status/duration 표시 | 포함 | 요청 결과는 로컬 상태로 표시 |
| 환경 변수 | 포함 | localStorage 기반, `{{API_BASE}}` 치환 |
| 현재 로그인 토큰 사용 | 포함 | `authEnabled`가 켜져 있으면 현재 세션 토큰 주입 |
| 카테고리/엔드포인트 드래그 정렬 | 포함 | `@dnd-kit` 사용 |
| DB 메뉴 추가 | 포함 | seed와 기존 DB 보정 둘 다 처리 |
| 요청 히스토리 저장 | 후순위 | 1차는 실행 결과만 표시 |
| OpenAPI import/export | 후순위 | 별도 기능으로 분리 |
| 다중 워크스페이스/팀 | 후순위 | 현재 프로젝트에 조직 도메인 없음 |
| 서버 프록시 요청 | 제외 | 1차는 브라우저 fetch로 충분 |

## towercrane 현재 구조 반영

### 백엔드

- NestJS 11
- SQLite + better-sqlite3 + Drizzle ORM
- 글로벌 prefix: `src/main.ts`의 `app.setGlobalPrefix('api')`
- 인증: `AuthGuard`, `CurrentUser`
- 사용자 role: `admin` / `user`
- 런타임 테이블 생성: `src/database/database.service.ts`의 `CREATE TABLE IF NOT EXISTS`
- Drizzle 타입: `src/database/schema.ts`

### 프론트엔드

- React 19 + TypeScript
- TanStack Query
- Zustand store 사용 가능
- `@dnd-kit/core`, `@dnd-kit/sortable` 설치됨
- API 공통 래퍼: `src/shared/api/http.ts`
- 헤더 메뉴: `menus` 테이블에서 로드
- 디자인 규칙: raw Tailwind 팔레트 금지, semantic token 또는 `ui-*` 유틸 사용

## 전체 구현 순서

1. DB 스키마와 런타임 DDL 추가
2. DB 메뉴 seed와 기존 DB 보정 추가
3. `ApiDocModule` / Controller / Service / Zod schema 추가
4. 프론트 타입/API/query hook/local env store 추가
5. API 문서 페이지와 API tester 패널 구현
6. `AppRoot`에 `api_doc` section 연결
7. 빌드/타입 검증

