import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  axBoardCommentsTable,
  axBoardPostsTable,
  usersTable,
  type AxBoardCategory,
} from '../database/schema';
import type {
  CreateAxBoardCommentInput,
  CreateAxBoardPostInput,
  UpdateAxBoardPostInput,
} from './dto/ax-board.schema';

@Injectable()
export class AxBoardService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  private now() {
    return new Date().toISOString();
  }

  listPosts(userId: string, category?: AxBoardCategory) {
    const base = this.db
      .select({
        id: axBoardPostsTable.id,
        userId: axBoardPostsTable.userId,
        category: axBoardPostsTable.category,
        title: axBoardPostsTable.title,
        content: axBoardPostsTable.content,
        createdAt: axBoardPostsTable.createdAt,
        updatedAt: axBoardPostsTable.updatedAt,
        authorName: usersTable.name,
      })
      .from(axBoardPostsTable)
      .innerJoin(usersTable, eq(axBoardPostsTable.userId, usersTable.id));

    const rows = (
      category ? base.where(eq(axBoardPostsTable.category, category)) : base
    )
      .orderBy(desc(axBoardPostsTable.createdAt))
      .all();

    const counts = this.db
      .select({
        postId: axBoardCommentsTable.postId,
        count: sql<number>`count(*)`,
      })
      .from(axBoardCommentsTable)
      .groupBy(axBoardCommentsTable.postId)
      .all();
    const countMap = new Map(counts.map((c) => [c.postId, Number(c.count)]));

    return rows.map((p) => ({
      ...p,
      isMine: p.userId === userId,
      commentCount: countMap.get(p.id) ?? 0,
    }));
  }

  getPost(userId: string, postId: string) {
    const post = this.db
      .select({
        id: axBoardPostsTable.id,
        userId: axBoardPostsTable.userId,
        category: axBoardPostsTable.category,
        title: axBoardPostsTable.title,
        content: axBoardPostsTable.content,
        createdAt: axBoardPostsTable.createdAt,
        updatedAt: axBoardPostsTable.updatedAt,
        authorName: usersTable.name,
      })
      .from(axBoardPostsTable)
      .innerJoin(usersTable, eq(axBoardPostsTable.userId, usersTable.id))
      .where(eq(axBoardPostsTable.id, postId))
      .get();
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    const comments = this.db
      .select({
        id: axBoardCommentsTable.id,
        postId: axBoardCommentsTable.postId,
        userId: axBoardCommentsTable.userId,
        content: axBoardCommentsTable.content,
        createdAt: axBoardCommentsTable.createdAt,
        authorName: usersTable.name,
      })
      .from(axBoardCommentsTable)
      .innerJoin(usersTable, eq(axBoardCommentsTable.userId, usersTable.id))
      .where(eq(axBoardCommentsTable.postId, postId))
      .orderBy(axBoardCommentsTable.createdAt)
      .all();

    return {
      ...post,
      isMine: post.userId === userId,
      comments: comments.map((c) => ({
        ...c,
        isMine: c.userId === userId,
      })),
    };
  }

  createPost(userId: string, input: CreateAxBoardPostInput) {
    const now = this.now();
    const id = `axpost-${randomUUID().slice(0, 12)}`;
    this.db
      .insert(axBoardPostsTable)
      .values({
        id,
        userId,
        category: input.category,
        title: input.title,
        content: input.content,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return this.getPost(userId, id);
  }

  updatePost(userId: string, postId: string, input: UpdateAxBoardPostInput) {
    this.ensurePostOwner(userId, postId);
    this.db
      .update(axBoardPostsTable)
      .set({
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
        updatedAt: this.now(),
      })
      .where(eq(axBoardPostsTable.id, postId))
      .run();
    return this.getPost(userId, postId);
  }

  deletePost(userId: string, postId: string) {
    this.ensurePostOwner(userId, postId);
    this.db
      .delete(axBoardPostsTable)
      .where(eq(axBoardPostsTable.id, postId))
      .run();
    return { success: true };
  }

  addComment(userId: string, postId: string, input: CreateAxBoardCommentInput) {
    const post = this.db
      .select()
      .from(axBoardPostsTable)
      .where(eq(axBoardPostsTable.id, postId))
      .get();
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    const now = this.now();
    const id = `axcmt-${randomUUID().slice(0, 12)}`;
    this.db
      .insert(axBoardCommentsTable)
      .values({
        id,
        postId,
        userId,
        content: input.content,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return this.getPost(userId, postId);
  }

  deleteComment(userId: string, commentId: string) {
    const comment = this.db
      .select()
      .from(axBoardCommentsTable)
      .where(eq(axBoardCommentsTable.id, commentId))
      .get();
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    if (comment.userId !== userId) {
      throw new ForbiddenException('작성자만 삭제할 수 있습니다.');
    }
    this.db
      .delete(axBoardCommentsTable)
      .where(eq(axBoardCommentsTable.id, commentId))
      .run();
    return { success: true };
  }

  private ensurePostOwner(userId: string, postId: string) {
    const post = this.db
      .select()
      .from(axBoardPostsTable)
      .where(eq(axBoardPostsTable.id, postId))
      .get();
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    if (post.userId !== userId) {
      throw new ForbiddenException('작성자만 수정할 수 있습니다.');
    }
    return post;
  }
}
