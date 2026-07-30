import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, like, or, sql, type SQL } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  projectDiscussionBoardsTable,
  projectDiscussionPostsTable,
  usersTable,
  type ProjectDiscussionBoardInsert,
  type ProjectDiscussionBoardRow,
  type ProjectDiscussionPostInsert,
  type ProjectDiscussionPostRow,
} from '../database/schema';
import {
  createProjectBoardPostSchema,
  createProjectBoardSchema,
  listProjectBoardPostsQuerySchema,
  updateProjectBoardPostSchema,
  updateProjectBoardSchema,
} from './dto/project-board.schema';

export type ProjectBoardUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

@Injectable()
export class ProjectBoardService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  listBoards(user: ProjectBoardUser) {
    this.ensureSignedIn(user);
    const rows = this.db
      .select({
        board: projectDiscussionBoardsTable,
        createdByName: usersTable.name,
        postCount: sql<number>`COUNT(${projectDiscussionPostsTable.id})`,
        lastPostAt: sql<
          string | null
        >`MAX(${projectDiscussionPostsTable.updatedAt})`,
      })
      .from(projectDiscussionBoardsTable)
      .leftJoin(
        usersTable,
        eq(usersTable.id, projectDiscussionBoardsTable.createdBy),
      )
      .leftJoin(
        projectDiscussionPostsTable,
        eq(
          projectDiscussionPostsTable.boardId,
          projectDiscussionBoardsTable.id,
        ),
      )
      .groupBy(projectDiscussionBoardsTable.id)
      .orderBy(
        asc(projectDiscussionBoardsTable.orderIdx),
        asc(projectDiscussionBoardsTable.createdAt),
      )
      .all();

