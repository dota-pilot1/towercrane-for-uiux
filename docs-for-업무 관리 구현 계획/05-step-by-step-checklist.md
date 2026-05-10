# 05. 단계별 구현 체크리스트

## Phase 0. 기준 확인

- [ ] 앱 서버를 직접 시작하지 않는다. 필요하면 사용자에게 안내만 한다.
- [ ] towercrane의 API base URL이 `/api`를 포함한다는 점을 확인한다.
- [ ] 프론트에서 raw Tailwind 팔레트 색상을 쓰지 않는다.
- [ ] 팔란티어 원본 기능 중 1차 제외 대상을 다시 확인한다.

1차 제외:

- 보상금
- 무기형 업무 유형 라벨
- 이미지 드래그/붙여넣기 업로드
- Mermaid 마인드맵
- DB 테이블 에디터
- 피그마 링크
- 연결 이슈
- WebSocket 업무 채팅

## Phase 1. DB 스키마 추가

수정 파일:

```text
towercrane-for-uiux-server/src/database/schema.ts
towercrane-for-uiux-server/src/database/database.service.ts
```

작업:

- [ ] `TaskType`, `TaskStatus`, `TaskPriority`, `TaskActivityType` 타입 추가
- [ ] `tasksTable` 추가
- [ ] `taskChecklistsTable` 추가
- [ ] `taskCommentsTable` 추가
- [ ] `taskActivityLogsTable` 추가
- [ ] `schema` 객체에 신규 테이블 추가
- [ ] `$inferSelect`, `$inferInsert` type export 추가
- [ ] `database.service.ts`의 `CREATE TABLE IF NOT EXISTS` 블록에 신규 테이블 DDL 추가
- [ ] 업무 관련 index 추가
- [ ] 초기 메뉴 seed에 `업무 관리` 항목이 없으면 추가

검증:

- [ ] TypeScript import 순환 없음
- [ ] SQLite foreign key on delete 정책 확인
- [ ] 신규 DB와 기존 DB 모두에서 안전한 DDL인지 확인

## Phase 2. Nest 모듈/API 추가

새 파일:

```text
towercrane-for-uiux-server/src/tasks/tasks.module.ts
towercrane-for-uiux-server/src/tasks/tasks.controller.ts
towercrane-for-uiux-server/src/tasks/tasks.service.ts
towercrane-for-uiux-server/src/tasks/tasks.schemas.ts
```

수정 파일:

```text
towercrane-for-uiux-server/src/app.module.ts
```

작업:

- [ ] Zod schema 작성
- [ ] `TasksModule` 작성
- [ ] `AppModule`에 `TasksModule` 등록
- [ ] `GET /tasks` 목록 API
- [ ] `GET /tasks/:taskId` 상세 API
- [ ] `POST /tasks` 생성 API
- [ ] `PATCH /tasks/:taskId` 수정 API
- [ ] `DELETE /tasks/:taskId` hard delete API
- [ ] `PATCH /tasks/:taskId/status`
- [ ] `PATCH /tasks/:taskId/priority`
- [ ] `PATCH /tasks/:taskId/assignee`
- [ ] `POST /tasks/reorder`
- [ ] `POST /tasks/archive`
- [ ] `POST /tasks/restore`
- [ ] 체크리스트 CRUD API
- [ ] 댓글 CRUD API
- [ ] 활동 로그 조회 API
- [ ] 변경 작업마다 activity log 기록

검증:

- [ ] `@Controller('tasks')`만 사용하고 `/api`를 붙이지 않는다.
- [ ] `@UseGuards(AuthGuard)` 적용
- [ ] `@CurrentUser()`로 reporter/actor 처리
- [ ] NotFound/Forbidden/BadRequest 예외 구분

## Phase 3. 담당자 목록 API 정리

수정 파일:

```text
towercrane-for-uiux-server/src/users/users.controller.ts
towercrane-for-uiux-server/src/users/users.service.ts
towercrane-for-uiux-front/src/shared/api/users.ts
```

작업:

- [ ] `GET /users/assignable` 추가
- [ ] 로그인 사용자면 조회 가능하게 `AuthGuard`만 적용
- [ ] 반환 필드는 `id`, `name`, `email`, `profileImageUrl`, `role`
- [ ] 프론트 `useAssignableUsers()` 추가

이 단계가 필요한 이유:

현재 `useUsersList()`는 admin 전용이다. 업무 담당자는 일반 사용자도 지정해야 하므로 별도 API가 필요하다.

## Phase 4. 프론트 타입/API/hook 추가

새 파일:

```text
towercrane-for-uiux-front/src/entities/task/model/types.ts
towercrane-for-uiux-front/src/entities/task/model/constants.ts
towercrane-for-uiux-front/src/entities/task/api/task-api.ts
towercrane-for-uiux-front/src/features/task/model/use-task-queries.ts
```

작업:

- [ ] backend schema와 동일한 TS union type 정의
- [ ] 라벨/순서/배지 class 상수 작성
- [ ] `taskApi` 작성
- [ ] `apiRequest('/tasks')` 경로 확인
- [ ] query keys 작성
- [ ] 목록/상세/생성/수정/삭제 hooks 작성
- [ ] 상태/우선순위/담당자 단일 변경 hooks 작성
- [ ] 체크리스트 hooks 작성
- [ ] 댓글 hooks 작성
- [ ] 활동 로그 hook 작성

