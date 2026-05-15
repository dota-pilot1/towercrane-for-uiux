# 단계 2 — 백엔드 Issues 모듈

## 생성할 파일 (4개)

```
towercrane-for-uiux-server/src/issues/
├── issues.module.ts
├── issues.controller.ts
├── issues.service.ts
└── issues.schemas.ts
```

> 패턴: `src/tasks/` 폴더 구조와 100% 동일하게 구성.

---

## issues.schemas.ts

```ts
import { z } from 'zod'

export const issueTypeSchema = z.enum(['BUG', 'FEATURE', 'IMPROVEMENT', 'QUESTION', 'OTHER'])
export const issueStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'TESTING', 'CLOSED'])
export const issuePrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])

export const listIssuesQuerySchema = z.object({
  prototypeId: z.string(),                    // 필수 — 프로토타입별 필터
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().optional(),
  issueType: issueTypeSchema.optional(),
  status: issueStatusSchema.optional(),
  priority: issuePrioritySchema.optional(),
  assigneeId: z.string().optional(),
  sort: z.enum(['order', 'recent', 'oldest', 'priority']).default('order'),
})

export const createIssueSchema = z.object({
  prototypeId: z.string(),
  title: z.string().min(1).max(200),
  content: z.string().max(5000).default(''),
  issueType: issueTypeSchema.default('BUG'),
  status: issueStatusSchema.default('OPEN'),
  priority: issuePrioritySchema.default('MEDIUM'),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
})

export const updateIssueSchema = createIssueSchema.partial().omit({ prototypeId: true })

export const updateIssueStatusSchema = z.object({
  status: issueStatusSchema,
})

export const reorderIssuesSchema = z.object({
  items: z.array(z.object({ id: z.string(), orderIdx: z.number().int() })),
})

export const createIssueCommentSchema = z.object({
  content: z.string().min(1).max(2000),
})

export const updateIssueCommentSchema = z.object({
  content: z.string().min(1).max(2000),
})
```

---

## issues.controller.ts — API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/issues` | 이슈 목록 (`?prototypeId=` 필수) |
| POST | `/issues` | 이슈 생성 |
| GET | `/issues/:issueId` | 이슈 상세 |
| PATCH | `/issues/:issueId` | 이슈 수정 |
| DELETE | `/issues/:issueId` | 이슈 삭제 |
| PATCH | `/issues/:issueId/status` | 상태만 변경 (칸반 드래그) |
| POST | `/issues/reorder` | 순서 변경 |
| GET | `/issues/:issueId/comments` | 댓글 목록 |
| POST | `/issues/:issueId/comments` | 댓글 추가 |
| PATCH | `/issues/:issueId/comments/:commentId` | 댓글 수정 |
| DELETE | `/issues/:issueId/comments/:commentId` | 댓글 삭제 (soft) |

```ts
// 핵심 컨트롤러 구조 (tasks.controller.ts 패턴 그대로)
@Controller('issues')
@UseGuards(AuthGuard)
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Get()
  listIssues(@Query() query: unknown, @CurrentUser() user: AuthUser) { ... }

  @Post()
  createIssue(@Body() body: unknown, @CurrentUser() user: AuthUser) { ... }

  @Get(':issueId')
  getIssue(@Param('issueId') issueId: string) { ... }

  @Patch(':issueId')
  updateIssue(@Param('issueId') issueId: string, @Body() body: unknown, @CurrentUser() user: AuthUser) { ... }

  @Delete(':issueId')
  deleteIssue(@Param('issueId') issueId: string, @CurrentUser() user: AuthUser) { ... }

  @Patch(':issueId/status')
  updateStatus(@Param('issueId') issueId: string, @Body() body: unknown, @CurrentUser() user: AuthUser) { ... }

  @Post('reorder')
  reorder(@Body() body: unknown) { ... }

  // 댓글 CRUD (listComments, createComment, updateComment, deleteComment)
}
```

---

## issues.service.ts — 핵심 메서드

```ts
export class IssuesService {
  // 조회
  async listIssues(query: ListIssuesQuery): Promise<{ items: Issue[]; total: number; page: number; pageSize: number }>
  async getIssueDetail(issueId: string): Promise<Issue>

  // CRUD
  async createIssue(body: CreateIssueBody, reporterId: string): Promise<Issue>
  async updateIssue(issueId: string, body: UpdateIssueBody, userId: string): Promise<Issue>
  async deleteIssue(issueId: string, userId: string): Promise<void>
  async updateIssueStatus(issueId: string, status: IssueStatus, userId: string): Promise<Issue>
  async reorderIssues(items: { id: string; orderIdx: number }[]): Promise<void>

  // 댓글
  async listComments(issueId: string): Promise<IssueComment[]>
  async createComment(issueId: string, content: string, userId: string): Promise<IssueComment>
  async updateComment(issueId: string, commentId: string, content: string, userId: string): Promise<IssueComment>
  async deleteComment(issueId: string, commentId: string, userId: string): Promise<void>

  // 내부 권한 헬퍼
  private async ensureCanWriteIssue(issueId: string, userId: string): Promise<Issue>
  private async ensureCanEditComment(commentId: string, userId: string): Promise<IssueComment>
}
```

### listIssues 쿼리 로직 (Drizzle ORM)

```ts
// reporter, assignee JOIN으로 이름/이메일 포함
// prototypeId WHERE 조건 필수
// 정렬: order(orderIdx), recent(updatedAt desc), oldest(createdAt asc), priority(URGENT>HIGH>MEDIUM>LOW)
// 페이징: limit/offset
```

---

## issues.module.ts

```ts
@Module({
  imports: [DatabaseModule],
  controllers: [IssuesController],
  providers: [IssuesService],
})
export class IssuesModule {}
```

## app.module.ts 수정

```ts
// IssuesModule을 imports 배열에 추가
imports: [
  ...,
  TasksModule,
  IssuesModule,   // ← 추가
],
```
