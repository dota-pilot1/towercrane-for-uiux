# 03. 프론트엔드 entities/query 계획

## 대상 파일

새 파일:

- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-front/src/entities/project-issue/model/types.ts`
- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-front/src/entities/project-issue/model/constants.ts`
- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-front/src/entities/project-issue/api/project-issue-api.ts`
- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-front/src/features/project-issue/model/use-project-issue-queries.ts`

기존 `entities/issue`, `features/issue`는 프로토타입 이슈 전용으로 그대로 둔다.

## 타입

`ProjectIssue`:

- `id`
- `projectId`
- `title`
- `content`
- `issueType`
- `status`
- `priority`
- `reporterId`, `reporterName`, `reporterEmail`
- `assigneeId`, `assigneeName`, `assigneeEmail`
- `dueDate`
- `orderIdx`
- `archived`
- `createdAt`
- `updatedAt`

Enum:

- `ProjectIssueType = 'BUG' | 'FEATURE' | 'IMPROVEMENT' | 'QUESTION' | 'RISK' | 'OTHER'`
- `ProjectIssueStatus = 'OPEN' | 'IN_PROGRESS' | 'TESTING' | 'CLOSED' | 'HOLD'`
- `ProjectIssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'`

하위 타입:

- `ProjectIssueChecklist`
- `ProjectIssueComment`
- `ProjectIssueAttachment`
- `ProjectIssueActivityLog`

## API wrapper

`project-issue-api.ts`:

- `list(filters)`
- `detail(issueId)`
- `create(body)`
- `update(issueId, body)`
- `delete(issueId)`
- `updateStatus(issueId, status)`
- `updatePriority(issueId, priority)`
- `updateAssignee(issueId, assigneeId)`
- `reorder(items)`
- `archive(ids)`
- `restore(ids)`
- checklist CRUD/toggle
- comment CRUD
- attachment CRUD
- activity list

모든 endpoint는 `/project-issues`를 사용한다.

## Query hook

Query keys:

```ts
projectIssueQueryKeys.all
projectIssueQueryKeys.list(filters)
projectIssueQueryKeys.detail(issueId)
projectIssueQueryKeys.checklists(issueId)
projectIssueQueryKeys.comments(issueId)
projectIssueQueryKeys.attachments(issueId)
projectIssueQueryKeys.activity(issueId)
```

Mutation 성공 시:

- create/update/delete/status/priority/assignee/reorder/archive/restore: `projectIssueQueryKeys.all` invalidate
- checklist/comment/attachment/activity 관련: 해당 detail과 하위 query invalidate

## 완료 조건

- 프로토타입 이슈 entity와 프로젝트 이슈 entity가 분리된다.
- `/project-issues` API wrapper가 독립적으로 존재한다.
- query key가 프로젝트 이슈 전용으로 분리된다.
