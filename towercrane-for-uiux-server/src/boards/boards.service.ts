import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, like, sql, type SQL } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  boardCommentsTable,
  boardConfigsTable,
  boardsTable,
  type BoardCommentInsert,
  type BoardCommentRow,
  type BoardConfigInsert,
  type BoardConfigRow,
  type BoardInsert,
  type BoardKind,
  type BoardRow,
  type BoardStatus,
} from '../database/schema';
import {
  createBoardCommentSchema,
  createBoardConfigSchema,
  createBoardSchema,
  listBoardsQuerySchema,
  updateBoardConfigSchema,
  updateBoardSchema,
  updateBoardStatusSchema,
  type ListBoardsQuery,
} from './boards.schemas';

export type BoardUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

@Injectable()
export class BoardsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  listActiveConfigs() {
    return this.db
      .select()
      .from(boardConfigsTable)
      .where(eq(boardConfigsTable.isActive, true))
      .orderBy(asc(boardConfigsTable.orderIdx), asc(boardConfigsTable.name))
      .all()
      .map((config) => this.toConfigDto(config));
  }

  listAllConfigs() {
    return this.db
      .select()
      .from(boardConfigsTable)
      .orderBy(asc(boardConfigsTable.orderIdx), asc(boardConfigsTable.name))
      .all()
      .map((config) => this.toConfigDto(config));
  }

  createConfig(payload: unknown) {
    const input = createBoardConfigSchema.parse(payload);
    const existing = this.db
      .select()
      .from(boardConfigsTable)
      .where(eq(boardConfigsTable.code, input.code))
      .get();

    if (existing) {
      throw new BadRequestException('이미 사용 중인 게시판 코드입니다.');
    }

    const now = new Date().toISOString();
    const row: BoardConfigInsert = {
      id: `board-config-${randomUUID().slice(0, 12)}`,
      code: input.code,
      kind: input.kind,
      name: input.name,
      description: input.description || null,
      allowUserWrite: input.allowUserWrite,
      allowComment: input.allowComment,
      isActive: input.isActive,
      orderIdx: input.orderIdx,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(boardConfigsTable).values(row).run();
    return this.toConfigDto(this.ensureConfigByCode(input.code));
  }

  updateConfig(code: string, payload: unknown) {
    const config = this.ensureConfigByCode(code);
    const input = updateBoardConfigSchema.parse(payload);
    const changes: Partial<BoardConfigInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (input.kind !== undefined) changes.kind = input.kind;
    if (input.name !== undefined) changes.name = input.name;
    if (input.description !== undefined) {
      changes.description = input.description || null;
    }
    if (input.allowUserWrite !== undefined) {
      changes.allowUserWrite = input.allowUserWrite;
    }
    if (input.allowComment !== undefined)
      changes.allowComment = input.allowComment;
    if (input.isActive !== undefined) changes.isActive = input.isActive;
    if (input.orderIdx !== undefined) changes.orderIdx = input.orderIdx;

    this.db
      .update(boardConfigsTable)
      .set(changes)
      .where(eq(boardConfigsTable.id, config.id))
      .run();

    return this.toConfigDto(this.ensureConfigByCode(code));
  }

  deactivateConfig(code: string) {
    this.updateConfig(code, { isActive: false });
    return { success: true };
  }

  listBoards(code: string, rawQuery: unknown, admin = false) {
    const config = this.ensureConfigByCode(code, { activeOnly: !admin });
    const query = listBoardsQuerySchema.parse(rawQuery ?? {});
    const conditions = this.buildBoardConditions(config, query, admin);
    const offset = (query.page - 1) * query.pageSize;

    const rows = this.db
      .select()
      .from(boardsTable)
      .where(and(...conditions))
      .orderBy(
        desc(boardsTable.pinned),
        asc(boardsTable.pinnedOrder),
        desc(boardsTable.createdAt),
      )
      .limit(query.pageSize)
      .offset(offset)
      .all();

    const totalRow = this.db
      .select({ count: sql<number>`count(*)` })
      .from(boardsTable)
      .where(and(...conditions))
      .get();

    return {
      config: this.toConfigDto(config),
      items: rows.map((board) => this.toBoardSummaryDto(board, config)),
      total: Number(totalRow?.count ?? 0),
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  getBoardDetail(
    code: string,
    boardId: string,
    user: BoardUser,
    admin = false,
  ) {
    const { config, board } = this.ensureBoardByCodeAndId(code, boardId, {
      activeOnly: !admin,
    });

    if (!admin && board.status !== 'PUBLISHED') {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    if (!admin) {
      this.db
        .update(boardsTable)
        .set({
          viewCount: board.viewCount + 1,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(boardsTable.id, board.id))
        .run();
    }

    const fresh = this.ensureBoard(board.id);
    return this.toBoardDetailDto(fresh, config, user);
  }

  createBoard(code: string, user: BoardUser, payload: unknown, admin = false) {
    const config = this.ensureConfigByCode(code, { activeOnly: !admin });

    if (!admin && !config.allowUserWrite) {
      throw new ForbiddenException('이 게시판에는 글을 작성할 수 없습니다.');
    }

    const input = createBoardSchema.parse(payload);
    const now = new Date().toISOString();
    const row: BoardInsert = {
      id: `board-${randomUUID().slice(0, 12)}`,
      boardConfigId: config.id,
      authorId: user.id,
      authorName: user.name || user.email,
      title: input.title,
      content: input.content,
      status: 'PUBLISHED',
      pinned: false,
      pinnedOrder: null,
      answered: false,
      viewCount: 0,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(boardsTable).values(row).run();
    return this.getBoardDetail(code, row.id, user, true);
  }

  updateBoard(
    code: string,
    boardId: string,
    user: BoardUser,
    payload: unknown,
    admin = false,
  ) {
    const { board } = this.ensureBoardByCodeAndId(code, boardId, {
      activeOnly: !admin,
    });
    if (!admin) this.assertAuthorOrAdmin(board, user);

    const input = updateBoardSchema.parse(payload);
    const changes: Partial<BoardInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (input.title !== undefined) changes.title = input.title;
    if (input.content !== undefined) changes.content = input.content;

    this.db
      .update(boardsTable)
      .set(changes)
      .where(eq(boardsTable.id, boardId))
      .run();

    return this.getBoardDetail(code, boardId, user, true);
  }

  deleteBoard(code: string, boardId: string, user: BoardUser, admin = false) {
    const { board } = this.ensureBoardByCodeAndId(code, boardId, {
      activeOnly: !admin,
    });
    if (!admin) this.assertAuthorOrAdmin(board, user);

    this.db
      .update(boardsTable)
      .set({
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(boardsTable.id, board.id))
      .run();

    return { success: true };
  }

  updateBoardStatus(code: string, boardId: string, payload: unknown) {
    this.ensureBoardByCodeAndId(code, boardId, { activeOnly: false });
    const input = updateBoardStatusSchema.parse(payload);

    this.db
      .update(boardsTable)
      .set({ status: input.status, updatedAt: new Date().toISOString() })
      .where(eq(boardsTable.id, boardId))
      .run();

    return { success: true };
  }

  pinBoard(code: string, boardId: string) {
    const { config, board } = this.ensureBoardByCodeAndId(code, boardId, {
      activeOnly: false,
    });
    const maxPinnedOrder = this.db
      .select({ pinnedOrder: boardsTable.pinnedOrder })
      .from(boardsTable)
      .where(
        and(
          eq(boardsTable.boardConfigId, config.id),
          eq(boardsTable.pinned, true),
          sql`${boardsTable.deletedAt} IS NULL`,
        ),
      )
      .all()
      .reduce((max, row) => Math.max(max, row.pinnedOrder ?? -1), -1);

    this.db
      .update(boardsTable)
      .set({
        pinned: true,
        pinnedOrder: board.pinnedOrder ?? maxPinnedOrder + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(boardsTable.id, board.id))
      .run();

    return { success: true };
  }

  unpinBoard(code: string, boardId: string) {
    const { board } = this.ensureBoardByCodeAndId(code, boardId, {
      activeOnly: false,
    });
    this.db
      .update(boardsTable)
      .set({
        pinned: false,
        pinnedOrder: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(boardsTable.id, board.id))
      .run();

    return { success: true };
  }

  listComments(code: string, boardId: string, admin = false) {
    this.ensureBoardByCodeAndId(code, boardId, { activeOnly: !admin });
    return this.db
      .select()
      .from(boardCommentsTable)
      .where(
        and(
          eq(boardCommentsTable.boardId, boardId),
          eq(boardCommentsTable.deleted, false),
        ),
      )
      .orderBy(asc(boardCommentsTable.createdAt))
      .all()
      .map((comment) => this.toCommentDto(comment));
  }

  createComment(
    code: string,
    boardId: string,
    user: BoardUser,
    payload: unknown,
    adminReply = false,
  ) {
    const { config, board } = this.ensureBoardByCodeAndId(code, boardId, {
      activeOnly: !adminReply,
    });
    if (!config.allowComment && !adminReply) {
      throw new ForbiddenException('이 게시판은 댓글을 허용하지 않습니다.');
    }

    const input = createBoardCommentSchema.parse(payload);
    const now = new Date().toISOString();
    const row: BoardCommentInsert = {
      id: `board-comment-${randomUUID().slice(0, 12)}`,
      boardId: board.id,
      authorId: user.id,
      authorName: user.name || user.email,
      content: input.content,
      adminReply,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(boardCommentsTable).values(row).run();

    if (adminReply && config.kind === 'INQUIRY' && !board.answered) {
      this.db
        .update(boardsTable)
        .set({ answered: true, updatedAt: now })
        .where(eq(boardsTable.id, board.id))
        .run();
    }

    return this.toCommentDto(this.ensureComment(row.id));
  }

  unansweredInquiryCount() {
    const inquiryConfigs = this.db
      .select({ id: boardConfigsTable.id })
      .from(boardConfigsTable)
      .where(eq(boardConfigsTable.kind, 'INQUIRY'))
      .all();

    if (inquiryConfigs.length === 0) return { count: 0 };

    const count = inquiryConfigs.reduce((sum, config) => {
      const row = this.db
        .select({ count: sql<number>`count(*)` })
        .from(boardsTable)
        .where(
          and(
            eq(boardsTable.boardConfigId, config.id),
            eq(boardsTable.status, 'PUBLISHED'),
            eq(boardsTable.answered, false),
            sql`${boardsTable.deletedAt} IS NULL`,
          ),
        )
        .get();
      return sum + Number(row?.count ?? 0);
    }, 0);

    return { count };
  }

  private buildBoardConditions(
    config: BoardConfigRow,
    query: ListBoardsQuery,
    admin: boolean,
  ) {
    const conditions: SQL[] = [
      eq(boardsTable.boardConfigId, config.id),
      sql`${boardsTable.deletedAt} IS NULL`,
    ];

    if (admin) {
      if (query.status) conditions.push(eq(boardsTable.status, query.status));
    } else {
      conditions.push(eq(boardsTable.status, 'PUBLISHED'));
    }

    if (query.q) {
      const pattern = `%${query.q}%`;
      conditions.push(
        sql`(${boardsTable.title} LIKE ${pattern} OR ${boardsTable.content} LIKE ${pattern})`,
      );
    }

    return conditions;
  }

  private ensureConfigByCode(
    code: string,
    options: { activeOnly?: boolean } = {},
  ) {
    const config = this.db
      .select()
      .from(boardConfigsTable)
      .where(eq(boardConfigsTable.code, code))
      .get();

    if (!config || (options.activeOnly && !config.isActive)) {
      throw new NotFoundException('게시판을 찾을 수 없습니다.');
    }

    return config;
  }

  private ensureBoard(boardId: string) {
    const board = this.db
      .select()
      .from(boardsTable)
      .where(
        and(eq(boardsTable.id, boardId), sql`${boardsTable.deletedAt} IS NULL`),
      )
      .get();

    if (!board) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    return board;
  }

  private ensureBoardByCodeAndId(
    code: string,
    boardId: string,
    options: { activeOnly?: boolean } = {},
  ) {
    const config = this.ensureConfigByCode(code, options);
    const board = this.ensureBoard(boardId);

    if (board.boardConfigId !== config.id) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    return { config, board };
  }

  private ensureComment(commentId: string) {
    const comment = this.db
      .select()
      .from(boardCommentsTable)
      .where(
        and(
          eq(boardCommentsTable.id, commentId),
          eq(boardCommentsTable.deleted, false),
        ),
      )
      .get();

    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    return comment;
  }

  private assertAuthorOrAdmin(board: BoardRow, user: BoardUser) {
    if (user.role === 'admin') return;
    if (board.authorId === user.id) return;
    throw new ForbiddenException('작성자만 수정할 수 있습니다.');
  }

  private toConfigDto(config: BoardConfigRow) {
    return {
      id: config.id,
      code: config.code,
      kind: config.kind,
      name: config.name,
      description: config.description,
      allowUserWrite: config.allowUserWrite,
      allowComment: config.allowComment,
      isActive: config.isActive,
      orderIdx: config.orderIdx,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  private toBoardSummaryDto(board: BoardRow, config: BoardConfigRow) {
    return {
      id: board.id,
      boardCode: config.code,
      boardName: config.name,
      title: board.title,
      authorId: board.authorId,
      authorName: board.authorName,
      status: board.status,
      pinned: board.pinned,
      answered: board.answered,
      viewCount: board.viewCount,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
    };
  }

  private toBoardDetailDto(
    board: BoardRow,
    config: BoardConfigRow,
    user: BoardUser,
  ) {
    return {
      ...this.toBoardSummaryDto(board, config),
      content: board.content,
      canEdit: user.role === 'admin' || board.authorId === user.id,
    };
  }

  private toCommentDto(comment: BoardCommentRow) {
    return {
      id: comment.id,
      boardId: comment.boardId,
      authorId: comment.authorId,
      authorName: comment.authorName,
      content: comment.content,
      adminReply: comment.adminReply,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