검증:

- [ ] `/api` 중복 없음
- [ ] mutation 성공 시 필요한 query invalidate
- [ ] toast 문구가 과하지 않고 명확함

## Phase 5. `TaskPage` 셸 구현

수정 파일:

```text
towercrane-for-uiux-front/src/pages/task/ui/task-page.tsx
```

새 파일:

```text
towercrane-for-uiux-front/src/features/task/ui/task-toolbar.tsx
```

작업:

- [ ] placeholder 제거
- [ ] 페이지 헤더와 툴바 구성
- [ ] viewMode 상태 추가: `table`, `kanban`, `card`
- [ ] filters 상태 추가
- [ ] selectedTaskId/detail dialog 상태 추가
- [ ] 새 업무 dialog 상태 추가
- [ ] `useTasks(filters)` 연결
- [ ] loading/error/empty 상태 처리

검증:

- [ ] 현재 헤더 메뉴의 `activeSection === 'task'` 흐름 유지
- [ ] 화면 폭이 좁아져도 툴바가 겹치지 않음
- [ ] raw palette class 없음

## Phase 6. 테이블 뷰 구현

새 파일:

```text
towercrane-for-uiux-front/src/features/task/ui/task-table-view.tsx
towercrane-for-uiux-front/src/features/task/ui/task-badges.tsx
```

작업:

- [ ] TanStack Table 컬럼 정의
- [ ] 선택 checkbox
- [ ] 제목 클릭 시 상세 열기
- [ ] 상태 빠른 변경
- [ ] 우선순위 빠른 변경
- [ ] 담당자 빠른 변경
- [ ] 보관/복원 bulk action
- [ ] 상세 icon button

후순위:

- [ ] row drag reorder
- [ ] 제목 inline edit
- [ ] 페이지네이션 UI

## Phase 7. 칸반 뷰 구현

새 파일:

```text
towercrane-for-uiux-front/src/features/task/ui/task-kanban-view.tsx
towercrane-for-uiux-front/src/features/task/ui/task-card.tsx
```

작업:

- [ ] 상태 컬럼 정의
- [ ] `@dnd-kit/core` 적용
- [ ] 카드 드래그로 상태 변경
- [ ] 카드 클릭 시 상세 열기
- [ ] 보류 업무 표시
- [ ] 빈 컬럼 상태 표시

검증:

- [ ] 드래그 중 레이아웃이 크게 흔들리지 않음
- [ ] 모바일에서 가로 스크롤 또는 세로 스택이 자연스러움
- [ ] 상태 변경 실패 시 query invalidate로 원복

## Phase 8. 카드 뷰 구현

새 파일:

```text
towercrane-for-uiux-front/src/features/task/ui/task-card-view.tsx
```

작업:

- [ ] 미완료/완료 그룹 분리
- [ ] 상태별 접기/펼치기
- [ ] 완료 영역으로 드롭하면 `DONE`
- [ ] 미완료 영역으로 드롭하면 `TODO`
- [ ] 담당자/마감일/우선순위 표시

## Phase 9. 상세/생성 다이얼로그

새 파일:

```text
towercrane-for-uiux-front/src/features/task/ui/task-detail-dialog.tsx
towercrane-for-uiux-front/src/features/task/ui/task-form-dialog.tsx
towercrane-for-uiux-front/src/features/task/ui/task-checklist-panel.tsx
towercrane-for-uiux-front/src/features/task/ui/task-comments-panel.tsx
towercrane-for-uiux-front/src/features/task/ui/task-activity-panel.tsx
```

작업:

- [ ] 새 업무 생성 폼
- [ ] 상세 기본 정보 표시
- [ ] 상세 편집 저장
- [ ] 체크리스트 추가/토글/삭제
- [ ] 댓글 추가/수정/삭제
- [ ] 활동 로그 표시
- [ ] 삭제는 기본적으로 보관 처리로 연결

검증:

- [ ] 다이얼로그 닫기 후 selectedTaskId 정리
- [ ] 상세 탭별 query enabled 처리
- [ ] 작성자/담당자 이름 fallback 처리

## Phase 10. 검증

서버:

```bash
cd /Users/terecal/towercrane-for-uiux/towercrane-for-uiux-server
pnpm lint:check
pnpm test
```

프론트:

```bash
cd /Users/terecal/towercrane-for-uiux/towercrane-for-uiux-front
pnpm typecheck
pnpm lint
pnpm build
```

주의:

- 위 명령은 서버 시작 명령이 아니다.
- `pnpm start`, `pnpm start:dev`, `npm run dev`, `vite --host` 같은 앱 서버 시작은 사용자가 직접 하거나 별도 지시가 있을 때만 한다.

수동 QA:

- [ ] 업무 생성
- [ ] 테이블에서 상태 변경
- [ ] 칸반에서 드래그 상태 변경
- [ ] 카드 뷰에서 완료 처리
- [ ] 체크리스트 추가/토글/삭제
- [ ] 댓글 추가/수정/삭제
- [ ] 보관/복원
- [ ] 검색/필터 조합
- [ ] 새로고침 후 데이터 유지
