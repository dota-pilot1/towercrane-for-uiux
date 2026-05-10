# 업무 관리 구현 계획 개요

## 목표

`/Users/terecal/mapo-palantier-project`의 업무 관리 기능을 참고해 `towercrane-for-uiux`의 `Task 관리` 페이지에 실사용 가능한 업무 관리 기능을 구현한다.

팔란티어의 원본 기능은 `Work` 도메인으로 구현되어 있고, towercrane에는 이미 `task` 섹션과 빈 `TaskPage`가 있으므로 다음처럼 명칭을 정리한다.

| 구분 | 팔란티어 원본 | towercrane 구현 명칭 |
|---|---|---|
| 메뉴/화면 | 업무 관리 | Task 관리 / 업무 관리 |
| 백엔드 리소스 | `/api/works` | `/api/tasks` |
| DB 메인 테이블 | `works` | `tasks` |
| 프론트 섹션 | `/work`, `/work/card`, `/work/kanban` | 기존 `activeSection === 'task'` 화면 내부 뷰 전환 |

프론트 API 호출은 `VITE_API_BASE_URL`이 이미 `/api`를 포함하므로 항상 `apiRequest('/tasks')`처럼 작성한다. `apiRequest('/api/tasks')`는 금지한다.

## 참고한 팔란티어 원본 파일

### 백엔드

- `/Users/terecal/mapo-palantier-project/parantier-api/src/main/java/com/mapo/palantier/work/presentation/WorkController.java`
- `/Users/terecal/mapo-palantier-project/parantier-api/src/main/java/com/mapo/palantier/work/application/WorkService.java`
- `/Users/terecal/mapo-palantier-project/parantier-api/src/main/resources/mybatis/mapper/WorkMapper.xml`
- `/Users/terecal/mapo-palantier-project/parantier-api/src/main/java/com/mapo/palantier/work/presentation/WorkMessageController.java`
- `/Users/terecal/mapo-palantier-project/parantier-api/src/main/resources/mybatis/mapper/WorkChecklistMapper.xml`
- `/Users/terecal/mapo-palantier-project/parantier-api/src/main/resources/mybatis/mapper/SubWorkMapper.xml`

### 프론트엔드

- `/Users/terecal/mapo-palantier-project/parantier-front/src/pages/work/WorkPage.tsx`
- `/Users/terecal/mapo-palantier-project/parantier-front/src/pages/work/WorkCardPage.tsx`
- `/Users/terecal/mapo-palantier-project/parantier-front/src/pages/work/WorkKanbanPage.tsx`
- `/Users/terecal/mapo-palantier-project/parantier-front/src/features/work/components/WorkKanbanView.tsx`
- `/Users/terecal/mapo-palantier-project/parantier-front/src/features/work/components/WorkCardView.tsx`
- `/Users/terecal/mapo-palantier-project/parantier-front/src/features/work/components/WorkDetailDialog.tsx`
- `/Users/terecal/mapo-palantier-project/parantier-front/src/entities/work/api/workApi.ts`
- `/Users/terecal/mapo-palantier-project/parantier-front/src/features/work/hooks/useWorks.ts`

## 1차 구현 범위

팔란티어 기능 중 보편적인 업무 관리에 필요한 기능만 먼저 구현한다.

| 기능 | 1차 포함 여부 | 비고 |
|---|---:|---|
| 업무 CRUD | 포함 | 생성, 상세, 수정, 삭제 또는 보관 |
| 목록 필터/검색/정렬 | 포함 | 상태, 유형, 우선순위, 담당자, 검색어, 보관 여부 |
| 테이블 뷰 | 포함 | towercrane 의존성에 맞춰 TanStack Table 사용 |
| 칸반 뷰 | 포함 | 이미 설치된 `@dnd-kit/core`로 상태 변경 드래그 |
| 카드 뷰 | 포함 | 완료/미완료 구분 또는 상태별 그룹 |
| 상세 다이얼로그 | 포함 | 기본 정보, 체크리스트, 댓글, 활동 로그 |
| 체크리스트 | 포함 | 업무별 할 일 목록 |
| 댓글 | 포함 | 팔란티어의 work message를 보편적인 comment로 변환 |
| 보관/복원 | 포함 | 팔란티어 backup/archive 개념 유지 |
| 순서 변경 | 포함 | 테이블/칸반 정렬 순서 저장 |
| 이미지 업로드 | 후순위 | towercrane 공통 upload와 연결 가능하지만 1차 제외 |
| 피그마 링크 | 후순위 | prototype/docu 기능과 중복 가능 |
| Mermaid 마인드맵 | 후순위 | 특수 기능으로 분리 |
| DB 테이블 에디터 | 후순위 | 업무 관리 핵심 범위 밖 |
| 연결 이슈 | 후순위 | 별도 이슈 도메인 구현 후 연결 |
| 업무 상태 채팅/WebSocket | 제외 | towercrane 회의실 기능과 중복, 1차는 REST 댓글로 충분 |
| 보상금/prize | 제외 | 팔란티어 특화 필드 |
| 무기 아이콘형 업무 유형 | 제외 | `FEATURE`, `BUG`, `DOCS` 같은 일반 유형으로 대체 |

## towercrane 현재 구조 반영

### 백엔드

- NestJS 11
- SQLite + better-sqlite3 + Drizzle ORM
- 글로벌 prefix: `src/main.ts`의 `app.setGlobalPrefix('api')`
- 인증: `AuthGuard`, `CurrentUser`
- 사용자: `usersTable`의 `id`, `name`, `email`, `role`
- 런타임 테이블 생성: `src/database/database.service.ts`의 `CREATE TABLE IF NOT EXISTS`
- 타입 스키마: `src/database/schema.ts`

### 프론트엔드

- React 19 + TypeScript
- TanStack Query
- TanStack Table 사용 가능
- `@dnd-kit/core`, `@dnd-kit/sortable` 설치됨
- API 공통 래퍼: `src/shared/api/http.ts`
- 기존 페이지: `src/pages/task/ui/task-page.tsx`
- 디자인 규칙: raw Tailwind 팔레트 금지, semantic token 또는 `ui-*` 유틸 사용

## 전체 구현 순서

1. DB 스키마와 Nest 모듈 추가
2. Task REST API 구현
3. 체크리스트/댓글/활동 로그 API 구현
4. 프론트 타입/API/query hook 추가
5. 기존 `TaskPage`를 업무 관리 셸로 교체
6. 테이블 뷰 구현
7. 칸반 뷰 구현
8. 카드 뷰와 상세 다이얼로그 구현
9. 메뉴/권한/빈 상태 정리
10. 테스트와 빌드 검증

각 단계의 상세 파일 계획은 나머지 문서에 분리한다.