    return rows.map((row) =>
      this.toBoardDto(
        row.board,
        user,
        row.createdByName ?? '알 수 없음',
        Number(row.postCount ?? 0),
        row.lastPostAt,
      ),
    );
  }

  createBoard(user: ProjectBoardUser, payload: unknown) {
    this.ensureSignedIn(user);
    const input = createProjectBoardSchema.parse(payload);
    const now = new Date().toISOString();
    const row: ProjectDiscussionBoardInsert = {
      id: `project-board-${randomUUID().slice(0, 12)}`,
      name: input.name,
      description: input.description,
      orderIdx: input.orderIdx,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(projectDiscussionBoardsTable).values(row).run();
    return this.toBoardDto(
      this.ensureBoard(row.id),
      user,
      user.name || user.email,
      0,
      null,
    );
  }

  updateBoard(user: ProjectBoardUser, boardId: string, payload: unknown) {
    const board = this.ensureBoard(boardId);
    this.ensureCanWriteBoard(user, board);
    const input = updateProjectBoardSchema.parse(payload);
    const changes: Partial<ProjectDiscussionBoardInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (input.name !== undefined) changes.name = input.name;
    if (input.description !== undefined)
      changes.description = input.description;
    if (input.orderIdx !== undefined) changes.orderIdx = input.orderIdx;

    this.db
      .update(projectDiscussionBoardsTable)
      .set(changes)
      .where(eq(projectDiscussionBoardsTable.id, boardId))
      .run();

    return this.listBoards(user).find((item) => item.id === boardId);
  }

  deleteBoard(user: ProjectBoardUser, boardId: string) {
    const board = this.ensureBoard(boardId);
    this.ensureCanWriteBoard(user, board);
    this.db
      .delete(projectDiscussionBoardsTable)
      .where(eq(projectDiscussionBoardsTable.id, boardId))
      .run();
    return { success: true, id: boardId };
  }

  listPosts(user: ProjectBoardUser, boardId: string, rawQuery: unknown) {
    this.ensureSignedIn(user);
    this.ensureBoard(boardId);
    const query = listProjectBoardPostsQuerySchema.parse(rawQuery ?? {});
    const conditions: SQL[] = [
      eq(projectDiscussionPostsTable.boardId, boardId),
    ];

    if (query.q) {
      const keyword = `%${query.q}%`;
      const keywordCondition = or(
        like(projectDiscussionPostsTable.title, keyword),
        like(projectDiscussionPostsTable.content, keyword),
      );
      if (keywordCondition) conditions.push(keywordCondition);
    }

    const rows = this.db
      .select({
        post: projectDiscussionPostsTable,
        createdByName: usersTable.name,
      })
      .from(projectDiscussionPostsTable)
      .leftJoin(
        usersTable,
        eq(usersTable.id, projectDiscussionPostsTable.createdBy),
      )
      .where(and(...conditions))
      .orderBy(desc(projectDiscussionPostsTable.updatedAt))
      .all();

    return rows.map((row) =>
      this.toPostSummaryDto(row.post, row.createdByName ?? '알 수 없음'),
    );
  }

  createPost(user: ProjectBoardUser, boardId: string, payload: unknown) {
    this.ensureSignedIn(user);
    this.ensureBoard(boardId);
    const input = createProjectBoardPostSchema.parse(payload);
    const now = new Date().toISOString();
    const row: ProjectDiscussionPostInsert = {
      id: `project-post-${randomUUID().slice(0, 12)}`,
      boardId,
      title: input.title,
      content: input.content,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(projectDiscussionPostsTable).values(row).run();
    this.touchBoard(boardId, now);
    return this.detailPost(user, row.id);
  }

  detailPost(user: ProjectBoardUser, postId: string) {
    this.ensureSignedIn(user);
    const post = this.ensurePost(postId);
    return this.toPostDetailDto(post, this.getUserName(post.createdBy), user);
  }

  updatePost(user: ProjectBoardUser, postId: string, payload: unknown) {
    const post = this.ensurePost(postId);
    this.ensureCanWritePost(user, post);
    const input = updateProjectBoardPostSchema.parse(payload);
    const now = new Date().toISOString();
    const changes: Partial<ProjectDiscussionPostInsert> = { updatedAt: now };

    if (input.title !== undefined) changes.title = input.title;
    if (input.content !== undefined) changes.content = input.content;

    this.db
      .update(projectDiscussionPostsTable)
      .set(changes)
      .where(eq(projectDiscussionPostsTable.id, postId))
      .run();
    this.touchBoard(post.boardId, now);

    return this.detailPost(user, postId);
  }

  deletePost(user: ProjectBoardUser, postId: string) {
    const post = this.ensurePost(postId);
    this.ensureCanWritePost(user, post);
    this.db
      .delete(projectDiscussionPostsTable)
      .where(eq(projectDiscussionPostsTable.id, postId))
      .run();
    this.touchBoard(post.boardId, new Date().toISOString());
    return { success: true, id: postId, boardId: post.boardId };
  }

  private ensureBoard(boardId: string) {
    const row = this.db
      .select()
      .from(projectDiscussionBoardsTable)
      .where(eq(projectDiscussionBoardsTable.id, boardId))
      .get();
    if (!row) throw new NotFoundException('게시판을 찾을 수 없습니다.');
    return row;
  }

  private ensurePost(postId: string) {
    const row = this.db
      .select()
      .from(projectDiscussionPostsTable)
      .where(eq(projectDiscussionPostsTable.id, postId))
      .get();
    if (!row) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    return row;
  }

  private touchBoard(boardId: string, now: string) {
    this.db
      .update(projectDiscussionBoardsTable)
      .set({ updatedAt: now })
      .where(eq(projectDiscussionBoardsTable.id, boardId))
      .run();
  }

  private getUserName(userId: string) {
    const user = this.db
      .select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .get();
    return user?.name || user?.email || '알 수 없음';
  }

  private ensureCanWriteBoard(
    user: ProjectBoardUser,
    board: ProjectDiscussionBoardRow,
  ) {
    this.ensureSignedIn(user);
    if (user.role === 'admin' || board.createdBy === user.id) return;
    throw new ForbiddenException('이 게시판을 수정할 권한이 없습니다.');
  }

  private ensureCanWritePost(
    user: ProjectBoardUser,
    post: ProjectDiscussionPostRow,
  ) {
    this.ensureSignedIn(user);
    if (user.role === 'admin' || post.createdBy === user.id) return;
    throw new ForbiddenException('이 게시글을 수정할 권한이 없습니다.');
  }

  private ensureSignedIn(user: ProjectBoardUser) {
    if (!user?.id) throw new ForbiddenException('로그인이 필요합니다.');
  }

  private toBoardDto(
    board: ProjectDiscussionBoardRow,
    user: ProjectBoardUser,
    createdByName: string,
    postCount: number,
    lastPostAt: string | null,
  ) {
    return {
      id: board.id,
      name: board.name,
      description: board.description,
      orderIdx: board.orderIdx,
      createdBy: board.createdBy,
      createdByName,
      postCount,
      lastPostAt,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      canEdit: user.role === 'admin' || board.createdBy === user.id,
      canDelete: user.role === 'admin' || board.createdBy === user.id,
    };
  }

  private toPostSummaryDto(
    post: ProjectDiscussionPostRow,
    createdByName: string,
  ) {
    return {
      id: post.id,
      boardId: post.boardId,
      title: post.title,
      content: post.content,
      createdBy: post.createdBy,
      createdByName,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  private toPostDetailDto(
    post: ProjectDiscussionPostRow,
    createdByName: string,
    user: ProjectBoardUser,
  ) {
    return {
      ...this.toPostSummaryDto(post, createdByName),
      canEdit: user.role === 'admin' || post.createdBy === user.id,
      canDelete: user.role === 'admin' || post.createdBy === user.id,
    };
  }
}
