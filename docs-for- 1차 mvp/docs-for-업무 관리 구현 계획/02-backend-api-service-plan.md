# 02. 백엔드 API와 서비스 구현 계획

## 대상 파일

새로 만들 파일:

```text
towercrane-for-uiux-server/src/tasks/tasks.module.ts
towercrane-for-uiux-server/src/tasks/tasks.controller.ts
towercrane-for-uiux-server/src/tasks/tasks.service.ts
towercrane-for-uiux-server/src/tasks/tasks.schemas.ts
```

수정할 파일:

```text
towercrane-for-uiux-server/src/app.module.ts
towercrane-for-uiux-server/src/database/schema.ts
towercrane-for-uiux-server/src/database/database.service.ts
```

## 모듈 등록

`src/tasks/tasks.module.ts`

```ts
import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
```

`src/app.module.ts`

```ts
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    // existing
    TasksModule,
  ],
})
export class AppModule {}
```

## Zod 스키마

`src/tasks/tasks.schemas.ts`

```ts
import { z } from 'zod';

export const taskTypeSchema = z.enum([
  'FEATURE',
  'BUG',
  'DOCS',
  'DESIGN',
  'REFACTOR',
  'QA',
  'CHORE',
]);

export const taskStatusSchema = z.enum([
  'TODO',
  'IN_PROGRESS',
  'REVIEW',
  'DONE',
  'HOLD',
]);

export const taskPrioritySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
]);

const queryBooleanSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
}, z.boolean().default(false));

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().trim().max(120).optional().default(''),
  taskType: taskTypeSchema.optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigneeId: z.string().optional(),
  archived: queryBooleanSchema,
  sort: z
    .enum(['order', 'recent', 'oldest', 'dueDate', 'priority'])
    .default('order'),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(120),
  content: z.string().max(5000).optional().default(''),
  taskType: taskTypeSchema.default('FEATURE'),
  status: taskStatusSchema.default('TODO'),
  priority: taskPrioritySchema.default('MEDIUM'),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export const updateTaskSchema = createTaskSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field is required' },
);

export const updateTaskStatusSchema = z.object({
  status: taskStatusSchema,
});

export const updateTaskPrioritySchema = z.object({
  priority: taskPrioritySchema,
});

export const updateTaskAssigneeSchema = z.object({
  assigneeId: z.string().nullable(),
});

export const reorderTasksSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      orderIdx: z.number().int().min(0),
    }),
  ),
});

export const taskIdsSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export const createChecklistSchema = z.object({
  content: z.string().trim().min(1).max(300),
  orderIdx: z.number().int().min(0).optional(),
});

export const updateChecklistSchema = z.object({
  content: z.string().trim().min(1).max(300).optional(),
  completed: z.boolean().optional(),
  orderIdx: z.number().int().min(0).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required',
});

export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});
```

## Controller API 명세

`src/tasks/tasks.controller.ts`

