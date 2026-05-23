import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, like, or, sql, type SQL } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  taskActivityLogsTable,
  taskAttachmentsTable,
  taskChecklistsTable,
  taskCommentsTable,
  tasksTable,
  usersTable,
  type TaskActivityType,
  type TaskAttachmentInsert,
  type TaskAttachmentRow,
  type TaskChecklistInsert,
  type TaskCommentInsert,
  type TaskCommentRow,
  type TaskInsert,
  type TaskRow,
  type UserRow,
} from '../database/schema';
import {
  createChecklistSchema,
  createAttachmentSchema,
  createCommentSchema,
  createTaskSchema,
  listTasksQuerySchema,
  reorderTasksSchema,
  taskIdsSchema,
  updateChecklistSchema,
  updateCommentSchema,
  updateTaskAssigneeSchema,
  updateTaskPrioritySchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from './tasks.schemas';

export type TaskUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

@Injectable()
export class TasksService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  listTasks(user: TaskUser, rawQuery: unknown) {
    const query = listTasksQuerySchema.parse(rawQuery ?? {});
    const conditions = this.buildListConditions(user, query);
    const offset = (query.page - 1) * query.pageSize;

    const rows = this.db
      .select()
      .from(tasksTable)
      .where(and(...conditions))
      .orderBy(...this.getTaskOrderBy(query.sort))
      .limit(query.pageSize)
      .offset(offset)
      .all();

    const totalRow = this.db
      .select({ count: sql<number>`count(*)` })
      .from(tasksTable)
      .where(and(...conditions))
      .get();

    const usersById = this.getUsersById();

    return {
      items: rows.map((task) => this.toTaskDto(task, usersById)),
      total: Number(totalRow?.count ?? 0),
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  getTaskDetail(user: TaskUser, taskId: string) {
    const task = this.ensureTask(taskId);
    this.ensureCanReadTask(user, task);
    return this.toTaskDto(task, this.getUsersById());
  }

  createTask(user: TaskUser, payload: unknown) {
    const input = createTaskSchema.parse(payload);
    const isPersonalTask = input.scope === 'PERSONAL';
    const assigneeId = isPersonalTask
      ? (input.assigneeId ?? user.id)
      : (input.assigneeId ?? null);
    const ownerId = isPersonalTask ? user.id : null;
    const visibility =
      input.visibility ?? (isPersonalTask ? 'PRIVATE' : 'TEAM');

    this.ensureAssignableUser(assigneeId);

    const now = new Date().toISOString();
    const maxOrder = this.db
      .select({ orderIdx: tasksTable.orderIdx })
      .from(tasksTable)
      .all()
      .reduce((max, row) => Math.max(max, row.orderIdx), -1);

    const row: TaskInsert = {
      id: `task-${randomUUID().slice(0, 12)}`,
      title: input.title,
      content: input.content,
      mmdContent: input.mmdContent,
      taskType: input.taskType,
      status: input.status,
      priority: input.priority,
      scope: input.scope,
      ownerId,
      visibility,
      reporterId: user.id,
      assigneeId,
      dueDate: input.dueDate ?? null,
      orderIdx: maxOrder + 1,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(tasksTable).values(row).run();
    this.recordActivity({
      taskId: row.id,
      actorId: user.id,
      activityType: 'CREATED',
      toValue: row.id,
      message: '업무가 생성되었습니다.',
    });

    return this.getTaskDetail(user, row.id);
  }

  updateTask(user: TaskUser, taskId: string, payload: unknown) {
    const task = this.ensureTask(taskId);
    this.ensureCanWriteTask(user, task);
    const input = updateTaskSchema.parse(payload);

    if ('assigneeId' in input) {
      this.ensureAssignableUser(input.assigneeId ?? null);
    }

    const now = new Date().toISOString();
    const changes: Partial<TaskInsert> = { updatedAt: now };

    if (input.title !== undefined) changes.title = input.title;
    if (input.content !== undefined) changes.content = input.content;
    if (input.mmdContent !== undefined) changes.mmdContent = input.mmdContent;
    if (input.taskType !== undefined) changes.taskType = input.taskType;
    if (input.status !== undefined) changes.status = input.status;
    if (input.priority !== undefined) changes.priority = input.priority;
    if (input.scope !== undefined && user.role === 'admin') {
      changes.scope = input.scope;
    }
    if (input.visibility !== undefined && user.role === 'admin') {
      changes.visibility = input.visibility;
    }
    if ('assigneeId' in input) changes.assigneeId = input.assigneeId ?? null;
    if ('dueDate' in input) changes.dueDate = input.dueDate ?? null;

    this.db
      .update(tasksTable)
      .set(changes)
      .where(eq(tasksTable.id, taskId))
      .run();
    this.recordTaskChanges(user, task, changes);

    return this.getTaskDetail(user, taskId);
  }

  deleteTask(user: TaskUser, taskId: string) {
    const task = this.ensureTask(taskId);
    this.ensureCanArchiveTask(user, task);

    this.db.delete(tasksTable).where(eq(tasksTable.id, taskId)).run();
    return { success: true };
  }

  updateTaskStatus(user: TaskUser, taskId: string, payload: unknown) {
    const input = updateTaskStatusSchema.parse(payload);
    return this.updateTask(user, taskId, input);
  }

  updateTaskPriority(user: TaskUser, taskId: string, payload: unknown) {
    const input = updateTaskPrioritySchema.parse(payload);
    return this.updateTask(user, taskId, input);
  }

  updateTaskAssignee(user: TaskUser, taskId: string, payload: unknown) {
    const input = updateTaskAssigneeSchema.parse(payload);
    return this.updateTask(user, taskId, input);
  }

  reorderTasks(user: TaskUser, payload: unknown) {
    const input = reorderTasksSchema.parse(payload);
    const now = new Date().toISOString();

    for (const item of input.items) {
      const task = this.ensureTask(item.id);
      this.ensureCanWriteTask(user, task);
      this.db
        .update(tasksTable)
        .set({ orderIdx: item.orderIdx, updatedAt: now })
        .where(eq(tasksTable.id, item.id))
        .run();
    }

    return { success: true };
  }

  archiveTasks(user: TaskUser, payload: unknown) {
    const input = taskIdsSchema.parse(payload);
    const now = new Date().toISOString();

    for (const id of input.ids) {
      const task = this.ensureTask(id);
      this.ensureCanArchiveTask(user, task);
      this.db
        .update(tasksTable)
        .set({ archived: true, updatedAt: now })
        .where(eq(tasksTable.id, id))
        .run();
      if (!task.archived) {
        this.recordActivity({
          taskId: id,
          actorId: user.id,
          activityType: 'ARCHIVED',
          fromValue: 'false',
          toValue: 'true',
          message: '업무가 보관되었습니다.',
        });
      }
    }

    return { success: true };
  }

  restoreTasks(user: TaskUser, payload: unknown) {
    const input = taskIdsSchema.parse(payload);
    const now = new Date().toISOString();

    for (const id of input.ids) {
      const task = this.ensureTask(id);
      this.ensureCanArchiveTask(user, task);
      this.db
        .update(tasksTable)
        .set({ archived: false, updatedAt: now })
        .where(eq(tasksTable.id, id))
        .run();
      if (task.archived) {
        this.recordActivity({
          taskId: id,
          actorId: user.id,
          activityType: 'RESTORED',
          fromValue: 'true',
          toValue: 'false',
          message: '업무가 복원되었습니다.',
        });
      }
    }

    return { success: true };
  }

  listChecklists(_user: TaskUser, taskId: string) {
    const task = this.ensureTask(taskId);
    this.ensureCanReadTask(_user, task);
    return this.db
      .select()
      .from(taskChecklistsTable)
      .where(eq(taskChecklistsTable.taskId, taskId))
      .orderBy(
        asc(taskChecklistsTable.orderIdx),
        asc(taskChecklistsTable.createdAt),
      )
      .all();
  }

  createChecklist(user: TaskUser, taskId: string, payload: unknown) {
    const task = this.ensureTask(taskId);
    this.ensureCanWriteTask(user, task);
    const input = createChecklistSchema.parse(payload);
    const now = new Date().toISOString();
    const maxOrder = this.db
      .select({ orderIdx: taskChecklistsTable.orderIdx })
      .from(taskChecklistsTable)
      .where(eq(taskChecklistsTable.taskId, taskId))
      .all()
      .reduce((max, row) => Math.max(max, row.orderIdx), -1);

    const row: TaskChecklistInsert = {
      id: `task-chk-${randomUUID().slice(0, 12)}`,
      taskId,
      content: input.content,
      completed: false,
      orderIdx: input.orderIdx ?? maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(taskChecklistsTable).values(row).run();
    return this.ensureChecklist(taskId, row.id);
  }

  updateChecklist(
    user: TaskUser,
    taskId: string,
    checklistId: string,
    payload: unknown,
  ) {
    const task = this.ensureTask(taskId);
    this.ensureCanWriteTask(user, task);
    this.ensureChecklist(taskId, checklistId);
    const input = updateChecklistSchema.parse(payload);

    this.db
      .update(taskChecklistsTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(taskChecklistsTable.id, checklistId),
          eq(taskChecklistsTable.taskId, taskId),
        ),
      )
      .run();

    return this.ensureChecklist(taskId, checklistId);
  }

  toggleChecklist(user: TaskUser, taskId: string, checklistId: string) {
    const task = this.ensureTask(taskId);
    this.ensureCanWriteTask(user, task);
    const checklist = this.ensureChecklist(taskId, checklistId);

    this.db
      .update(taskChecklistsTable)
      .set({
        completed: !checklist.completed,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(taskChecklistsTable.id, checklistId),
          eq(taskChecklistsTable.taskId, taskId),
        ),
      )
      .run();

    return this.ensureChecklist(taskId, checklistId);
  }

  deleteChecklist(user: TaskUser, taskId: string, checklistId: string) {
    const task = this.ensureTask(taskId);
    this.ensureCanWriteTask(user, task);
    this.ensureChecklist(taskId, checklistId);

    this.db
      .delete(taskChecklistsTable)
      .where(
        and(
          eq(taskChecklistsTable.id, checklistId),
          eq(taskChecklistsTable.taskId, taskId),
        ),
      )
      .run();

    return { success: true };
  }

  listComments(_user: TaskUser, taskId: string) {
    const task = this.ensureTask(taskId);
    this.ensureCanReadTask(_user, task);
    const comments = this.db
      .select()
      .from(taskCommentsTable)
      .where(
        and(
          eq(taskCommentsTable.taskId, taskId),
          eq(taskCommentsTable.deleted, false),
        ),
      )
      .orderBy(asc(taskCommentsTable.createdAt))
      .all();

    return comments.map((comment) =>
      this.toCommentDto(comment, this.getUsersById()),
    );
  }

  createComment(user: TaskUser, taskId: string, payload: unknown) {
    const task = this.ensureTask(taskId);
    this.ensureCanReadTask(user, task);
    const input = createCommentSchema.parse(payload);
    const now = new Date().toISOString();
    const row: TaskCommentInsert = {
      id: `task-cmt-${randomUUID().slice(0, 12)}`,
      taskId,
      userId: user.id,
      content: input.content,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(taskCommentsTable).values(row).run();
    return this.toCommentDto(
      this.ensureComment(taskId, row.id),
      this.getUsersById(),
    );
  }

  updateComment(
    user: TaskUser,
    taskId: string,
    commentId: string,
    payload: unknown,
  ) {
    const task = this.ensureTask(taskId);
    this.ensureCanReadTask(user, task);
    const comment = this.ensureComment(taskId, commentId);
    this.ensureCanEditComment(user, comment);
    const input = updateCommentSchema.parse(payload);

    this.db
      .update(taskCommentsTable)
      .set({ content: input.content, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(taskCommentsTable.id, commentId),
          eq(taskCommentsTable.taskId, taskId),
        ),
      )
      .run();

    return this.toCommentDto(
      this.ensureComment(taskId, commentId),
      this.getUsersById(),
    );
  }

  deleteComment(user: TaskUser, taskId: string, commentId: string) {
    const task = this.ensureTask(taskId);
    this.ensureCanReadTask(user, task);
    const comment = this.ensureComment(taskId, commentId);
    this.ensureCanEditComment(user, comment);

    this.db
      .update(taskCommentsTable)
      .set({ deleted: true, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(taskCommentsTable.id, commentId),
          eq(taskCommentsTable.taskId, taskId),
        ),
      )
      .run();

    return { success: true };
  }

  listActivity(_user: TaskUser, taskId: string) {
    const task = this.ensureTask(taskId);
    this.ensureCanReadTask(_user, task);
    const usersById = this.getUsersById();

    return this.db
      .select()
      .from(taskActivityLogsTable)
      .where(eq(taskActivityLogsTable.taskId, taskId))
      .orderBy(desc(taskActivityLogsTable.createdAt))
      .all()
      .map((activity) => ({
        ...activity,
        actorName: activity.actorId
          ? (usersById.get(activity.actorId)?.name ?? null)
          : null,
      }));
  }

  listAttachments(_user: TaskUser, taskId: string) {
    const task = this.ensureTask(taskId);
    this.ensureCanReadTask(_user, task);
    const usersById = this.getUsersById();

    return this.db
      .select()
      .from(taskAttachmentsTable)
      .where(eq(taskAttachmentsTable.taskId, taskId))
      .orderBy(desc(taskAttachmentsTable.createdAt))
      .all()
      .map((attachment) => this.toAttachmentDto(attachment, usersById));
  }

  createAttachment(user: TaskUser, taskId: string, payload: unknown) {
    const task = this.ensureTask(taskId);
    this.ensureCanWriteTask(user, task);
    const input = createAttachmentSchema.parse(payload);

    const row: TaskAttachmentInsert = {
      id: `task-att-${randomUUID().slice(0, 12)}`,
      taskId,
      userId: user.id,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      contentType: input.contentType,
      fileSize: input.fileSize,
      createdAt: new Date().toISOString(),
    };

    this.db.insert(taskAttachmentsTable).values(row).run();
    return this.toAttachmentDto(
      this.ensureAttachment(taskId, row.id),
      this.getUsersById(),
    );
  }

  deleteAttachment(user: TaskUser, taskId: string, attachmentId: string) {
    const task = this.ensureTask(taskId);
    const attachment = this.ensureAttachment(taskId, attachmentId);

    if (
      user.role !== 'admin' &&
      task.reporterId !== user.id &&
      task.assigneeId !== user.id &&
      attachment.userId !== user.id
    ) {
      throw new ForbiddenException('You cannot delete this attachment');
    }

    this.db
      .delete(taskAttachmentsTable)
      .where(
        and(
          eq(taskAttachmentsTable.id, attachmentId),
          eq(taskAttachmentsTable.taskId, taskId),
        ),
      )
      .run();

    return { success: true };
  }

  private buildListConditions(
    user: TaskUser,
    query: ReturnType<typeof listTasksQuerySchema.parse>,
  ) {
    const conditions: SQL[] = [eq(tasksTable.archived, query.archived)];

    if (query.scope === 'my') {
      const mine = or(
        eq(tasksTable.assigneeId, user.id),
        eq(tasksTable.ownerId, user.id),
      );
      if (mine) conditions.push(mine);
    } else if (query.scope === 'user') {
      const targetUserId = query.userId || user.id;
      conditions.push(eq(tasksTable.assigneeId, targetUserId));
      conditions.push(eq(tasksTable.visibility, 'TEAM'));
    } else {
      conditions.push(eq(tasksTable.visibility, 'TEAM'));
    }

    if (query.taskType)
      conditions.push(eq(tasksTable.taskType, query.taskType));
    if (query.status) conditions.push(eq(tasksTable.status, query.status));
    if (query.priority)
      conditions.push(eq(tasksTable.priority, query.priority));
    if (query.assigneeId) {
      conditions.push(eq(tasksTable.assigneeId, query.assigneeId));
    }
    if (query.q) {
      const keyword = `%${query.q}%`;
      const search = or(
        like(tasksTable.title, keyword),
        like(tasksTable.content, keyword),
      );
      if (search) conditions.push(search);
    }

    return conditions;
  }

  private getTaskOrderBy(sort: string) {
    const priorityOrder = sql`
      CASE ${tasksTable.priority}
        WHEN 'URGENT' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
      END
    `;

    if (sort === 'recent') return [desc(tasksTable.updatedAt)];
    if (sort === 'oldest') return [asc(tasksTable.createdAt)];
    if (sort === 'dueDate') {
      return [
        sql`${tasksTable.dueDate} IS NULL`,
        asc(tasksTable.dueDate),
        asc(tasksTable.orderIdx),
      ];
    }
    if (sort === 'priority') {
      return [
        priorityOrder,
        asc(tasksTable.orderIdx),
        desc(tasksTable.createdAt),
      ];
    }
    return [asc(tasksTable.orderIdx), desc(tasksTable.createdAt)];
  }

  private recordTaskChanges(
    user: TaskUser,
    before: TaskRow,
    changes: Partial<TaskInsert>,
  ) {
    if (changes.status && changes.status !== before.status) {
      this.recordActivity({
        taskId: before.id,
        actorId: user.id,
        activityType: 'STATUS',
        fromValue: before.status,
        toValue: changes.status,
        message: '업무 상태가 변경되었습니다.',
      });
    }

    if (changes.priority && changes.priority !== before.priority) {
      this.recordActivity({
        taskId: before.id,
        actorId: user.id,
        activityType: 'PRIORITY',
        fromValue: before.priority,
        toValue: changes.priority,
        message: '업무 우선순위가 변경되었습니다.',
      });
    }

    if (
      Object.prototype.hasOwnProperty.call(changes, 'assigneeId') &&
      changes.assigneeId !== before.assigneeId
    ) {
      this.recordActivity({
        taskId: before.id,
        actorId: user.id,
        activityType: 'ASSIGNEE',
        fromValue: before.assigneeId,
        toValue: changes.assigneeId ?? null,
        message: '업무 담당자가 변경되었습니다.',
      });
    }

    const onlySystemFields = [
      'status',
      'priority',
      'assigneeId',
      'scope',
      'visibility',
      'updatedAt',
    ];
    const hasGeneralUpdate = Object.keys(changes).some(
      (key) => !onlySystemFields.includes(key),
    );

    if (hasGeneralUpdate) {
      this.recordActivity({
        taskId: before.id,
        actorId: user.id,
        activityType: 'UPDATED',
        message: '업무 정보가 수정되었습니다.',
      });
    }
  }

  private recordActivity(input: {
    taskId: string;
    actorId: string | null;
    activityType: TaskActivityType;
    fromValue?: string | null;
    toValue?: string | null;
    message?: string | null;
  }) {
    try {
      this.db
        .insert(taskActivityLogsTable)
        .values({
          id: `task-log-${randomUUID().slice(0, 12)}`,
          taskId: input.taskId,
          actorId: input.actorId,
          activityType: input.activityType,
          fromValue: input.fromValue ?? null,
          toValue: input.toValue ?? null,
          message: input.message ?? null,
          createdAt: new Date().toISOString(),
        })
        .run();
    } catch {
      // Activity logs must not block the primary task operation.
    }
  }

  private ensureTask(taskId: string) {
    const task = this.db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .get();

    if (!task) {
      throw new NotFoundException(`Task not found: ${taskId}`);
    }

    return task;
  }

  private ensureChecklist(taskId: string, checklistId: string) {
    const row = this.db
      .select()
      .from(taskChecklistsTable)
      .where(
        and(
          eq(taskChecklistsTable.id, checklistId),
          eq(taskChecklistsTable.taskId, taskId),
        ),
      )
      .get();

    if (!row) {
      throw new NotFoundException(`Task checklist not found: ${checklistId}`);
    }

    return row;
  }

  private ensureComment(taskId: string, commentId: string) {
    const row = this.db
      .select()
      .from(taskCommentsTable)
      .where(
        and(
          eq(taskCommentsTable.id, commentId),
          eq(taskCommentsTable.taskId, taskId),
          eq(taskCommentsTable.deleted, false),
        ),
      )
      .get();

    if (!row) {
      throw new NotFoundException(`Task comment not found: ${commentId}`);
    }

    return row;
  }

  private ensureAttachment(taskId: string, attachmentId: string) {
    const row = this.db
      .select()
      .from(taskAttachmentsTable)
      .where(
        and(
          eq(taskAttachmentsTable.id, attachmentId),
          eq(taskAttachmentsTable.taskId, taskId),
        ),
      )
      .get();

    if (!row) {
      throw new NotFoundException(`Task attachment not found: ${attachmentId}`);
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

  private ensureCanWriteTask(user: TaskUser, task: TaskRow) {
    if (
      user.role === 'admin' ||
      task.reporterId === user.id ||
      task.assigneeId === user.id ||
      task.ownerId === user.id
    ) {
      return;
    }

    throw new ForbiddenException('You cannot modify this task');
  }

  private ensureCanReadTask(user: TaskUser, task: TaskRow) {
    if (
      task.visibility === 'TEAM' ||
      user.role === 'admin' ||
      task.reporterId === user.id ||
      task.assigneeId === user.id ||
      task.ownerId === user.id
    ) {
      return;
    }

    throw new ForbiddenException('You cannot read this task');
  }

  private ensureCanArchiveTask(user: TaskUser, task: TaskRow) {
    if (
      user.role === 'admin' ||
      task.reporterId === user.id ||
      task.ownerId === user.id
    ) {
      return;
    }

    throw new ForbiddenException('You cannot archive this task');
  }

  private ensureCanEditComment(user: TaskUser, comment: TaskCommentRow) {
    if (user.role === 'admin' || comment.userId === user.id) {
      return;
    }

    throw new ForbiddenException('You cannot edit this comment');
  }

  private getUsersById() {
    const rows = this.db.select().from(usersTable).all();
    return new Map(rows.map((user) => [user.id, user]));
  }

  private toTaskDto(task: TaskRow, usersById: Map<string, UserRow>) {
    const reporter = usersById.get(task.reporterId);
    const assignee = task.assigneeId ? usersById.get(task.assigneeId) : null;
    const owner = task.ownerId ? usersById.get(task.ownerId) : null;

    return {
      ...task,
      reporterName: reporter?.name ?? null,
      reporterEmail: reporter?.email ?? null,
      assigneeName: assignee?.name ?? null,
      assigneeEmail: assignee?.email ?? null,
      ownerName: owner?.name ?? null,
      ownerEmail: owner?.email ?? null,
    };
  }

  private toCommentDto(
    comment: TaskCommentRow,
    usersById: Map<string, UserRow>,
  ) {
    const user = usersById.get(comment.userId);
    return {
      id: comment.id,
      taskId: comment.taskId,
      userId: comment.userId,
      userName: user?.name ?? null,
      userEmail: user?.email ?? null,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  private toAttachmentDto(
    attachment: TaskAttachmentRow,
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
