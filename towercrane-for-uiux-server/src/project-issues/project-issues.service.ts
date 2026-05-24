import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, like, or, sql, type SQL } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  projectIssueActivityLogsTable,
  projectIssueAttachmentsTable,
  projectIssueCategoriesTable,
  projectIssueChecklistsTable,
  projectIssueCommentsTable,
  projectIssuesTable,
  usersTable,
  type ProjectIssueActivityType,
  type ProjectIssueAttachmentInsert,
  type ProjectIssueAttachmentRow,
  type ProjectIssueCategoryInsert,
  type ProjectIssueCategoryRow,
  type ProjectIssueChecklistInsert,
  type ProjectIssueCommentInsert,
  type ProjectIssueCommentRow,
  type ProjectIssueInsert,
  type ProjectIssueRow,
  type UserRow,
} from '../database/schema';
import {
  createProjectIssueCategorySchema,
  createProjectIssueAttachmentSchema,
  createProjectIssueChecklistSchema,
  createProjectIssueCommentSchema,
  listProjectIssueCategoriesQuerySchema,
  createProjectIssueSchema,
  listProjectIssuesQuerySchema,
  projectIssueIdsSchema,
  reorderProjectIssuesSchema,
  updateProjectIssueCategorySchema,
  updateProjectIssueAssigneeSchema,
  updateProjectIssueChecklistSchema,
  updateProjectIssueCommentSchema,
  updateProjectIssuePrioritySchema,
  updateProjectIssueSchema,
  updateProjectIssueStatusSchema,
} from './project-issues.schemas';

export type ProjectIssueUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

@Injectable()
export class ProjectIssuesService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  listWorkspaces(rawQuery: unknown) {
    const query = listProjectIssueCategoriesQuerySchema.parse(rawQuery ?? {});
    const rows = this.db
      .select()
      .from(projectIssueCategoriesTable)
      .where(eq(projectIssueCategoriesTable.archived, query.archived))
      .orderBy(
        asc(projectIssueCategoriesTable.orderIdx),
        desc(projectIssueCategoriesTable.createdAt),
      )
      .all();

    const issueCounts = this.db
      .select({
        projectId: projectIssuesTable.projectId,
        count: sql<number>`count(*)`,
      })
      .from(projectIssuesTable)
      .where(eq(projectIssuesTable.archived, false))
      .groupBy(projectIssuesTable.projectId)
      .all();
    const issueCountByCategoryId = new Map(
      issueCounts.map((row) => [row.projectId, Number(row.count)]),
    );