모든 업무 API는 로그인 사용자만 접근 가능하게 `@UseGuards(AuthGuard)`를 건다.

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/tasks` | 업무 목록, 필터/검색/정렬/페이지 |
| `GET` | `/tasks/:taskId` | 업무 상세 |
| `POST` | `/tasks` | 업무 생성 |
| `PATCH` | `/tasks/:taskId` | 업무 수정 |
| `DELETE` | `/tasks/:taskId` | 업무 삭제 또는 보관 처리 |
| `PATCH` | `/tasks/:taskId/status` | 상태 단일 변경 |
| `PATCH` | `/tasks/:taskId/priority` | 우선순위 단일 변경 |
| `PATCH` | `/tasks/:taskId/assignee` | 담당자 단일 변경 |
| `POST` | `/tasks/reorder` | 순서 저장 |
| `POST` | `/tasks/archive` | 선택 업무 보관 |
| `POST` | `/tasks/restore` | 선택 업무 복원 |
| `GET` | `/tasks/:taskId/checklists` | 체크리스트 조회 |
| `POST` | `/tasks/:taskId/checklists` | 체크리스트 생성 |
| `PATCH` | `/tasks/:taskId/checklists/:checklistId` | 체크리스트 수정 |
| `PATCH` | `/tasks/:taskId/checklists/:checklistId/toggle` | 체크 토글 |
| `DELETE` | `/tasks/:taskId/checklists/:checklistId` | 체크리스트 삭제 |
| `GET` | `/tasks/:taskId/comments` | 댓글 조회 |
| `POST` | `/tasks/:taskId/comments` | 댓글 생성 |
| `PATCH` | `/tasks/:taskId/comments/:commentId` | 댓글 수정 |
| `DELETE` | `/tasks/:taskId/comments/:commentId` | 댓글 소프트 삭제 |
| `GET` | `/tasks/:taskId/activity` | 활동 로그 조회 |

프론트 호출 예시는 `apiRequest('/tasks')`다. 글로벌 prefix 때문에 controller에는 `@Controller('tasks')`만 쓴다.

## Controller 뼈대

```ts
@Controller('tasks')
@UseGuards(AuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  list(@CurrentUser() user: UserCtx, @Query() query: Record<string, unknown>) {
    return this.tasksService.listTasks(user, query);
  }

  @Get(':taskId')
  detail(@CurrentUser() user: UserCtx, @Param('taskId') taskId: string) {
    return this.tasksService.getTaskDetail(user, taskId);
  }

  @Post()
  create(@CurrentUser() user: UserCtx, @Body() body: unknown) {
    return this.tasksService.createTask(user, body);
  }

  @Patch(':taskId')
  update(
    @CurrentUser() user: UserCtx,
    @Param('taskId') taskId: string,
    @Body() body: unknown,
  ) {
    return this.tasksService.updateTask(user, taskId, body);
  }
}
```

`UserCtx`는 별도 파일까지 만들 필요 없이 controller/service 상단에 간단히 둔다.

```ts
type UserCtx = {
  id: string;
  role: 'admin' | 'user';
  name: string;
  email: string;
};
```

## Service 구현 포인트

`src/tasks/tasks.service.ts`

### 1. 목록 조회

필터 조건:

- `archived`
- `taskType`
- `status`
- `priority`
- `assigneeId`
- `q`: `title`, `content` LIKE 검색

정렬:

- `order`: `orderIdx ASC`, `createdAt DESC`
- `recent`: `updatedAt DESC`
- `oldest`: `createdAt ASC`
- `dueDate`: `dueDate ASC`, null은 뒤로 보내기
- `priority`: `URGENT`, `HIGH`, `MEDIUM`, `LOW` 순서

Drizzle에서 복잡한 priority 정렬은 `sql`을 사용한다.

```ts
const priorityOrder = sql`
  CASE ${tasksTable.priority}
    WHEN 'URGENT' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MEDIUM' THEN 3
    WHEN 'LOW' THEN 4
    ELSE 5
  END
`;
```

응답 형태:

```ts
{
  items: TaskListItem[],
  total: number,
  page: number,
  pageSize: number
}
```

`TaskListItem`에는 reporter/assignee 이름을 포함한다. Drizzle join으로 가져오거나, 1차에서는 사용자 목록을 별도 조회해 service에서 매핑한다. 업무 수가 많지 않으면 후자가 단순하다.

### 2. 상세 조회

상세 응답에는 기본 업무 정보만 반환하고 체크리스트/댓글/활동 로그는 별도 API로 가져온다. 상세 다이얼로그가 열릴 때 필요한 탭만 조회할 수 있어서 프론트 캐시가 단순해진다.

### 3. 생성

- `reporterId`는 무조건 현재 사용자 `user.id`
- `assigneeId`가 없으면 `null`
- `orderIdx`는 현재 최대값 + 1
- 생성 후 `CREATED` activity log 기록

### 4. 수정

- PATCH 방식으로 부분 수정
- 변경 전 값을 조회한 뒤 상태/담당자/우선순위가 바뀌면 activity log 기록
- 일반 사용자는 우선 1차에서 전체 업무 수정 가능으로 둔다. 더 엄격하게 가려면 작성자, 담당자, admin만 수정하도록 `ensureCanWriteTask()`를 추가한다.

권장 권한:

| 작업 | 권한 |
|---|---|
| 목록/상세 | 로그인 사용자 |
| 생성 | 로그인 사용자 |
| 수정 | admin 또는 reporter 또는 assignee |
| 보관/복원 | admin 또는 reporter |
| 댓글 수정/삭제 | 작성자 또는 admin |
| 체크리스트 수정 | 업무 수정 가능 사용자 |

### 5. 삭제와 보관

팔란티어에는 delete와 archive가 모두 있다. towercrane 1차에서는 다음 정책이 명확하다.

- UI의 기본 삭제 버튼은 `archive`로 연결한다.
- `DELETE /tasks/:taskId`는 admin 또는 reporter만 hard delete한다.
- 보관 목록에서 복원 가능하게 한다.

### 6. 체크리스트

체크리스트는 task 상세 다이얼로그 내부 탭으로 구현한다.

- 생성 시 `orderIdx` 기본값은 max + 1
- toggle API는 boolean 반전
- 삭제는 hard delete

### 7. 댓글

댓글은 팔란티어 `work_messages`와 동일한 UX를 목표로 하되 이름을 comments로 일반화한다.

- 목록은 `deleted = false`
- 삭제는 `deleted = true`
- 수정/삭제는 작성자 또는 admin만 가능
- 응답에는 `userName`, `userEmail`을 포함한다.

### 8. 활동 로그

다음 시점에 기록한다.

| 이벤트 | fromValue | toValue |
|---|---|---|
| 생성 | null | task id |
| 상태 변경 | old status | new status |
| 담당자 변경 | old assignee id/name | new assignee id/name |
| 우선순위 변경 | old priority | new priority |
| 보관 | false | true |
| 복원 | true | false |

활동 로그는 기능 구현 중 문제가 생겨도 업무 CRUD를 막지 않도록 service 내부에서 작은 helper로 유지한다.

## 에러 처리

현재 towercrane는 Nest 기본 exception을 사용한다. 다음 예외를 사용한다.

- `NotFoundException`: task/checklist/comment 없음
- `ForbiddenException`: 수정 권한 없음
- `BadRequestException`: 잘못된 상태 전이 또는 빈 ids

## 테스트 계획

서버 테스트 파일:

```text
towercrane-for-uiux-server/src/tasks/tasks.service.spec.ts
```

우선순위:

1. `createTask`가 reporterId와 기본값을 채우는지
2. `listTasks`가 archived 기본 false로 필터링되는지
3. `updateStatus`가 상태와 activity log를 같이 남기는지
4. 댓글 수정/삭제 권한이 작성자 기준으로 동작하는지

E2E까지 추가한다면 기존 `test/app.e2e-spec.ts`에 `/api/tasks` 생성/조회/수정/보관 흐름을 붙인다.
