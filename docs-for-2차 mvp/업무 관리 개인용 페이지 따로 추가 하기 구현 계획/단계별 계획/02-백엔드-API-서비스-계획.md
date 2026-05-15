# 02. 백엔드 API/서비스 계획

## 대상 파일

- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-server/src/tasks/tasks.schemas.ts`
- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-server/src/tasks/tasks.service.ts`
- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-server/src/tasks/tasks.controller.ts`
- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-server/src/database/schema.ts`

## Query schema 확장

`listTasksQuerySchema`에 추가한다.

- `scope`: `all` | `my` | `user`, 기본값 `all`
- `userId`: string optional
- `visibility`: 필요하면 `TEAM` | `PRIVATE`, 일반 목록에서는 직접 노출하지 않아도 된다.

예상 요청:

- `GET /tasks?scope=all`
- `GET /tasks?scope=my`
- `GET /tasks?scope=user&userId={id}`

## Create/Update schema 확장

`createTaskSchema` 추가 필드:

- `scope`: `TEAM` | `PERSONAL`, 기본값 `TEAM`
- `visibility`: `TEAM` | `PRIVATE`, 기본값은 scope에 따라 서비스에서 결정
- `ownerId`: 클라이언트 직접 입력보다 서버에서 current user 기준으로 지정 권장

서비스 기본값:

- `scope=TEAM`: `visibility=TEAM`, `ownerId=null`
- `scope=PERSONAL`: `visibility=PRIVATE`, `ownerId=currentUser.id`, `assigneeId=currentUser.id` 기본

`updateTaskSchema`는 `scope`, `visibility`, `ownerId` 변경을 처음부터 모두 열지 않는다. MVP에서는 생성 후 `scope` 전환을 막거나 admin만 허용한다.

## `TasksService.listTasks()`

현재 `_user`를 실제로 사용하도록 바꾼다.

조건 정책:

- 공통: `tasks.archived = query.archived`
- `scope=all`:
  - `visibility = TEAM`
  - 기존 필터(`assigneeId`, `status`, `priority`, `taskType`, `q`) 적용
- `scope=my`:
  - `(assigneeId = user.id OR ownerId = user.id)`
  - `PRIVATE` 업무도 포함
- `scope=user`:
  - `query.userId` 필수
  - `assigneeId = query.userId`
  - `visibility = TEAM`

관리자도 `scope=all`에서는 기본적으로 팀 업무만 본다. private 개인 업무까지 보는 관리자 모드가 필요하면 추후 `includePrivate=true`를 별도 admin-only query로 추가한다.

## 권한 함수 변경

### `ensureCanWriteTask(user, task)`

허용 대상:

- admin
- reporter
- assignee
- owner

단, `visibility=PRIVATE`이고 `ownerId !== user.id`인 경우 admin 외 접근 제한을 명확히 한다.

### `getTaskDetail(user, taskId)`

현재는 누구나 detail 가능하다. private 개인 업무를 도입하면 읽기 권한을 검사해야 한다.

허용 대상:

- `visibility=TEAM`: 로그인 사용자
- `visibility=PRIVATE`: admin 또는 owner/reporter/assignee

댓글/체크리스트/첨부/activity list도 `ensureCanReadTask()`를 먼저 통과시키도록 정리한다.

## DTO 변환

`toTaskDto()`에 추가한다.

- `scope`
- `ownerId`
- `ownerName`
- `ownerEmail`
- `visibility`

`getUsersById()`를 이미 사용 중이므로 owner 표시도 같은 map으로 처리한다.

## Controller 변경

`tasks.controller.ts`는 큰 변경이 없다.

- `GET /tasks`: query 확장만 전달.
- `POST /tasks`: create schema/service 확장만 반영.

별도 `GET /tasks/my`는 만들지 않는다. 같은 API를 쓰면 프론트 query key와 캐시가 단순하다.

## 테스트 포인트

- `GET /tasks?scope=all`은 private 개인 업무를 반환하지 않는다.
- `GET /tasks?scope=my`는 내가 담당자이거나 owner인 업무만 반환한다.
- `GET /tasks?scope=user&userId=A`는 A의 팀 담당 업무만 반환한다.
- 다른 사용자의 private 업무 detail 접근은 403이어야 한다.
- 기존 상태/우선순위/담당자 수정 API가 새 권한 정책에서도 동작한다.