    return rows.map((category) =>
      this.toCategoryDto(
        category,
        issueCountByCategoryId.get(category.id) ?? 0,
      ),
    );
  }

  listCategories(rawQuery: unknown) {
    return this.listWorkspaces(rawQuery);
  }

  createWorkspace(user: ProjectIssueUser, payload: unknown) {
    const input = createProjectIssueCategorySchema.parse(payload);
    const now = new Date().toISOString();
    const maxOrder = this.db
      .select({ orderIdx: projectIssueCategoriesTable.orderIdx })
      .from(projectIssueCategoriesTable)
      .all()
      .reduce((max, row) => Math.max(max, row.orderIdx), -1);

    const row: ProjectIssueCategoryInsert = {
      id: `proj-issue-cat-${randomUUID().slice(0, 12)}`,
      name: input.name,
      description: input.description,
      orderIdx: maxOrder + 1,
      archived: false,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(projectIssueCategoriesTable).values(row).run();
    return this.toCategoryDto(this.ensureCategory(row.id), 0);
  }

  createCategory(user: ProjectIssueUser, payload: unknown) {
    return this.createWorkspace(user, payload);
  }

  updateWorkspace(
    user: ProjectIssueUser,
    workspaceId: string,
    payload: unknown,
  ) {
    const workspace = this.ensureCategory(workspaceId);
    this.ensureCanManageCategory(user, workspace);
    const input = updateProjectIssueCategorySchema.parse(payload);

    this.db
      .update(projectIssueCategoriesTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(projectIssueCategoriesTable.id, workspaceId))
      .run();

    return this.toCategoryDto(this.ensureCategory(workspaceId), 0);
  }

  updateCategory(user: ProjectIssueUser, categoryId: string, payload: unknown) {
    return this.updateWorkspace(user, categoryId, payload);
  }

  deleteWorkspace(user: ProjectIssueUser, workspaceId: string) {
    const workspace = this.ensureCategory(workspaceId);
    this.ensureCanManageCategory(user, workspace);
    this.db
      .delete(projectIssueCategoriesTable)
      .where(eq(projectIssueCategoriesTable.id, workspaceId))
      .run();
    return { success: true };
  }

  deleteCategory(user: ProjectIssueUser, categoryId: string) {
    return this.deleteWorkspace(user, categoryId);
  }

  listProjectIssues(_user: ProjectIssueUser, rawQuery: unknown) {
    const query = listProjectIssuesQuerySchema.parse(rawQuery ?? {});
    this.ensureCategory(query.projectId);
    const conditions = this.buildListConditions(query);
    const offset = (query.page - 1) * query.pageSize;

    const rows = this.db
      .select()
      .from(projectIssuesTable)
      .where(and(...conditions))
      .orderBy(...this.getIssueOrderBy(query.sort))
      .limit(query.pageSize)
      .offset(offset)
      .all();

    const totalRow = this.db
      .select({ count: sql<number>`count(*)` })
      .from(projectIssuesTable)
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

  getProjectIssueDetail(_user: ProjectIssueUser, issueId: string) {
    const issue = this.ensureIssue(issueId);
    return this.toIssueDto(issue, this.getUsersById());
  }

  createProjectIssue(user: ProjectIssueUser, payload: unknown) {
    const input = createProjectIssueSchema.parse(payload);
    this.ensureCategory(input.projectId);
    this.ensureAssignableUser(input.assigneeId ?? null);

    const now = new Date().toISOString();
    const maxOrder = this.db
      .select({ orderIdx: projectIssuesTable.orderIdx })
      .from(projectIssuesTable)
      .where(eq(projectIssuesTable.projectId, input.projectId))
      .all()
      .reduce((max, row) => Math.max(max, row.orderIdx), -1);

    const row: ProjectIssueInsert = {
      id: `proj-issue-${randomUUID().slice(0, 12)}`,
      projectId: input.projectId,
      title: input.title,
      content: input.content,
      issueType: input.issueType,
      status: input.status,
      priority: input.priority,
      reporterId: user.id,
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ?? null,
      orderIdx: maxOrder + 1,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(projectIssuesTable).values(row).run();
    this.recordActivity({
      projectIssueId: row.id,
      actorId: user.id,
      activityType: 'CREATED',
      toValue: row.id,
      message: '프로젝트 이슈가 생성되었습니다.',
    });

    return this.getProjectIssueDetail(user, row.id);
  }

  updateProjectIssue(
    user: ProjectIssueUser,
    issueId: string,
    payload: unknown,
  ) {
    const issue = this.ensureIssue(issueId);
    this.ensureCanWriteIssue(user, issue);
    const input = updateProjectIssueSchema.parse(payload);

    if ('assigneeId' in input) {
      this.ensureAssignableUser(input.assigneeId ?? null);
    }

    const changes: Partial<ProjectIssueInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (input.title !== undefined) changes.title = input.title;
    if (input.content !== undefined) changes.content = input.content;
    if (input.issueType !== undefined) changes.issueType = input.issueType;
    if (input.status !== undefined) changes.status = input.status;
    if (input.priority !== undefined) changes.priority = input.priority;
    if ('assigneeId' in input) changes.assigneeId = input.assigneeId ?? null;
    if ('dueDate' in input) changes.dueDate = input.dueDate ?? null;

    this.db
      .update(projectIssuesTable)
      .set(changes)
      .where(eq(projectIssuesTable.id, issueId))
      .run();
    this.recordIssueChanges(user, issue, changes);

    return this.getProjectIssueDetail(user, issueId);
  }

  deleteProjectIssue(user: ProjectIssueUser, issueId: string) {
    const issue = this.ensureIssue(issueId);
    this.ensureCanWriteIssue(user, issue);
    this.db
      .delete(projectIssuesTable)
      .where(eq(projectIssuesTable.id, issueId))
      .run();
    return { success: true };
  }

  updateProjectIssueStatus(
    user: ProjectIssueUser,
    issueId: string,
    payload: unknown,
  ) {
    const input = updateProjectIssueStatusSchema.parse(payload);
    return this.updateProjectIssue(user, issueId, input);
  }

  updateProjectIssuePriority(
    user: ProjectIssueUser,
    issueId: string,
    payload: unknown,
  ) {
    const input = updateProjectIssuePrioritySchema.parse(payload);
    return this.updateProjectIssue(user, issueId, input);
  }

  updateProjectIssueAssignee(
    user: ProjectIssueUser,
    issueId: string,
    payload: unknown,
  ) {
    const input = updateProjectIssueAssigneeSchema.parse(payload);
    return this.updateProjectIssue(user, issueId, input);
  }

  reorderProjectIssues(user: ProjectIssueUser, payload: unknown) {
    const input = reorderProjectIssuesSchema.parse(payload);
    const now = new Date().toISOString();

    for (const item of input.items) {
      const issue = this.ensureIssue(item.id);
      this.ensureCanWriteIssue(user, issue);
      this.db
        .update(projectIssuesTable)
        .set({ orderIdx: item.orderIdx, updatedAt: now })
        .where(eq(projectIssuesTable.id, item.id))
        .run();
    }

    return { success: true };
  }

  archiveProjectIssues(user: ProjectIssueUser, payload: unknown) {
    const input = projectIssueIdsSchema.parse(payload);
    const now = new Date().toISOString();

    for (const id of input.ids) {
      const issue = this.ensureIssue(id);
      this.ensureCanWriteIssue(user, issue);
      this.db
        .update(projectIssuesTable)
        .set({ archived: true, updatedAt: now })
        .where(eq(projectIssuesTable.id, id))
        .run();
      if (!issue.archived) {
        this.recordActivity({
          projectIssueId: id,
          actorId: user.id,
          activityType: 'ARCHIVED',
          fromValue: 'false',
          toValue: 'true',
          message: '프로젝트 이슈가 보관되었습니다.',
        });
      }
    }

    return { success: true };
  }

  restoreProjectIssues(user: ProjectIssueUser, payload: unknown) {
    const input = projectIssueIdsSchema.parse(payload);
    const now = new Date().toISOString();

    for (const id of input.ids) {
      const issue = this.ensureIssue(id);
      this.ensureCanWriteIssue(user, issue);
      this.db
        .update(projectIssuesTable)
        .set({ archived: false, updatedAt: now })
        .where(eq(projectIssuesTable.id, id))
        .run();
      if (issue.archived) {
        this.recordActivity({
          projectIssueId: id,
          actorId: user.id,
          activityType: 'RESTORED',
          fromValue: 'true',
          toValue: 'false',
          message: '프로젝트 이슈가 복원되었습니다.',
        });
      }
    }

    return { success: true };
  }

  listChecklists(user: ProjectIssueUser, issueId: string) {
    this.ensureIssueReadable(user, issueId);
    return this.db
      .select()
      .from(projectIssueChecklistsTable)
      .where(eq(projectIssueChecklistsTable.projectIssueId, issueId))
      .orderBy(
        asc(projectIssueChecklistsTable.orderIdx),
        asc(projectIssueChecklistsTable.createdAt),
      )
      .all();
  }

  createChecklist(user: ProjectIssueUser, issueId: string, payload: unknown) {
    const issue = this.ensureIssue(issueId);
    this.ensureCanWriteIssue(user, issue);
    const input = createProjectIssueChecklistSchema.parse(payload);
    const now = new Date().toISOString();
    const maxOrder = this.db
      .select({ orderIdx: projectIssueChecklistsTable.orderIdx })
      .from(projectIssueChecklistsTable)
      .where(eq(projectIssueChecklistsTable.projectIssueId, issueId))
      .all()
      .reduce((max, row) => Math.max(max, row.orderIdx), -1);

    const row: ProjectIssueChecklistInsert = {
      id: `proj-issue-chk-${randomUUID().slice(0, 12)}`,
      projectIssueId: issueId,
      content: input.content,
      completed: false,
      orderIdx: input.orderIdx ?? maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(projectIssueChecklistsTable).values(row).run();
    return this.ensureChecklist(issueId, row.id);
  }

  updateChecklist(
    user: ProjectIssueUser,
    issueId: string,
    checklistId: string,
    payload: unknown,
  ) {
    const issue = this.ensureIssue(issueId);
    this.ensureCanWriteIssue(user, issue);
    this.ensureChecklist(issueId, checklistId);
    const input = updateProjectIssueChecklistSchema.parse(payload);

    this.db
      .update(projectIssueChecklistsTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(projectIssueChecklistsTable.id, checklistId),
          eq(projectIssueChecklistsTable.projectIssueId, issueId),
        ),
      )
      .run();

    return this.ensureChecklist(issueId, checklistId);
  }

  toggleChecklist(
    user: ProjectIssueUser,
    issueId: string,
    checklistId: string,
  ) {
    const issue = this.ensureIssue(issueId);
    this.ensureCanWriteIssue(user, issue);
    const checklist = this.ensureChecklist(issueId, checklistId);

    this.db
      .update(projectIssueChecklistsTable)
      .set({
        completed: !checklist.completed,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(projectIssueChecklistsTable.id, checklistId),
          eq(projectIssueChecklistsTable.projectIssueId, issueId),
        ),
      )
      .run();

    return this.ensureChecklist(issueId, checklistId);
  }

  deleteChecklist(
    user: ProjectIssueUser,
    issueId: string,
    checklistId: string,
  ) {
    const issue = this.ensureIssue(issueId);
    this.ensureCanWriteIssue(user, issue);
    this.ensureChecklist(issueId, checklistId);

    this.db
      .delete(projectIssueChecklistsTable)
      .where(
        and(
          eq(projectIssueChecklistsTable.id, checklistId),
          eq(projectIssueChecklistsTable.projectIssueId, issueId),
        ),
      )
      .run();

    return { success: true };
  }

  listComments(user: ProjectIssueUser, issueId: string) {
    this.ensureIssueReadable(user, issueId);
    const comments = this.db
      .select()
      .from(projectIssueCommentsTable)
      .where(
        and(
          eq(projectIssueCommentsTable.projectIssueId, issueId),
          eq(projectIssueCommentsTable.deleted, false),
        ),
      )
      .orderBy(asc(projectIssueCommentsTable.createdAt))
      .all();

    return comments.map((comment) =>
      this.toCommentDto(comment, this.getUsersById()),
    );
  }

  createComment(user: ProjectIssueUser, issueId: string, payload: unknown) {
    this.ensureIssueReadable(user, issueId);
    const input = createProjectIssueCommentSchema.parse(payload);
    const now = new Date().toISOString();
    const row: ProjectIssueCommentInsert = {
      id: `proj-issue-cmt-${randomUUID().slice(0, 12)}`,
      projectIssueId: issueId,
      userId: user.id,
      content: input.content,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(projectIssueCommentsTable).values(row).run();
    return this.toCommentDto(
      this.ensureComment(issueId, row.id),
      this.getUsersById(),
    );
  }

  updateComment(
    user: ProjectIssueUser,
    issueId: string,
    commentId: string,
    payload: unknown,
  ) {
    this.ensureIssueReadable(user, issueId);
    const comment = this.ensureComment(issueId, commentId);
    this.ensureCanEditComment(user, comment);
    const input = updateProjectIssueCommentSchema.parse(payload);

    this.db
      .update(projectIssueCommentsTable)
      .set({ content: input.content, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(projectIssueCommentsTable.id, commentId),
          eq(projectIssueCommentsTable.projectIssueId, issueId),
        ),
      )
      .run();

    return this.toCommentDto(
      this.ensureComment(issueId, commentId),
      this.getUsersById(),
    );
  }

  deleteComment(user: ProjectIssueUser, issueId: string, commentId: string) {
    this.ensureIssueReadable(user, issueId);
    const comment = this.ensureComment(issueId, commentId);
    this.ensureCanEditComment(user, comment);

    this.db
      .update(projectIssueCommentsTable)
      .set({ deleted: true, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(projectIssueCommentsTable.id, commentId),
          eq(projectIssueCommentsTable.projectIssueId, issueId),
        ),
      )
      .run();

    return { success: true };
  }

  listActivity(user: ProjectIssueUser, issueId: string) {
    this.ensureIssueReadable(user, issueId);
    const usersById = this.getUsersById();

    return this.db
      .select()
      .from(projectIssueActivityLogsTable)
      .where(eq(projectIssueActivityLogsTable.projectIssueId, issueId))
      .orderBy(desc(projectIssueActivityLogsTable.createdAt))
      .all()
      .map((activity) => ({
        ...activity,
        actorName: activity.actorId
          ? (usersById.get(activity.actorId)?.name ?? null)
          : null,
      }));
  }

  listAttachments(user: ProjectIssueUser, issueId: string) {
    this.ensureIssueReadable(user, issueId);
    const usersById = this.getUsersById();

    return this.db
      .select()
      .from(projectIssueAttachmentsTable)
      .where(eq(projectIssueAttachmentsTable.projectIssueId, issueId))
      .orderBy(desc(projectIssueAttachmentsTable.createdAt))
      .all()
      .map((attachment) => this.toAttachmentDto(attachment, usersById));
  }

  createAttachment(user: ProjectIssueUser, issueId: string, payload: unknown) {
    const issue = this.ensureIssue(issueId);
    this.ensureCanWriteIssue(user, issue);
    const input = createProjectIssueAttachmentSchema.parse(payload);

    const row: ProjectIssueAttachmentInsert = {
      id: `proj-issue-att-${randomUUID().slice(0, 12)}`,
      projectIssueId: issueId,
      userId: user.id,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      contentType: input.contentType,
      fileSize: input.fileSize,
      createdAt: new Date().toISOString(),
    };

    this.db.insert(projectIssueAttachmentsTable).values(row).run();
    return this.toAttachmentDto(
      this.ensureAttachment(issueId, row.id),
      this.getUsersById(),
    );
  }

  deleteAttachment(
    user: ProjectIssueUser,
    issueId: string,
    attachmentId: string,
  ) {
    const issue = this.ensureIssue(issueId);
    const attachment = this.ensureAttachment(issueId, attachmentId);

    if (
      user.role !== 'admin' &&
      issue.reporterId !== user.id &&
      issue.assigneeId !== user.id &&
      attachment.userId !== user.id
    ) {
      throw new ForbiddenException('You cannot delete this attachment');
    }

    this.db
      .delete(projectIssueAttachmentsTable)
      .where(
        and(
          eq(projectIssueAttachmentsTable.id, attachmentId),
          eq(projectIssueAttachmentsTable.projectIssueId, issueId),
        ),
      )
      .run();

    return { success: true };
  }

  private buildListConditions(
    query: ReturnType<typeof listProjectIssuesQuerySchema.parse>,
  ) {
    const conditions: SQL[] = [
      eq(projectIssuesTable.projectId, query.projectId),
      eq(projectIssuesTable.archived, query.archived),
    ];

    if (query.issueType)
      conditions.push(eq(projectIssuesTable.issueType, query.issueType));
    if (query.status)
      conditions.push(eq(projectIssuesTable.status, query.status));
    if (query.priority)
      conditions.push(eq(projectIssuesTable.priority, query.priority));
    if (query.assigneeId) {
      conditions.push(eq(projectIssuesTable.assigneeId, query.assigneeId));
    }
    if (query.q) {
      const keyword = `%${query.q}%`;
      const search = or(
        like(projectIssuesTable.title, keyword),
        like(projectIssuesTable.content, keyword),
      );
      if (search) conditions.push(search);
    }

    return conditions;
  }

  private getIssueOrderBy(sort: string) {
    const priorityOrder = sql`
      CASE ${projectIssuesTable.priority}
        WHEN 'URGENT' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
      END
    `;

    if (sort === 'recent') return [desc(projectIssuesTable.updatedAt)];
    if (sort === 'oldest') return [asc(projectIssuesTable.createdAt)];
    if (sort === 'dueDate') {
      return [
        sql`${projectIssuesTable.dueDate} IS NULL`,
        asc(projectIssuesTable.dueDate),
        asc(projectIssuesTable.orderIdx),
      ];
    }
    if (sort === 'priority') {
      return [
        priorityOrder,
        asc(projectIssuesTable.orderIdx),
        desc(projectIssuesTable.createdAt),
      ];
    }
    return [
      asc(projectIssuesTable.orderIdx),
      desc(projectIssuesTable.createdAt),
    ];
  }

  private recordIssueChanges(
    user: ProjectIssueUser,
    before: ProjectIssueRow,
    changes: Partial<ProjectIssueInsert>,
  ) {
    if (changes.status && changes.status !== before.status) {
      this.recordActivity({
        projectIssueId: before.id,
        actorId: user.id,
        activityType: 'STATUS',
        fromValue: before.status,
        toValue: changes.status,
        message: '프로젝트 이슈 상태가 변경되었습니다.',
      });
    }

    if (changes.priority && changes.priority !== before.priority) {
      this.recordActivity({
        projectIssueId: before.id,
        actorId: user.id,
        activityType: 'PRIORITY',
        fromValue: before.priority,
        toValue: changes.priority,
        message: '프로젝트 이슈 우선순위가 변경되었습니다.',
      });
    }

    if (
      Object.prototype.hasOwnProperty.call(changes, 'assigneeId') &&
      changes.assigneeId !== before.assigneeId
    ) {
      this.recordActivity({
        projectIssueId: before.id,
        actorId: user.id,
        activityType: 'ASSIGNEE',
        fromValue: before.assigneeId,
        toValue: changes.assigneeId ?? null,
        message: '프로젝트 이슈 담당자가 변경되었습니다.',
      });
    }

    const onlySystemFields = ['status', 'priority', 'assigneeId', 'updatedAt'];
    const hasGeneralUpdate = Object.keys(changes).some(
      (key) => !onlySystemFields.includes(key),
    );

    if (hasGeneralUpdate) {
      this.recordActivity({
        projectIssueId: before.id,
        actorId: user.id,
        activityType: 'UPDATED',
        message: '프로젝트 이슈 정보가 수정되었습니다.',
      });
    }
  }

  private recordActivity(input: {
    projectIssueId: string;
    actorId: string | null;
    activityType: ProjectIssueActivityType;
    fromValue?: string | null;
    toValue?: string | null;
    message?: string | null;
  }) {
    try {
      this.db
        .insert(projectIssueActivityLogsTable)
        .values({
          id: `proj-issue-log-${randomUUID().slice(0, 12)}`,
          projectIssueId: input.projectIssueId,
          actorId: input.actorId,
          activityType: input.activityType,
          fromValue: input.fromValue ?? null,
          toValue: input.toValue ?? null,
          message: input.message ?? null,
          createdAt: new Date().toISOString(),
        })
        .run();
    } catch {
      // Activity logs must not block the primary issue operation.
    }
  }

  private ensureCategory(categoryId: string) {
    const category = this.db
      .select()
      .from(projectIssueCategoriesTable)
      .where(eq(projectIssueCategoriesTable.id, categoryId))
      .get();

    if (!category) {
      throw new NotFoundException(
        `Project issue workspace not found: ${categoryId}`,
      );
    }

    return category;
  }

  private ensureIssue(issueId: string) {
    const issue = this.db
      .select()
      .from(projectIssuesTable)
      .where(eq(projectIssuesTable.id, issueId))
      .get();

    if (!issue) {
      throw new NotFoundException(`Project issue not found: ${issueId}`);
    }

    return issue;
  }

  private ensureIssueReadable(_user: ProjectIssueUser, issueId: string) {
    return this.ensureIssue(issueId);
  }

  private ensureChecklist(issueId: string, checklistId: string) {
    const row = this.db
      .select()
      .from(projectIssueChecklistsTable)
      .where(
        and(
          eq(projectIssueChecklistsTable.id, checklistId),
          eq(projectIssueChecklistsTable.projectIssueId, issueId),
        ),
      )
      .get();

    if (!row) {
      throw new NotFoundException(
        `Project issue checklist not found: ${checklistId}`,
      );
    }

    return row;
  }

  private ensureComment(issueId: string, commentId: string) {
    const row = this.db
      .select()
      .from(projectIssueCommentsTable)
      .where(
        and(
          eq(projectIssueCommentsTable.id, commentId),
          eq(projectIssueCommentsTable.projectIssueId, issueId),
          eq(projectIssueCommentsTable.deleted, false),
        ),
      )
      .get();

    if (!row) {
      throw new NotFoundException(
        `Project issue comment not found: ${commentId}`,
      );
    }

    return row;
  }

  private ensureAttachment(issueId: string, attachmentId: string) {
    const row = this.db
      .select()
      .from(projectIssueAttachmentsTable)
      .where(
        and(
          eq(projectIssueAttachmentsTable.id, attachmentId),
          eq(projectIssueAttachmentsTable.projectIssueId, issueId),
        ),
      )
      .get();

    if (!row) {
      throw new NotFoundException(
        `Project issue attachment not found: ${attachmentId}`,
      );
    }

    return row;
  }

  private ensureAssignableUser(userId: string | null) {
    if (!userId) return;

    const user = this.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .get();

    if (!user) {
      throw new NotFoundException(`User not found: ${userId}`);
    }
  }

  private ensureCanWriteIssue(user: ProjectIssueUser, issue: ProjectIssueRow) {
    if (
      user.role === 'admin' ||
      issue.reporterId === user.id ||
      issue.assigneeId === user.id
    ) {
      return;
    }

    throw new ForbiddenException('You cannot modify this project issue');
  }

  private ensureCanManageCategory(
    user: ProjectIssueUser,
    category: ProjectIssueCategoryRow,
  ) {
    if (user.role === 'admin' || category.createdBy === user.id) {
      return;
    }

    throw new ForbiddenException(
      'You cannot modify this project issue workspace',
    );
  }

  private ensureCanEditComment(
    user: ProjectIssueUser,
    comment: ProjectIssueCommentRow,
  ) {
    if (user.role === 'admin' || comment.userId === user.id) {
      return;
    }

    throw new ForbiddenException('You cannot edit this comment');
  }

  private getUsersById() {
    const rows = this.db.select().from(usersTable).all();
    return new Map(rows.map((user) => [user.id, user]));
  }

  private toIssueDto(issue: ProjectIssueRow, usersById: Map<string, UserRow>) {
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

  private toCategoryDto(category: ProjectIssueCategoryRow, issueCount: number) {
    return {
      ...category,
      issueCount,
    };
  }

  private toCommentDto(
    comment: ProjectIssueCommentRow,
    usersById: Map<string, UserRow>,
  ) {
    const user = usersById.get(comment.userId);
    return {
      id: comment.id,
      projectIssueId: comment.projectIssueId,
      userId: comment.userId,
      userName: user?.name ?? null,
      userEmail: user?.email ?? null,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  private toAttachmentDto(
    attachment: ProjectIssueAttachmentRow,
    usersById: Map<string, UserRow>,
  ) {
    const user = usersById.get(attachment.userId);
    return {
      ...attachment,
      userName: user?.name ?? null,
      userEmail: user?.email ?? null,
    };
  }
}
