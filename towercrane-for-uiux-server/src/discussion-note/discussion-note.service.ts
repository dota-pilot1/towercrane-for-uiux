import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, isNull, like, or, sql, type SQL } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  discussionNoteCommentsTable,
  discussionNotesTable,
  usersTable,
  type DiscussionNoteCommentInsert,
  type DiscussionNoteCommentRow,
  type DiscussionNoteInsert,
  type DiscussionNoteRow,
} from '../database/schema';
import {
  createDiscussionNoteCommentSchema,
  createDiscussionNoteSchema,
  listDiscussionNotesQuerySchema,
  updateDiscussionNoteCommentSchema,
  updateDiscussionNoteSchema,
} from './dto/discussion-note.schema';

export type DiscussionNoteUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

@Injectable()
export class DiscussionNoteService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  list(user: DiscussionNoteUser, rawQuery: unknown) {
    this.ensureSignedIn(user);
    const query = listDiscussionNotesQuerySchema.parse(rawQuery ?? {});
    const conditions: SQL[] = [];

    if (query.q) {
      const keyword = `%${query.q}%`;
      const keywordCondition = or(
        like(discussionNotesTable.title, keyword),
        like(discussionNotesTable.content, keyword),
        like(discussionNotesTable.decisionSummary, keyword),
      );
      if (keywordCondition) conditions.push(keywordCondition);
    }

    if (query.status) {
      conditions.push(eq(discussionNotesTable.status, query.status));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = this.db
      .select({
        note: discussionNotesTable,
        createdByName: usersTable.name,
        commentCount: sql<number>`COUNT(${discussionNoteCommentsTable.id})`,
        lastCommentAt: sql<string | null>`MAX(${discussionNoteCommentsTable.createdAt})`,
      })
      .from(discussionNotesTable)
      .leftJoin(usersTable, eq(usersTable.id, discussionNotesTable.createdBy))
      .leftJoin(
        discussionNoteCommentsTable,
        and(
          eq(
            discussionNoteCommentsTable.discussionNoteId,
            discussionNotesTable.id,
          ),
          isNull(discussionNoteCommentsTable.deletedAt),
        ),
      )
      .where(where)
      .groupBy(discussionNotesTable.id)
      .orderBy(desc(discussionNotesTable.updatedAt))
      .all();

    return rows.map((row) =>
      this.toSummaryDto(
        row.note,
        row.createdByName ?? '알 수 없음',
        Number(row.commentCount ?? 0),
        row.lastCommentAt,
      ),
    );
  }

