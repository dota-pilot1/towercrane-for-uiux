import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, like, or, sql, type SQL } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  issueCommentsTable,
  issuesTable,
  usersTable,
  type IssueCommentInsert,
  type IssueCommentRow,
  type IssueInsert,
  type IssueRow,
  type UserRow,
} from '../database/schema';
import {
  createIssueCommentSchema,
  createIssueSchema,
  listIssuesQuerySchema,
  reorderIssuesSchema,
  updateIssueCommentSchema,
  updateIssueSchema,
  updateIssueStatusSchema,
} from './issues.schemas';

export type IssueUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

@Injectable()
export class IssuesService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  listIssues(_user: IssueUser, rawQuery: unknown) {
    const query = listIssuesQuerySchema.parse(rawQuery ?? {});
    const conditions = this.buildListConditions(query);
    const offset = (query.page - 1) * query.pageSize;

    const rows = this.db
      .select()
      .from(issuesTable)
      .where(and(...conditions))
      .orderBy(...this.getIssueOrderBy(query.sort))
      .limit(query.pageSize)
      .offset(offset)
      .all();

    const totalRow = this.db
      .select({ count: sql<number>`count(*)` })
      .from(issuesTable)
      .where(and(...conditions))
      .get();

    const usersById = this.getUsersById();

