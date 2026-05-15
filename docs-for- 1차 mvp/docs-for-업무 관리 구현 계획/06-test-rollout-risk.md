# 06. 테스트, 롤아웃, 리스크

## 검증 명령

앱 서버를 시작하지 않는 검증만 우선 수행한다.

### 백엔드

```bash
cd /Users/terecal/towercrane-for-uiux/towercrane-for-uiux-server
pnpm lint:check
pnpm test
```

### 프론트엔드

```bash
cd /Users/terecal/towercrane-for-uiux/towercrane-for-uiux-front
pnpm typecheck
pnpm lint
pnpm build
```

## 백엔드 테스트 케이스

### Service 단위 테스트

파일:

```text
towercrane-for-uiux-server/src/tasks/tasks.service.spec.ts
```

케이스:

- 업무 생성 시 `reporterId`, 기본 `status`, 기본 `priority`, `orderIdx`가 채워진다.
- 목록 조회 기본값은 `archived = false`다.
- `q` 검색은 제목/본문을 검색한다.
- 상태 변경 시 `task_activity_logs`에 `STATUS` 로그가 생긴다.
- 담당자 변경 시 `ASSIGNEE` 로그가 생긴다.
- 보관 후 기본 목록에서 제외된다.
- 복원 후 기본 목록에 다시 나온다.
- 댓글 수정/삭제는 작성자 또는 admin만 가능하다.

### E2E 테스트

파일:

```text
towercrane-for-uiux-server/test/app.e2e-spec.ts
```

기존 auth 테스트 뒤에 다음 흐름을 추가한다.

1. 회원가입 또는 로그인
2. `POST /api/tasks`
3. `GET /api/tasks`
4. `PATCH /api/tasks/:taskId/status`
5. `POST /api/tasks/:taskId/checklists`
6. `PATCH /api/tasks/:taskId/checklists/:checklistId/toggle`
7. `POST /api/tasks/:taskId/comments`
8. `POST /api/tasks/archive`
9. `POST /api/tasks/restore`

## 프론트 검증 포인트

### 타입 검증

- `TaskType`, `TaskStatus`, `TaskPriority`가 백엔드 enum과 일치해야 한다.
- `apiRequest` 경로에 `/api`가 중복되지 않아야 한다.
- `useTasks(filters)` query key가 너무 자주 새 객체로 바뀌어 refetch 루프를 만들지 않아야 한다.

### UI 검증

- `TaskPage`가 placeholder 대신 실제 데이터 화면을 보여준다.
- 테이블, 칸반, 카드 뷰 전환 시 선택 업무/필터 상태가 유지된다.
- 상태 변경 후 카운트가 갱신된다.
- 보관함 토글 시 기본 목록과 보관 목록이 분리된다.
- 상세 다이얼로그에서 체크리스트/댓글 탭이 독립적으로 로딩된다.
- 모바일 폭에서 툴바 버튼과 검색 입력이 겹치지 않는다.
- raw Tailwind 팔레트 클래스가 추가되지 않는다.

검색 명령:

```bash
cd /Users/terecal/towercrane-for-uiux/towercrane-for-uiux-front
rg "text-white|text-slate-|bg-slate-|bg-emerald-|border-slate-|border-white" src/pages/task src/features/task src/entities/task
```

## 롤아웃 순서

1. DB 스키마와 API만 먼저 병합
2. 프론트 데이터 계층 추가
3. 기존 placeholder `TaskPage`를 테이블 뷰로 교체
4. 칸반/카드 뷰 추가
5. 상세 다이얼로그의 체크리스트/댓글 추가
6. 활동 로그 표시 추가
7. 후순위 특수 기능 검토

## 후순위 확장 후보

### 이미지 첨부

towercrane에는 이미 upload 모듈이 있다.

참고 파일:

```text
towercrane-for-uiux-server/src/upload/upload.controller.ts
towercrane-for-uiux-front/src/shared/api/upload.ts
```

추가 시 별도 테이블을 둔다.

```text
task_attachments
```

1차 체크리스트에 이미지 필드를 섞지 않는다. 첨부는 업무 전체 자원으로 분리하는 편이 유지보수에 좋다.

### prototype 연결

업무가 특정 prototype에 연결되어야 하면 `tasks.prototype_id` nullable 컬럼을 추가한다. 1차부터 넣어도 되지만 UI 흐름이 복잡해지므로 우선은 독립 업무로 시작한다.

### 실시간 댓글

회의실 기능에는 WebSocket이 있으나 업무 관리는 1차 REST 댓글로 충분하다. 실시간이 필요해지면 기존 meeting gateway 패턴을 참고하되 업무 도메인의 이벤트만 별도 channel로 보낸다.

## 주요 리스크와 대응

| 리스크 | 원인 | 대응 |
|---|---|---|
| 팔란티어 기능을 너무 많이 복사 | WorkDetailDialog가 이미지/마인드맵/DB/피그마까지 포함 | 1차 범위를 CRUD/뷰/체크리스트/댓글로 제한 |
| API 경로 중복 | baseURL이 `/api` 포함 | `taskApi`에서 `/tasks`만 사용 |
| 사용자 목록 권한 문제 | 기존 `useUsersList`는 admin 전용 | `GET /users/assignable` 별도 추가 |
| 색상 테마 깨짐 | raw Tailwind palette 사용 | semantic token, `ui-*` 유틸만 사용 |
| DB schema/DDL 불일치 | Drizzle schema와 runtime DDL 이중 관리 | `schema.ts` 수정과 `database.service.ts` DDL 수정을 같은 커밋에 포함 |
| 대형 컴포넌트화 | 팔란티어 `WorkPage`, `WorkDetailDialog`가 매우 큼 | 화면/패널/배지를 파일 단위로 분리 |
| 일반 사용자 권한 과다 | 전체 업무 수정 허용 | 최소 `admin/reporter/assignee` write rule 적용 |

## 완료 기준

- 빈 placeholder 대신 실제 업무 관리 화면이 표시된다.
- 업무 생성/조회/수정/보관/복원이 동작한다.
- 테이블/칸반/카드 뷰가 같은 API 데이터를 사용한다.
- 칸반 드래그로 상태가 변경된다.
- 상세 다이얼로그에서 체크리스트와 댓글을 관리할 수 있다.
- 빌드와 타입체크가 통과한다.
- 문서 기준으로 후순위 특수 기능이 1차 범위에 섞이지 않는다.
