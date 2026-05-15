# 02. 백엔드 API / 서비스 계획

## 신규 디렉터리

```txt
towercrane-for-uiux-server/src/boards/
├── boards.module.ts
├── boards.schemas.ts
├── boards.service.ts
├── boards.controller.ts
├── admin-board-configs.controller.ts
└── admin-boards.controller.ts
```

이 프로젝트의 `tasks`, `issues` 패턴처럼 DTO는 `zod` schema로 검증하고, Controller는 얇게 둔다.

## 1. `boards.schemas.ts`

정의할 schema:

- `boardKindSchema`
- `boardStatusSchema`
- `listBoardsQuerySchema`
- `createBoardConfigSchema`
- `updateBoardConfigSchema`
- `createBoardSchema`
- `updateBoardSchema`
- `updateBoardStatusSchema`
- `createBoardCommentSchema`

권장 제한:

```ts
export const createBoardConfigSchema = z.object({
  code: z.string().trim().regex(/^[a-z0-9_-]+$/).min(2).max(80),
  kind: boardKindSchema,
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().default(''),
  allowUserWrite: z.boolean().default(false),
  allowComment: z.boolean().default(false),
  isActive: z.boolean().default(true),
  orderIdx: z.number().int().min(0).default(0),
})
```

`content`는 MVP에서 `max(20000)` 정도로 제한한다.

## 2. `boards.module.ts`

```ts
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
    BoardsController,
    AdminBoardsController,
    AdminBoardConfigsController,
  ],
  providers: [BoardsService],
})
export class BoardsModule {}
```

## 3. `boards.service.ts`

책임:

- 게시판 config 조회/생성/수정/비활성
- 사용자 게시글 목록/상세/작성/수정/삭제
- 관리자 게시글 목록/작성/수정/삭제/핀/상태변경
- 댓글/답변 작성/삭제
- 권한 검증
- `code`와 `boardId` 일치 검증

필수 내부 함수:

```ts
private parseListQuery(query: Record<string, unknown>): ListBoardsQuery
private getConfigByCode(code: string, options?: { activeOnly?: boolean })
private getBoardByCodeAndId(code: string, boardId: string)
private assertAdmin(user: BoardUser)
private assertAuthorOrAdmin(board: BoardRecord, user: BoardUser)
```

응답 형태:

```ts
type BoardListResponse = {
  items: BoardSummary[]
  total: number
  page: number
  pageSize: number
}
```

목록 정렬:

1. `pinned = true`
2. `pinned_order ASC`
3. `created_at DESC`

문의 미답변 카운트:

```sql
SELECT COUNT(*)
FROM boards b
JOIN board_configs c ON c.id = b.board_config_id
WHERE c.kind = 'INQUIRY'
  AND b.answered = 0
  AND b.deleted_at IS NULL
  AND b.status = 'PUBLISHED';
```

## 4. `boards.controller.ts`

사용자용 라우트:

```ts
@Controller('boards')
@UseGuards(AuthGuard)
export class BoardsController {
  @Get('configs')
  listActiveConfigs() {}

  @Get(':code')
  listBoards() {}

  @Get(':code/:boardId')
  getBoardDetail() {}

  @Post(':code')
  createBoard() {}

  @Patch(':code/:boardId')
  updateBoard() {}

  @Delete(':code/:boardId')
  deleteBoard() {}

  @Get(':code/:boardId/comments')
  listComments() {}

  @Post(':code/:boardId/comments')
  createComment() {}
}
```

사용자 댓글 작성은 `allowComment = true`일 때만 허용한다. 공지사항은 기본적으로 댓글 차단이다.

## 5. `admin-board-configs.controller.ts`

관리자 설정 라우트:

```ts
@Controller('admin/board-configs')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminBoardConfigsController {
  @Get()
  listAllConfigs() {}

  @Post()
  createConfig() {}

  @Patch(':code')
  updateConfig() {}

  @Delete(':code')
  deactivateConfig() {}
}
```

`DELETE`는 실제 삭제가 아니라 `isActive=false` soft 비활성 처리로 둔다.

## 6. `admin-boards.controller.ts`

관리자 게시글 라우트:

```ts
@Controller('admin/boards')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminBoardsController {
  @Get('inquiries/unanswered-count')
  getUnansweredInquiryCount() {}

  @Get(':code')
  listAdminBoards() {}

  @Post(':code')
  createAdminBoard() {}

  @Patch(':code/:boardId')
  updateAdminBoard() {}

  @Delete(':code/:boardId')
  deleteAdminBoard() {}

  @Patch(':code/:boardId/pin')
  pinBoard() {}

  @Patch(':code/:boardId/unpin')
  unpinBoard() {}

  @Patch(':code/:boardId/status')
  updateStatus() {}

  @Post(':code/:boardId/replies')
  createAdminReply() {}
}
```

답변 생성 시:

- `adminReply=true`
- `authorId=admin.id`
- `authorName=admin.name`
- 게시글 config kind가 `INQUIRY`이면 `answered=true`

답변 삭제까지 MVP에 넣는다면 관리자 댓글 삭제 API도 추가한다.

## 검증 시나리오

```bash
GET /api/boards/configs
POST /api/boards/inquiry
GET /api/boards/inquiry
GET /api/boards/inquiry/:boardId
PATCH /api/boards/inquiry/:boardId
DELETE /api/boards/inquiry/:boardId
POST /api/admin/boards/inquiry/:boardId/replies
GET /api/admin/boards/inquiries/unanswered-count
```

권한 회귀:

- 토큰 없음: 401
- 일반 사용자가 `/api/admin/boards/inquiry`: 403
- 일반 사용자가 `/api/boards/notice` POST: 403
- 작성자가 아닌 사용자가 PATCH/DELETE: 403
- `notice` URL로 `inquiry` 글 id 접근: 404