    return {
      items: rows.map((issue) => this.toIssueDto(issue, usersById)),
      total: Number(totalRow?.count ?? 0),
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  getIssueDetail(_user: IssueUser, issueId: string) {
    const issue = this.ensureIssue(issueId);
    return this.toIssueDto(issue, this.getUsersById());
  }

  createIssue(user: IssueUser, payload: unknown) {
    const input = createIssueSchema.parse(payload);
    this.ensureAssignableUser(input.assigneeId ?? null);

    const now = new Date().toISOString();
    const maxOrder = this.db
      .select({ orderIdx: issuesTable.orderIdx })
      .from(issuesTable)
      .where(eq(issuesTable.prototypeId, input.prototypeId))
      .all()
      .reduce((max, row) => Math.max(max, row.orderIdx), -1);

    const row: IssueInsert = {
      id: `issue-${randomUUID().slice(0, 12)}`,
      prototypeId: input.prototypeId,
      title: input.title,
      content: input.content,
      issueType: input.issueType,
      status: input.status,
      priority: input.priority,
      reporterId: user.id,
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ?? null,
      orderIdx: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(issuesTable).values(row).run();
    return this.getIssueDetail(user, row.id);
  }

  updateIssue(user: IssueUser, issueId: string, payload: unknown) {
    const issue = this.ensureIssue(issueId);
    this.ensureCanWriteIssue(user, issue);
    const input = updateIssueSchema.parse(payload);

    if ('assigneeId' in input) {
      this.ensureAssignableUser(input.assigneeId ?? null);
    }

    const now = new Date().toISOString();
    const changes: Partial<IssueInsert> = { updatedAt: now };

    if (input.title !== undefined) changes.title = input.title;
    if (input.content !== undefined) changes.content = input.content;
    if (input.issueType !== undefined) changes.issueType = input.issueType;
    if (input.status !== undefined) changes.status = input.status;
    if (input.priority !== undefined) changes.priority = input.priority;
    if ('assigneeId' in input) changes.assigneeId = input.assigneeId ?? null;
    if ('dueDate' in input) changes.dueDate = input.dueDate ?? null;

    this.db
      .update(issuesTable)
      .set(changes)
      .where(eq(issuesTable.id, issueId))
      .run();

    return this.getIssueDetail(user, issueId);
  }

  deleteIssue(user: IssueUser, issueId: string) {
    const issue = this.ensureIssue(issueId);
    this.ensureCanDeleteIssue(user, issue);
    this.db.delete(issuesTable).where(eq(issuesTable.id, issueId)).run();
    return { success: true };
  }

  updateIssueStatus(user: IssueUser, issueId: string, payload: unknown) {
    const input = updateIssueStatusSchema.parse(payload);
    return this.updateIssue(user, issueId, input);
  }

  reorderIssues(_user: IssueUser, payload: unknown) {
    const input = reorderIssuesSchema.parse(payload);
    const now = new Date().toISOString();

    for (const item of input.items) {
      this.ensureIssue(item.id);
      this.db
        .update(issuesTable)
        .set({ orderIdx: item.orderIdx, updatedAt: now })
        .where(eq(issuesTable.id, item.id))
        .run();
    }

    return { success: true };
  }

  listComments(_user: IssueUser, issueId: string) {
    this.ensureIssue(issueId);
    const comments = this.db
      .select()
      .from(issueCommentsTable)
      .where(
        and(
          eq(issueCommentsTable.issueId, issueId),
          eq(issueCommentsTable.deleted, false),
        ),
      )
      .orderBy(asc(issueCommentsTable.createdAt))
      .all();

    return comments.map((c) => this.toCommentDto(c, this.getUsersById()));
  }

  createComment(user: IssueUser, issueId: string, payload: unknown) {
    this.ensureIssue(issueId);
    const input = createIssueCommentSchema.parse(payload);
    const now = new Date().toISOString();
    const row: IssueCommentInsert = {
      id: `issue-cmt-${randomUUID().slice(0, 12)}`,
      issueId,
      userId: user.id,
      content: input.content,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(issueCommentsTable).values(row).run();
    return this.toCommentDto(
      this.ensureComment(issueId, row.id),
      this.getUsersById(),
    );
  }

  updateComment(
    user: IssueUser,
    issueId: string,
    commentId: string,
    payload: unknown,
  ) {
    this.ensureIssue(issueId);
    const comment = this.ensureComment(issueId, commentId);
    this.ensureCanEditComment(user, comment);
    const input = updateIssueCommentSchema.parse(payload);

    this.db
      .update(issueCommentsTable)
      .set({ content: input.content, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(issueCommentsTable.id, commentId),
          eq(issueCommentsTable.issueId, issueId),
        ),
      )
      .run();

    return this.toCommentDto(
      this.ensureComment(issueId, commentId),
      this.getUsersById(),
    );
  }

  deleteComment(user: IssueUser, issueId: string, commentId: string) {
    this.ensureIssue(issueId);
    const comment = this.ensureComment(issueId, commentId);
    this.ensureCanEditComment(user, comment);

    this.db
      .update(issueCommentsTable)
      .set({ deleted: true, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(issueCommentsTable.id, commentId),
          eq(issueCommentsTable.issueId, issueId),
        ),
      )
      .run();

    return { success: true };
  }

  private buildListConditions(
    query: ReturnType<typeof listIssuesQuerySchema.parse>,
  ) {
    const conditions: SQL[] = [eq(issuesTable.prototypeId, query.prototypeId)];

    if (query.issueType)
      conditions.push(eq(issuesTable.issueType, query.issueType));
    if (query.status) conditions.push(eq(issuesTable.status, query.status));
    if (query.priority)
      conditions.push(eq(issuesTable.priority, query.priority));
    if (query.assigneeId)
      conditions.push(eq(issuesTable.assigneeId, query.assigneeId));
    if (query.q) {
      const keyword = `%${query.q}%`;
      const search = or(
        like(issuesTable.title, keyword),
        like(issuesTable.content, keyword),
      );
      if (search) conditions.push(search);
    }

    return conditions;
  }

  private getIssueOrderBy(sort: string) {
    const priorityOrder = sql`
      CASE ${issuesTable.priority}
        WHEN 'URGENT' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
      END
    `;

    if (sort === 'recent') return [desc(issuesTable.updatedAt)];
    if (sort === 'oldest') return [asc(issuesTable.createdAt)];
    if (sort === 'priority') {
      return [
        priorityOrder,
        asc(issuesTable.orderIdx),
        desc(issuesTable.createdAt),
      ];
    }
    return [asc(issuesTable.orderIdx), desc(issuesTable.createdAt)];
  }

  private ensureIssue(issueId: string) {
    const issue = this.db
      .select()
      .from(issuesTable)
      .where(eq(issuesTable.id, issueId))
      .get();

    if (!issue) throw new NotFoundException(`Issue not found: ${issueId}`);
    return issue;
  }

  private ensureComment(issueId: string, commentId: string) {
    const row = this.db
      .select()
      .from(issueCommentsTable)
      .where(
        and(
          eq(issueCommentsTable.id, commentId),
          eq(issueCommentsTable.issueId, issueId),
          eq(issueCommentsTable.deleted, false),
        ),
      )
      .get();

    if (!row)
      throw new NotFoundException(`Issue comment not found: ${commentId}`);
    return row;
  }

  private ensureAssignableUser(userId: string | null) {
    if (!userId) return;
    const user = this.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .get();
    if (!user) throw new NotFoundException(`User not found: ${userId}`);
  }

  private ensureCanWriteIssue(user: IssueUser, issue: IssueRow) {
    if (
      user.role === 'admin' ||
      issue.reporterId === user.id ||
      issue.assigneeId === user.id
    )
      return;
    throw new ForbiddenException('You cannot modify this issue');
  }

  private ensureCanDeleteIssue(user: IssueUser, issue: IssueRow) {
    if (user.role === 'admin' || issue.reporterId === user.id) return;
    throw new ForbiddenException('You cannot delete this issue');
  }

  private ensureCanEditComment(user: IssueUser, comment: IssueCommentRow) {
    if (user.role === 'admin' || comment.userId === user.id) return;
    throw new ForbiddenException('You cannot edit this comment');
  }

  private getUsersById() {
    const rows = this.db.select().from(usersTable).all();
    return new Map(rows.map((u) => [u.id, u]));
  }

  private toIssueDto(issue: IssueRow, usersById: Map<string, UserRow>) {
    const reporter = usersById.get(issue.reporterId);
    const assignee = issue.assigneeId ? usersById.get(issue.assigneeId) : null;
    return {
      ...issue,
      reporterName: reporter?.name ?? null,
      reporterEmail: reporter?.email ?? null,
      assigneeName: assignee?.name ?? null,
      assigneeEmail: assignee?.email ?? null,
    };
  }

  private toCommentDto(
    comment: IssueCommentRow,
    usersById: Map<string, UserRow>,
  ) {
    const user = usersById.get(comment.userId);
    return {
      id: comment.id,
      issueId: comment.issueId,
      userId: comment.userId,
      userName: user?.name ?? null,
      userEmail: user?.email ?? null,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
