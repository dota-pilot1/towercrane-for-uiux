import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  devChallengeAssignmentBlocksTable,
  devChallengeAssignmentsTable,
  devChallengeCategoriesTable,
  devChallengeSectionsTable,
  devChallengeSubmissionsTable,
  type DevChallengeAssignmentBlockInsert,
} from '../database/schema';
import type {
  CreateAssignmentBlockInput,
  CreateAssignmentInput,
  CreateCategoryInput,
  CreateSectionInput,
  CreateSubmissionInput,
  ReviewSubmissionInput,
  UpdateAssignmentBlockInput,
  UpdateAssignmentInput,
  UpdateCategoryInput,
  UpdateSectionInput,
  UpdateSubmissionInput,
} from './dto/dev-challenge.schema';

@Injectable()
export class DevChallengeService {
  constructor(private readonly db: DatabaseService) {}

  getCategories() {
    return this.db.db
      .select()
      .from(devChallengeCategoriesTable)
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
    const id = randomUUID();
    const now = new Date().toISOString();
    const existingCount = this.getCategories().length;

    this.db.db
      .insert(devChallengeCategoriesTable)
      .values({
        id,
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
