import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  devChallengeAssignmentBlocksTable,
  devChallengeAssignmentsTable,
  devChallengeCategoriesTable,
  devChallengeSectionsTable,
  devChallengeSubmissionsTable,
  devChallengeWorkspaceMembersTable,
  devChallengeWorkspacesTable,
  usersTable,
  type DevChallengeAssignmentBlockInsert,
  type DevChallengeWorkspaceRole,
  type DevChallengeWorkspaceRow,
} from '../database/schema';
import type {
  CreateAssignmentBlockInput,
  CreateAssignmentInput,
  CreateCategoryInput,
  CreateSectionInput,
  CreateSubmissionInput,
  CreateWorkspaceInput,
  ReviewSubmissionInput,
  UpdateWorkspaceInput,
  UpdateAssignmentBlockInput,
  UpdateAssignmentInput,
  UpdateCategoryInput,
  UpdateSectionInput,
  UpdateSubmissionInput,
  UpsertWorkspaceMemberInput,
} from './dto/dev-challenge.schema';

export type DevChallengeUser = {
  id: string;
  role: 'admin' | 'user';
};

@Injectable()
export class DevChallengeService {
  constructor(private readonly db: DatabaseService) {}

  listWorkspaces(user: DevChallengeUser) {
    const rows = this.db.db
      .select()
      .from(devChallengeWorkspacesTable)
      .where(eq(devChallengeWorkspacesTable.archived, false))
      .orderBy(
        asc(devChallengeWorkspacesTable.orderIdx),
        desc(devChallengeWorkspacesTable.createdAt),
      )
      .all();

    return rows.map((workspace) => this.toWorkspaceDto(workspace, user));
  }

  getWorkspace(user: DevChallengeUser, workspaceId: string) {
    const workspace = this.ensureWorkspace(workspaceId);
    return this.toWorkspaceDto(workspace, user);
  }