  create(user: DiscussionNoteUser, payload: unknown) {
    this.ensureSignedIn(user);
    const input = createDiscussionNoteSchema.parse(payload);
    const now = new Date().toISOString();
    const row: DiscussionNoteInsert = {
      id: `discussion-note-${randomUUID().slice(0, 12)}`,
      ...input,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(discussionNotesTable).values(row).run();
    return this.detail(user, row.id);
  }

  detail(user: DiscussionNoteUser, noteId: string) {
    this.ensureSignedIn(user);
    const row = this.ensureNote(noteId);
    const createdByName = this.getUserName(row.createdBy);
    const comments = this.listComments(noteId);
    return this.toDetailDto(row, user, createdByName, comments);
  }

  update(user: DiscussionNoteUser, noteId: string, payload: unknown) {
    const row = this.ensureNote(noteId);
    this.ensureCanWrite(user, row);
    const input = updateDiscussionNoteSchema.parse(payload);
    this.db
      .update(discussionNotesTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(discussionNotesTable.id, noteId))
      .run();
    return this.detail(user, noteId);
  }

  delete(user: DiscussionNoteUser, noteId: string) {
    const row = this.ensureNote(noteId);
    this.ensureCanWrite(user, row);
    this.db
      .delete(discussionNotesTable)
      .where(eq(discussionNotesTable.id, noteId))
      .run();
    return { success: true, id: noteId };
  }

  createComment(user: DiscussionNoteUser, noteId: string, payload: unknown) {
    this.ensureSignedIn(user);
    this.ensureNote(noteId);
    const input = createDiscussionNoteCommentSchema.parse(payload);
    const now = new Date().toISOString();
    const row: DiscussionNoteCommentInsert = {
      id: `discussion-comment-${randomUUID().slice(0, 12)}`,
      discussionNoteId: noteId,
      content: input.content,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    this.db.insert(discussionNoteCommentsTable).values(row).run();
    this.touchNote(noteId, now);
    return this.toCommentDto(
      this.ensureComment(row.id),
      user.name || user.email,
      user,
    );
  }

  updateComment(
    user: DiscussionNoteUser,
    commentId: string,
    payload: unknown,
  ) {
    const comment = this.ensureComment(commentId);
    this.ensureCanWriteComment(user, comment);
    const input = updateDiscussionNoteCommentSchema.parse(payload);
    const now = new Date().toISOString();
    this.db
      .update(discussionNoteCommentsTable)
      .set({ ...input, updatedAt: now })
      .where(eq(discussionNoteCommentsTable.id, commentId))
      .run();
    this.touchNote(comment.discussionNoteId, now);
    const updated = this.ensureComment(commentId);
    return this.toCommentDto(updated, this.getUserName(updated.createdBy), user);
  }

  deleteComment(user: DiscussionNoteUser, commentId: string) {
    const comment = this.ensureComment(commentId);
    this.ensureCanWriteComment(user, comment);
    const now = new Date().toISOString();
    this.db
      .update(discussionNoteCommentsTable)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(discussionNoteCommentsTable.id, commentId))
      .run();
    this.touchNote(comment.discussionNoteId, now);
    return { success: true, id: commentId };
  }

  private ensureNote(noteId: string) {
    const row = this.db
      .select()
      .from(discussionNotesTable)
      .where(eq(discussionNotesTable.id, noteId))
      .get();
    if (!row) {
      throw new NotFoundException(`의사결정 노트를 찾을 수 없습니다: ${noteId}`);
    }
    return row;
  }

  private ensureComment(commentId: string) {
    const row = this.db
      .select()
      .from(discussionNoteCommentsTable)
      .where(
        and(
          eq(discussionNoteCommentsTable.id, commentId),
          isNull(discussionNoteCommentsTable.deletedAt),
        ),
      )
      .get();
    if (!row) {
      throw new NotFoundException(`댓글을 찾을 수 없습니다: ${commentId}`);
    }
    return row;
  }

  private listComments(noteId: string) {
    return this.db
      .select({
        comment: discussionNoteCommentsTable,
        createdByName: usersTable.name,
      })
      .from(discussionNoteCommentsTable)
      .leftJoin(usersTable, eq(usersTable.id, discussionNoteCommentsTable.createdBy))
      .where(
        and(
          eq(discussionNoteCommentsTable.discussionNoteId, noteId),
          isNull(discussionNoteCommentsTable.deletedAt),
        ),
      )
      .orderBy(discussionNoteCommentsTable.createdAt)
      .all();
  }

  private getUserName(userId: string) {
    const user = this.db
      .select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .get();
    return user?.name || user?.email || '알 수 없음';
  }

  private touchNote(noteId: string, now: string) {
    this.db
      .update(discussionNotesTable)
      .set({ updatedAt: now })
      .where(eq(discussionNotesTable.id, noteId))
      .run();
  }

  private ensureCanWrite(user: DiscussionNoteUser, row: DiscussionNoteRow) {
    this.ensureSignedIn(user);
    if (user.role === 'admin' || row.createdBy === user.id) return;
    throw new ForbiddenException('이 의사결정 노트를 수정할 권한이 없습니다.');
  }

  private ensureCanWriteComment(
    user: DiscussionNoteUser,
    row: DiscussionNoteCommentRow,
  ) {
    this.ensureSignedIn(user);
    if (user.role === 'admin' || row.createdBy === user.id) return;
    throw new ForbiddenException('이 댓글을 수정할 권한이 없습니다.');
  }

  private ensureSignedIn(user: DiscussionNoteUser) {
    if (!user?.id) throw new ForbiddenException('로그인이 필요합니다.');
  }

  private toSummaryDto(
    row: DiscussionNoteRow,
    createdByName: string,
    commentCount: number,
    lastCommentAt: string | null,
  ) {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      decisionSummary: row.decisionSummary,
      status: row.status,
      priority: row.priority,
      createdBy: row.createdBy,
      createdByName,
      commentCount,
      lastCommentAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toDetailDto(
    row: DiscussionNoteRow,
    user: DiscussionNoteUser,
    createdByName: string,
    comments: Array<{
      comment: DiscussionNoteCommentRow;
      createdByName: string | null;
    }>,
  ) {
    return {
      ...this.toSummaryDto(
        row,
        createdByName,
        comments.length,
        comments.at(-1)?.comment.createdAt ?? null,
      ),
      comments: comments.map(({ comment, createdByName: commentUserName }) =>
        this.toCommentDto(comment, commentUserName ?? '알 수 없음', user),
      ),
      canEdit: user.role === 'admin' || row.createdBy === user.id,
      canDelete: user.role === 'admin' || row.createdBy === user.id,
    };
  }

  private toCommentDto(
    row: DiscussionNoteCommentRow,
    createdByName: string,
    user: DiscussionNoteUser,
  ) {
    return {
      id: row.id,
      discussionNoteId: row.discussionNoteId,
      content: row.content,
      createdBy: row.createdBy,
      createdByName,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      canEdit: user.role === 'admin' || row.createdBy === user.id,
      canDelete: user.role === 'admin' || row.createdBy === user.id,
    };
  }
}
