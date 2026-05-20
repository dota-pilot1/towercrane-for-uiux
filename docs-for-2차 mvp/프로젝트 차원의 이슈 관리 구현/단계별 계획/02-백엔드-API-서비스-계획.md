# 02. 백엔드 API/서비스 계획

## 대상 파일

새 파일:

- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-server/src/project-issues/project-issues.module.ts`
- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-server/src/project-issues/project-issues.controller.ts`
- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-server/src/project-issues/project-issues.service.ts`
- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-server/src/project-issues/project-issues.schemas.ts`

수정 파일:

- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-server/src/app.module.ts`
- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-server/src/database/schema.ts`

## Schema

`project-issues.schemas.ts`에 정의한다.

```ts
projectIssueTypeSchema = z.enum([
  'BUG',
  'FEATURE',
  'IMPROVEMENT',
  'QUESTION',
  'RISK',
  'OTHER',
])

projectIssueStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'TESTING',
  'CLOSED',
  'HOLD',
])

projectIssuePrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
```

목록 query:

- `projectId`: string 필수
- `page`: number default 1
- `pageSize`: number default 50
- `q`: string optional
- `issueType`: optional
- `status`: optional
- `priority`: optional
- `assigneeId`: optional
- `archived`: boolean default false
- `sort`: `order` | `recent` | `oldest` | `dueDate` | `priority`

생성 body:

- `projectId`: string 필수
- `title`: string
- `content`: string optional
- `issueType`: default `BUG`
- `status`: default `OPEN`
- `priority`: default `MEDIUM`
- `assigneeId`: nullable optional
- `dueDate`: nullable optional

## API endpoint

```txt
GET    /project-issues?projectId={projectId}
POST   /project-issues
GET    /project-issues/:issueId
PATCH  /project-issues/:issueId
DELETE /project-issues/:issueId
PATCH  /project-issues/:issueId/status
PATCH  /project-issues/:issueId/priority
PATCH  /project-issues/:issueId/assignee
POST   /project-issues/reorder
POST   /project-issues/archive
POST   /project-issues/restore
```

하위 리소스:

```txt
GET    /project-issues/:issueId/checklists
POST   /project-issues/:issueId/checklists
PATCH  /project-issues/:issueId/checklists/:checklistId
PATCH  /project-issues/:issueId/checklists/:checklistId/toggle
DELETE /project-issues/:issueId/checklists/:checklistId

GET    /project-issues/:issueId/comments
POST   /project-issues/:issueId/comments
PATCH  /project-issues/:issueId/comments/:commentId
DELETE /project-issues/:issueId/comments/:commentId

GET    /project-issues/:issueId/attachments
POST   /project-issues/:issueId/attachments
DELETE /project-issues/:issueId/attachments/:attachmentId

GET    /project-issues/:issueId/activity
```

## Service

`ProjectIssuesService` 주요 메서드:

- `listProjectIssues(user, query)`
- `createProjectIssue(user, input)`
- `getProjectIssue(issueId, user)`
- `updateProjectIssue(issueId, user, input)`
- `deleteProjectIssue(issueId, user)`
- `updateStatus(issueId, user, status)`
- `updatePriority(issueId, user, priority)`
- `updateAssignee(issueId, user, assigneeId)`
- `reorderProjectIssues(user, items)`
- `archiveProjectIssues(user, ids)`
- `restoreProjectIssues(user, ids)`

하위 리소스:

- checklist CRUD/toggle
- comment CRUD soft delete
- attachment CRUD
- activity list

## 권한

MVP 권한:

- 읽기: 로그인 사용자
- 생성: 로그인 사용자
- 수정/삭제/보관: admin 또는 reporter 또는 assignee
- 댓글 작성: 로그인 사용자
- 댓글 수정/삭제: admin 또는 댓글 작성자
- 체크리스트/첨부: admin 또는 reporter 또는 assignee

프로젝트 멤버 권한 테이블이 생기면 `projectId` 기준 멤버십 검사를 추가한다. MVP에서는 기존 auth user 기준으로 시작한다.

## Activity log

다음 이벤트에서 기록한다.

- 생성: `CREATED`
- 제목/내용/유형/마감일 수정: `UPDATED`
- 상태 변경: `STATUS`
- 우선순위 변경: `PRIORITY`
- 담당자 변경: `ASSIGNEE`
- 보관: `ARCHIVED`
- 복원: `RESTORED`

## 완료 조건

- 기존 `/issues` 프로토타입 이슈 API에 영향이 없다.
- 새 `/project-issues` API가 프로젝트 단위로 동작한다.
- 프로젝트 A 이슈가 프로젝트 B 목록에 섞이지 않는다.
- 체크리스트/댓글/첨부/activity가 업무 관리와 같은 수준으로 동작한다.