  createWorkspace(user: DevChallengeUser, input: CreateWorkspaceInput) {
    const id = `dev-challenge-workspace-${randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();
    const maxOrder = this.db.db
      .select({ orderIdx: devChallengeWorkspacesTable.orderIdx })
      .from(devChallengeWorkspacesTable)
      .all()
      .reduce((max, row) => Math.max(max, row.orderIdx), -1);

    this.db.db
      .insert(devChallengeWorkspacesTable)
      .values({
        id,
        name: input.name,
        description: input.description,
        icon: input.icon,
        color: input.color ?? null,
        orderIdx: maxOrder + 1,
        archived: false,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    this.db.db
      .insert(devChallengeWorkspaceMembersTable)
      .values({
        id: `dev-challenge-member-${randomUUID().slice(0, 12)}`,
        workspaceId: id,
        userId: user.id,
        role: 'owner',
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.getWorkspace(user, id);
  }

  updateWorkspace(
    user: DevChallengeUser,
    workspaceId: string,
    input: UpdateWorkspaceInput,
  ) {
    this.ensureCanManageWorkspace(user, workspaceId);

    this.db.db
      .update(devChallengeWorkspacesTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(devChallengeWorkspacesTable.id, workspaceId))
      .run();

    return this.getWorkspace(user, workspaceId);
  }

  deleteWorkspace(user: DevChallengeUser, workspaceId: string) {
    this.ensureCanManageWorkspace(user, workspaceId);
    if (workspaceId === this.db.getDevChallengeDefaultWorkspaceId()) {
      throw new ForbiddenException('Default challenge workspace cannot be deleted');
    }

    this.db.db
      .delete(devChallengeWorkspacesTable)
      .where(eq(devChallengeWorkspacesTable.id, workspaceId))
      .run();

    return { success: true, workspaceId };
  }

  reorderWorkspaces(user: DevChallengeUser, workspaceIds: string[]) {
    const now = new Date().toISOString();

    for (let index = 0; index < workspaceIds.length; index += 1) {
      this.ensureCanManageWorkspace(user, workspaceIds[index]);
      this.db.db
        .update(devChallengeWorkspacesTable)
        .set({ orderIdx: index, updatedAt: now })
        .where(eq(devChallengeWorkspacesTable.id, workspaceIds[index]))
        .run();
    }

    return { success: true };
  }

  getWorkspaceMembers(user: DevChallengeUser, workspaceId: string) {
    this.ensureCanManageWorkspace(user, workspaceId);
    const users = this.db.db.select().from(usersTable).all();
    const usersById = new Map(users.map((row) => [row.id, row]));

    return this.db.db
      .select()
      .from(devChallengeWorkspaceMembersTable)
      .where(eq(devChallengeWorkspaceMembersTable.workspaceId, workspaceId))
      .orderBy(devChallengeWorkspaceMembersTable.createdAt)
      .all()
      .map((member) => {
        const memberUser = usersById.get(member.userId);
        return {
          ...member,
          userName: memberUser?.name ?? null,
          userEmail: memberUser?.email ?? null,
        };
      });
  }

  upsertWorkspaceMember(
    user: DevChallengeUser,
    workspaceId: string,
    input: UpsertWorkspaceMemberInput,
  ) {
    this.ensureCanManageWorkspace(user, workspaceId);
    this.ensureUser(input.userId);
    const now = new Date().toISOString();
    const existing = this.db.db
      .select()
      .from(devChallengeWorkspaceMembersTable)
      .where(
        and(
          eq(devChallengeWorkspaceMembersTable.workspaceId, workspaceId),
          eq(devChallengeWorkspaceMembersTable.userId, input.userId),
        ),
      )
      .get();

    if (existing) {
      this.db.db
        .update(devChallengeWorkspaceMembersTable)
        .set({ role: input.role, updatedAt: now })
        .where(eq(devChallengeWorkspaceMembersTable.id, existing.id))
        .run();
    } else {
      this.db.db
        .insert(devChallengeWorkspaceMembersTable)
        .values({
          id: `dev-challenge-member-${randomUUID().slice(0, 12)}`,
          workspaceId,
          userId: input.userId,
          role: input.role,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }

    return this.getWorkspaceMembers(user, workspaceId);
  }

  removeWorkspaceMember(
    user: DevChallengeUser,
    workspaceId: string,
    memberId: string,
  ) {
    this.ensureCanManageWorkspace(user, workspaceId);
    this.db.db
      .delete(devChallengeWorkspaceMembersTable)
      .where(
        and(
          eq(devChallengeWorkspaceMembersTable.id, memberId),
          eq(devChallengeWorkspaceMembersTable.workspaceId, workspaceId),
        ),
      )
      .run();

    return { success: true, workspaceId, memberId };
  }

  getCategories() {
    return this.getCategoriesByWorkspace(this.db.getDevChallengeDefaultWorkspaceId());
  }

  getCategoriesByWorkspace(workspaceId: string) {
    this.ensureWorkspace(workspaceId);
    return this.db.db
      .select()
      .from(devChallengeCategoriesTable)
      .where(eq(devChallengeCategoriesTable.workspaceId, workspaceId))
      .orderBy(devChallengeCategoriesTable.orderIdx)
      .all();
  }

  getCategoryById(id: string) {
    return this.db.db
      .select()
      .from(devChallengeCategoriesTable)
      .where(eq(devChallengeCategoriesTable.id, id))
      .get();
  }

  createCategory(input: CreateCategoryInput, userId: string) {
    const workspaceId =
      input.workspaceId ?? this.db.getDevChallengeDefaultWorkspaceId();
    const id = randomUUID();
    const now = new Date().toISOString();
    const existingCount = this.getCategoriesByWorkspace(workspaceId).length;

    this.db.db
      .insert(devChallengeCategoriesTable)
      .values({
        id,
        workspaceId,
        name: input.name,
        summary: input.summary,
        icon: input.icon ?? 'Trophy',
        orderIdx: existingCount,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.getCategoryById(id);
  }

  createCategoryInWorkspace(
    workspaceId: string,
    input: CreateCategoryInput,
    user: DevChallengeUser,
  ) {
    this.ensureCanEditWorkspace(user, workspaceId);
    return this.createCategory({ ...input, workspaceId }, user.id);
  }

  updateCategory(id: string, input: UpdateCategoryInput, userId: string) {
    const category = this.getCategoryById(id);
    if (!category) throw new NotFoundException('Category not found');
    if (category.createdBy !== userId) throw new ForbiddenException('Not authorized');

    this.db.db
      .update(devChallengeCategoriesTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(devChallengeCategoriesTable.id, id))
      .run();

    return this.getCategoryById(id);
  }

  deleteCategory(id: string, userId: string) {
    const category = this.getCategoryById(id);
    if (!category) return;
    if (category.createdBy !== userId) throw new ForbiddenException('Not authorized');

    this.db.db
      .delete(devChallengeCategoriesTable)
      .where(eq(devChallengeCategoriesTable.id, id))
      .run();
  }

  reorderCategories(categoryIds: string[]) {
    const now = new Date().toISOString();
    for (let index = 0; index < categoryIds.length; index += 1) {
      this.db.db
        .update(devChallengeCategoriesTable)
        .set({ orderIdx: index, updatedAt: now })
        .where(eq(devChallengeCategoriesTable.id, categoryIds[index]))
        .run();
    }
    return { success: true };
  }

  reorderWorkspaceCategories(
    workspaceId: string,
    categoryIds: string[],
    user: DevChallengeUser,
  ) {
    this.ensureCanEditWorkspace(user, workspaceId);
    for (const categoryId of categoryIds) {
      this.ensureCategoryInWorkspace(categoryId, workspaceId);
    }
    return this.reorderCategories(categoryIds);
  }

  getSectionsByCategory(categoryId: string) {
    return this.db.db
      .select()
      .from(devChallengeSectionsTable)
      .where(eq(devChallengeSectionsTable.categoryId, categoryId))
      .orderBy(devChallengeSectionsTable.orderIdx)
      .all();
  }

  getSectionById(id: string) {
    return this.db.db
      .select()
      .from(devChallengeSectionsTable)
      .where(eq(devChallengeSectionsTable.id, id))
      .get();
  }

  createSection(input: CreateSectionInput) {
    const category = this.getCategoryById(input.categoryId);
    if (!category) throw new NotFoundException('Category not found');

    const id = randomUUID();
    const now = new Date().toISOString();
    const existingCount = this.getSectionsByCategory(input.categoryId).length;

    this.db.db
      .insert(devChallengeSectionsTable)
      .values({
        id,
        categoryId: input.categoryId,
        title: input.title,
        summary: input.summary,
        orderIdx: input.orderIdx ?? existingCount,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.getSectionById(id);
  }

  updateSection(id: string, input: UpdateSectionInput) {
    const section = this.getSectionById(id);
    if (!section) throw new NotFoundException('Section not found');

    this.db.db
      .update(devChallengeSectionsTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(devChallengeSectionsTable.id, id))
      .run();

    return this.getSectionById(id);
  }

  deleteSection(id: string) {
    const section = this.getSectionById(id);
    if (!section) return;

    this.db.db
      .delete(devChallengeSectionsTable)
      .where(eq(devChallengeSectionsTable.id, id))
      .run();
  }

  reorderSections(categoryId: string, sectionIds: string[]) {
    const now = new Date().toISOString();
    for (let index = 0; index < sectionIds.length; index += 1) {
      this.db.db
        .update(devChallengeSectionsTable)
        .set({ orderIdx: index, updatedAt: now })
        .where(eq(devChallengeSectionsTable.id, sectionIds[index]))
        .run();
    }
    return { success: true, categoryId };
  }

  getAssignmentsBySection(sectionId: string) {
    return this.db.db
      .select()
      .from(devChallengeAssignmentsTable)
      .where(eq(devChallengeAssignmentsTable.sectionId, sectionId))
      .orderBy(devChallengeAssignmentsTable.orderIdx)
      .all();
  }

  getAssignmentById(id: string) {
    return this.db.db
      .select()
      .from(devChallengeAssignmentsTable)
      .where(eq(devChallengeAssignmentsTable.id, id))
      .get();
  }

  getBlocksByAssignment(assignmentId: string) {
    return this.db.db
      .select()
      .from(devChallengeAssignmentBlocksTable)
      .where(eq(devChallengeAssignmentBlocksTable.assignmentId, assignmentId))
      .orderBy(devChallengeAssignmentBlocksTable.orderIdx)
      .all();
  }

  getAssignmentDetail(id: string) {
    const assignment = this.getAssignmentById(id);
    if (!assignment) throw new NotFoundException('Assignment not found');
    return {
      ...assignment,
      blocks: this.getBlocksByAssignment(id),
    };
  }

  createAssignment(input: CreateAssignmentInput, userId: string) {
    const section = this.getSectionById(input.sectionId);
    if (!section) throw new NotFoundException('Section not found');

    const id = randomUUID();
    const now = new Date().toISOString();
    const existingCount = this.getAssignmentsBySection(input.sectionId).length;

    this.db.db
      .insert(devChallengeAssignmentsTable)
      .values({
        id,
        sectionId: input.sectionId,
        title: input.title,
        summary: input.summary,
        difficulty: input.difficulty,
        status: input.status,
        orderIdx: existingCount,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const blocks: DevChallengeAssignmentBlockInsert[] = [];
    if (input.noteContent?.trim()) {
      blocks.push({
        id: randomUUID(),
        assignmentId: id,
        blockType: 'NOTE' as const,
        title: '챌린지 설명',
        content: input.noteContent.trim(),
        orderIdx: blocks.length,
        createdAt: now,
        updatedAt: now,
      });
    }
    if (input.checklistItems.length > 0) {
      blocks.push({
        id: randomUUID(),
        assignmentId: id,
        blockType: 'CHECKLIST' as const,
        title: '완료 조건',
        content: JSON.stringify(input.checklistItems),
        orderIdx: blocks.length,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (blocks.length > 0) {
      this.db.db.insert(devChallengeAssignmentBlocksTable).values(blocks).run();
    }

    return this.getAssignmentDetail(id);
  }

  updateAssignment(id: string, input: UpdateAssignmentInput, userId: string) {
    const assignment = this.getAssignmentById(id);
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.createdBy !== userId) throw new ForbiddenException('Not authorized');

    this.db.db
      .update(devChallengeAssignmentsTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(devChallengeAssignmentsTable.id, id))
      .run();

    return this.getAssignmentDetail(id);
  }

  deleteAssignment(id: string, userId: string) {
    const assignment = this.getAssignmentById(id);
    if (!assignment) return;
    if (assignment.createdBy !== userId) throw new ForbiddenException('Not authorized');

    this.db.db
      .delete(devChallengeAssignmentsTable)
      .where(eq(devChallengeAssignmentsTable.id, id))
      .run();
  }

  reorderAssignments(sectionId: string, assignmentIds: string[]) {
    const now = new Date().toISOString();
    for (let index = 0; index < assignmentIds.length; index += 1) {
      this.db.db
        .update(devChallengeAssignmentsTable)
        .set({ orderIdx: index, updatedAt: now })
        .where(eq(devChallengeAssignmentsTable.id, assignmentIds[index]))
        .run();
    }
    return { success: true, sectionId };
  }

  createAssignmentBlock(input: CreateAssignmentBlockInput) {
    const assignment = this.getAssignmentById(input.assignmentId);
    if (!assignment) throw new NotFoundException('Assignment not found');

    const id = randomUUID();
    const now = new Date().toISOString();
    const orderIdx = input.orderIdx ?? this.getBlocksByAssignment(input.assignmentId).length;

    this.db.db
      .insert(devChallengeAssignmentBlocksTable)
      .values({
        id,
        assignmentId: input.assignmentId,
        blockType: input.blockType,
        title: input.title,
        content: input.content,
        orderIdx,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.db.db
      .select()
      .from(devChallengeAssignmentBlocksTable)
      .where(eq(devChallengeAssignmentBlocksTable.id, id))
      .get();
  }

  updateAssignmentBlock(id: string, input: UpdateAssignmentBlockInput) {
    const block = this.db.db
      .select()
      .from(devChallengeAssignmentBlocksTable)
      .where(eq(devChallengeAssignmentBlocksTable.id, id))
      .get();
    if (!block) throw new NotFoundException('Assignment block not found');

    this.db.db
      .update(devChallengeAssignmentBlocksTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(devChallengeAssignmentBlocksTable.id, id))
      .run();

    return this.db.db
      .select()
      .from(devChallengeAssignmentBlocksTable)
      .where(eq(devChallengeAssignmentBlocksTable.id, id))
      .get();
  }

  deleteAssignmentBlock(id: string) {
    this.db.db
      .delete(devChallengeAssignmentBlocksTable)
      .where(eq(devChallengeAssignmentBlocksTable.id, id))
      .run();
  }

  getSubmissionsByAssignment(assignmentId: string) {
    return this.db.db
      .select()
      .from(devChallengeSubmissionsTable)
      .where(eq(devChallengeSubmissionsTable.assignmentId, assignmentId))
      .orderBy(devChallengeSubmissionsTable.updatedAt)
      .all();
  }

  getSubmissionById(id: string) {
    return this.db.db
      .select()
      .from(devChallengeSubmissionsTable)
      .where(eq(devChallengeSubmissionsTable.id, id))
      .get();
  }

  getMySubmission(assignmentId: string, userId: string) {
    return this.db.db
      .select()
      .from(devChallengeSubmissionsTable)
      .where(
        and(
          eq(devChallengeSubmissionsTable.assignmentId, assignmentId),
          eq(devChallengeSubmissionsTable.userId, userId),
        ),
      )
      .get();
  }

  createSubmission(input: CreateSubmissionInput, userId: string) {
    const assignment = this.getAssignmentById(input.assignmentId);
    if (!assignment) throw new NotFoundException('Assignment not found');

    const existing = this.getMySubmission(input.assignmentId, userId);
    if (existing) {
      return this.updateSubmission(existing.id, input, userId);
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const checkedItems = this.normalizeCheckedItems(input.assignmentId, input.checkedItems);
    const score = this.calculateSubmissionScore(input.assignmentId, checkedItems);

    this.db.db
      .insert(devChallengeSubmissionsTable)
      .values({
        id,
        assignmentId: input.assignmentId,
        userId,
        comment: input.comment.trim(),
        githubUrl: input.githubUrl,
        status: 'SUBMITTED',
        score: score.score,
        maxScore: score.maxScore,
        checkedItems,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.getSubmissionById(id);
  }

  updateSubmission(id: string, input: UpdateSubmissionInput, userId: string) {
    const submission = this.getSubmissionById(id);
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.userId !== userId) throw new ForbiddenException('Not authorized');

    const checkedItems = this.normalizeCheckedItems(
      submission.assignmentId,
      input.checkedItems ?? submission.checkedItems,
    );
    const score = this.calculateSubmissionScore(submission.assignmentId, checkedItems);

    this.db.db
      .update(devChallengeSubmissionsTable)
      .set({
        comment: input.comment === undefined ? submission.comment : input.comment.trim(),
        githubUrl: input.githubUrl === undefined ? submission.githubUrl : input.githubUrl,
        checkedItems,
        score: score.score,
        maxScore: score.maxScore,
        status: 'SUBMITTED',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(devChallengeSubmissionsTable.id, id))
      .run();

    return this.getSubmissionById(id);
  }

  reviewSubmission(id: string, input: ReviewSubmissionInput, reviewerId: string) {
    const submission = this.getSubmissionById(id);
    if (!submission) throw new NotFoundException('Submission not found');

    this.db.db
      .update(devChallengeSubmissionsTable)
      .set({
        ...input,
        reviewedBy: reviewerId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(devChallengeSubmissionsTable.id, id))
      .run();

    return this.getSubmissionById(id);
  }

  private ensureWorkspace(workspaceId: string) {
    const workspace = this.db.db
      .select()
      .from(devChallengeWorkspacesTable)
      .where(eq(devChallengeWorkspacesTable.id, workspaceId))
      .get();

    if (!workspace) {
      throw new NotFoundException(`Challenge workspace not found: ${workspaceId}`);
    }

    return workspace;
  }

  private ensureUser(userId: string) {
    const user = this.db.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .get();

    if (!user) {
      throw new NotFoundException(`User not found: ${userId}`);
    }

    return user;
  }

  private getWorkspaceRole(
    user: DevChallengeUser,
    workspaceId: string,
  ): DevChallengeWorkspaceRole | null {
    if (user.role === 'admin') return 'owner';

    const member = this.db.db
      .select()
      .from(devChallengeWorkspaceMembersTable)
      .where(
        and(
          eq(devChallengeWorkspaceMembersTable.workspaceId, workspaceId),
          eq(devChallengeWorkspaceMembersTable.userId, user.id),
        ),
      )
      .get();

    return member?.role ?? null;
  }

  private ensureCanManageWorkspace(
    user: DevChallengeUser,
    workspaceId: string,
  ) {
    this.ensureWorkspace(workspaceId);
    const role = this.getWorkspaceRole(user, workspaceId);
    if (role === 'owner') return role;
    throw new ForbiddenException('You cannot manage this challenge workspace');
  }

  private ensureCanEditWorkspace(
    user: DevChallengeUser,
    workspaceId: string,
  ) {
    this.ensureWorkspace(workspaceId);
    const role = this.getWorkspaceRole(user, workspaceId);
    if (role === 'owner' || role === 'editor') return role;
    throw new ForbiddenException('You cannot edit this challenge workspace');
  }

  private ensureCategoryInWorkspace(categoryId: string, workspaceId: string) {
    const category = this.getCategoryById(categoryId);
    if (!category) throw new NotFoundException('Category not found');
    if (category.workspaceId !== workspaceId) {
      throw new ForbiddenException('Category does not belong to workspace');
    }
    return category;
  }

  private toWorkspaceDto(
    workspace: DevChallengeWorkspaceRow,
    user: DevChallengeUser,
  ) {
    const categories = this.db.db.select().from(devChallengeCategoriesTable).all();
    const sections = this.db.db.select().from(devChallengeSectionsTable).all();
    const assignments = this.db.db
      .select()
      .from(devChallengeAssignmentsTable)
      .all();
    const members = this.db.db
      .select()
      .from(devChallengeWorkspaceMembersTable)
      .all();
    const workspaceCategories = categories.filter(
      (category) => category.workspaceId === workspace.id,
    );
    const categoryIds = new Set(
      workspaceCategories.map((category) => category.id),
    );
    const workspaceSections = sections.filter((section) =>
      categoryIds.has(section.categoryId),
    );
    const sectionIds = new Set(
      workspaceSections.map((section) => section.id),
    );
    const workspaceMembers = members.filter(
      (member) => member.workspaceId === workspace.id,
    );

    return {
      ...workspace,
      myRole: this.getWorkspaceRole(user, workspace.id) ?? 'member',
      categoryCount: workspaceCategories.length,
      sectionCount: workspaceSections.length,
      assignmentCount: assignments.filter((assignment) =>
        sectionIds.has(assignment.sectionId),
      ).length,
      memberCount: workspaceMembers.length,
    };
  }

  private calculateSubmissionScore(assignmentId: string, checkedItems: string[]) {
    const validIds = new Set(this.getChecklistItemIds(assignmentId));
    const checkedValidIds = new Set(checkedItems.filter((itemId) => validIds.has(itemId)));
    return {
      score: checkedValidIds.size * 10,
      maxScore: validIds.size * 10,
    };
  }

  private normalizeCheckedItems(assignmentId: string, checkedItems: string[]) {
    const validIds = new Set(this.getChecklistItemIds(assignmentId));
    return Array.from(new Set(checkedItems.filter((itemId) => validIds.has(itemId))));
  }

  private getChecklistItemIds(assignmentId: string) {
    const blocks = this.getBlocksByAssignment(assignmentId);
    const ids: string[] = [];

    for (const block of blocks) {
      if (block.blockType !== 'CHECKLIST') continue;
      try {
        const parsed = JSON.parse(block.content);
        if (!Array.isArray(parsed)) continue;
        for (let index = 0; index < parsed.length; index += 1) {
          const item = parsed[index];
          if (typeof item?.id === 'string') {
            ids.push(item.id);
          } else if (typeof item?.label === 'string') {
            ids.push(String(index));
          } else if (typeof item === 'string') {
            ids.push(String(index));
          }
        }
      } catch {
        block.content
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .forEach((_line, index) => ids.push(String(index)));
      }
    }

    return ids;
  }
}
