# 02. 백엔드 API/서비스 계획

## 목표

인증된 개인 workspace/schema/problem 관리 API와 인증 없는 공유 풀이 API를 분리한다.

## 변경 파일

### `towercrane-for-uiux-server/src/sql-practice/sql-practice.schemas.ts`

기존 user problem schema의 필드 형태는 재사용하되 저장 대상은 `sql_personal_practice_*` 도메인으로 분리한다.

추가 schema:

```ts
export const sqlPersonalPracticeWorkspaceIdSchema = z.string().uuid();
export const sqlPersonalPracticeProblemIdSchema = z.string().uuid();

export const sqlPersonalPracticeProblemListQuerySchema = z.object({
  level: z.union([sqlUserPracticeLevelSchema, z.literal('all')]).optional()
    .transform((value) => (value === 'all' ? undefined : value)),
});

export const publicSqlPersonalPracticeGradeSchema = z.object({
  submittedSql: z.string().trim().min(1).max(10000),
});

export const publicShareTokenSchema = z.string().trim().min(16).max(128);
```

파일 교체 단계에서는 업로드 schema를 별도로 추가한다.

```ts
export const createSqlPersonalPracticeSchemaVersionSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(1000).optional(),
});
```

### `towercrane-for-uiux-server/src/sql-practice/sql-practice.controller.ts`

인증 controller에 개인 API를 추가한다.

```ts
@Get('personal/workspaces')
personalWorkspaces(@Req() req: SessionRequest)

@Get('personal/workspaces/default')
defaultPersonalWorkspace(@Req() req: SessionRequest)

@Get('personal/workspaces/:workspaceId/meta')
personalWorkspaceMeta(@Param('workspaceId') workspaceId: string, @Req() req: SessionRequest)

@Get('personal/workspaces/:workspaceId/tables')
personalWorkspaceTables(@Param('workspaceId') workspaceId: string, @Req() req: SessionRequest)

@Get('personal/workspaces/:workspaceId/erd')
personalWorkspaceErd(@Param('workspaceId') workspaceId: string, @Req() req: SessionRequest)

@Get('personal/workspaces/:workspaceId/problems')
personalProblems(@Param('workspaceId') workspaceId: string, @Query() query: unknown, @Req() req: SessionRequest)

@Post('personal/workspaces/:workspaceId/problems')
createPersonalProblem(@Param('workspaceId') workspaceId: string, @Body() body: unknown, @Req() req: SessionRequest)

@Patch('personal/workspaces/:workspaceId/problems/:id')
updatePersonalProblem(@Param('workspaceId') workspaceId: string, @Param('id') id: string, @Body() body: unknown, @Req() req: SessionRequest)

@Delete('personal/workspaces/:workspaceId/problems/:id')
deletePersonalProblem(@Param('workspaceId') workspaceId: string, @Param('id') id: string, @Req() req: SessionRequest)

@Post('personal/workspaces/:workspaceId/problems/:id/share')
sharePersonalProblem(@Param('workspaceId') workspaceId: string, @Param('id') id: string, @Req() req: SessionRequest)

@Post('personal/workspaces/:workspaceId/problems/:id/unshare')
unsharePersonalProblem(@Param('workspaceId') workspaceId: string, @Param('id') id: string, @Req() req: SessionRequest)

@Post('personal/workspaces/:workspaceId/problems/generate-answer')
generatePersonalProblemAnswer(@Param('workspaceId') workspaceId: string, @Body() body: unknown, @Req() req: SessionRequest)

@Post('personal/workspaces/:workspaceId/problems/:id/grade')
gradePersonalProblem(@Param('workspaceId') workspaceId: string, @Param('id') id: string, @Body() body: unknown, @Req() req: SessionRequest)
```

공개 controller에 공유 API를 추가한다.

```ts
@Get('personal/:token')
publicPersonalProblem(@Param('token') token: string)

@Post('personal/:token/grade')
gradePublicPersonalProblem(@Param('token') token: string, @Body() body: unknown)
```

공개 controller의 prefix는 이미 `@Controller('public/sql')`이므로 최종 URL은 다음과 같다.

```text
GET  /public/sql/personal/:token
POST /public/sql/personal/:token/grade
```

### `towercrane-for-uiux-server/src/sql-practice/sql-practice.service.ts`

workspace/schema version helper를 추가한다.

```ts
private ensureDefaultPersonalWorkspace(userId)
private assertPersonalWorkspaceOwner(workspaceId, userId)
private getActivePersonalSchemaVersion(workspaceId)
private getPersonalPracticeRuntimeUserId(workspaceId, schemaVersionId, userId)
private getPublicPersonalPracticeRuntimeUserId(token)
private buildPersonalPracticeSeed(schemaVersion)
```

개인 API 메서드:

```ts
listPersonalPracticeWorkspaces(userId)
getDefaultPersonalPracticeWorkspace(userId)
getPersonalPracticeWorkspaceMeta(workspaceId, userId)
getPersonalPracticeTables(workspaceId, userId)
getPersonalPracticeErd(workspaceId, userId)
listPersonalPracticeProblems(workspaceId, query, userId)
getPersonalPracticeProblem(workspaceId, id, userId)
createPersonalPracticeProblem(workspaceId, input, userId)
updatePersonalPracticeProblem(workspaceId, id, input, userId)
deletePersonalPracticeProblem(workspaceId, id, userId)
sharePersonalPracticeProblem(workspaceId, id, userId)
unsharePersonalPracticeProblem(workspaceId, id, userId)
generatePersonalPracticeAnswer(workspaceId, input, userId)
gradePersonalPracticeProblem(workspaceId, id, body, userId)
```

구현 규칙:

- `ensureDefaultPersonalWorkspace`는 기본 workspace와 schema version 1을 만든다.
- 기본 schema version 1은 `user_commerce.sql`과 `user_commerce.mmd`를 복사해 생성한다.
- `createPersonalPracticeProblem`은 workspace의 active schema version id를 저장한다.
- `listPersonalPracticeProblems`는 `workspace_id = workspaceId`만 조회한다.
- `getPersonalPracticeProblem`, update, delete, share, unshare는 owner 검증을 통과해야 한다.
- share는 기존 enabled share가 있으면 그대로 반환하고, 없으면 새 token을 생성한다.
- unshare는 `sql_personal_practice_shares.enabled = 0`, `disabled_at = now`로 갱신한다.
- 정답 SQL 검증/채점은 반드시 문제의 `schema_version_id` 기준 runtime DB에서 실행한다.

공개 API 메서드:

```ts
getPublicPersonalPracticeProblem(token)
gradePublicPersonalPracticeProblem(token, body)
```

공개 조회 조건:

```text
share.token = token
share.enabled = true
problem.status = 'published'
share.schema_version_id = problem.schema_version_id
```

공개 조회 응답:

- workspace 요약
- schema version 요약
- answerSql 제외한 problem
- targetTables 기준 table schema
- ERD mmd

공개 채점:

- token으로 share/problem/schema version을 찾는다.
- 제출 SQL은 공개 전용 schema로 검증한다.
- schema version 기준 runtime DB에서 제출 SQL과 정답 SQL을 각각 실행한다.
- 결과 비교는 기존 `isSameSqlResult`를 재사용한다.

익명 런타임 user id 제안:

```ts
private getPublicPersonalPracticeRuntimeUserId(token: string) {
  return `__public_personal_practice__:${token}`;
}
```

이렇게 하면 공개 풀이가 문제 작성자나 로그인 유저의 runtime sqlite 파일을 오염시키지 않는다.

### 기존 `/sql/user` 수정

`/sql/user`는 기존 공용 유저 문제 도메인으로 유지한다. 개인 문제는 `sql_personal_practice_*` 테이블만 사용하므로 `/sql/user/problems` 목록에 섞일 일이 없다.

공용 유저 문제와 개인 문제의 API/서비스 메서드를 섞지 않는다.

## 파일 교체 API는 후속 단계

파일 교체는 07 단계에서 추가한다.

```text
GET  /sql/personal/workspaces/:workspaceId/schema-versions
POST /sql/personal/workspaces/:workspaceId/schema-versions
POST /sql/personal/workspaces/:workspaceId/schema-versions/:versionId/activate
```

개인 문제 MVP에서는 DB 구조만 먼저 파일 교체를 받을 수 있게 잡아두고, 업로드 UI/API는 별도 작업으로 닫는다.

## 에러 정책

- owner가 아닌 개인 workspace/problem 접근: `403`
- 없는 문제 또는 공유 해제 token: `404`
- draft/archived 공유 접근: `404`
- SELECT/WITH 외 SQL 제출: 기존 메시지 유지
- problem의 schema version이 삭제되었거나 runtime DB 생성에 실패하면 명확한 서버 오류 메시지
