import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { sql, eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import {
  challengeCategoriesTable,
  challengeSectionsTable,
  challengeTopicsTable,
  challengeSubmissionsTable,
  challengeGptThreadsTable,
  challengeGptMessagesTable,
  challengeUserNotesTable,
  type ChallengeSubmissionRow,
  type GptMessageRole,
} from '../../database/schema';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateSectionInput,
  CreateTopicInput,
  CreateSubmissionInput,
  CreateGptThreadInput,
  CreateNoteInput,
} from '../dto/challenge.schema';

@Injectable()
export class ChallengeService {
  constructor(private readonly db: DatabaseService) {}

  // ─── Categories ─────────────────────────────────────────────────────────

  async getCategories() {
    return this.db.db.select().from(challengeCategoriesTable).all();
  }

  async getCategoryById(id: string) {
    return this.db.db.select().from(challengeCategoriesTable).where(eq(challengeCategoriesTable.id, id)).get();
  }

  async createCategory(input: CreateCategoryInput, userId: string) {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.db
      .insert(challengeCategoriesTable)
      .values({
        id,
        ...input,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.getCategoryById(id);
  }

  async updateCategory(id: string, input: UpdateCategoryInput, userId: string) {
    const category = await this.getCategoryById(id);
    if (!category) throw new NotFoundException('Category not found');
    if (category.createdBy !== userId) throw new ForbiddenException('Not authorized');

    const now = new Date().toISOString();
    this.db.db
      .update(challengeCategoriesTable)
      .set({ ...input, updatedAt: now })
      .where(eq(challengeCategoriesTable.id, id))
      .run();

    return this.getCategoryById(id);
  }

  async deleteCategory(id: string, userId: string) {
    const category = await this.getCategoryById(id);
    if (!category) return;
    if (category.createdBy !== userId) throw new ForbiddenException('Not authorized');

    this.db.db.delete(challengeCategoriesTable).where(eq(challengeCategoriesTable.id, id)).run();
  }

  // ─── Sections ───────────────────────────────────────────────────────────

  async getSectionsByCategory(categoryId: string) {
    return this.db.db
      .select()
      .from(challengeSectionsTable)
      .where(eq(challengeSectionsTable.categoryId, categoryId))
      .orderBy(challengeSectionsTable.orderIdx)
      .all();
  }

  async getSectionById(id: string) {
    return this.db.db.select().from(challengeSectionsTable).where(eq(challengeSectionsTable.id, id)).get();
  }

  async createSection(input: CreateSectionInput, userId: string) {
    const category = await this.getCategoryById(input.categoryId);
    if (!category) throw new NotFoundException('Category not found');

    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.db
      .insert(challengeSectionsTable)
      .values({
        id,
        ...input,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.getSectionById(id);
  }

  async updateSection(id: string, input: Partial<CreateSectionInput>, userId: string) {
    const section = await this.getSectionById(id);
    if (!section) throw new NotFoundException('Section not found');

    const now = new Date().toISOString();
    this.db.db
      .update(challengeSectionsTable)
      .set({ ...input, updatedAt: now })
      .where(eq(challengeSectionsTable.id, id))
      .run();

    return this.getSectionById(id);
  }

  async deleteSection(id: string, userId: string) {
    const section = await this.getSectionById(id);
    if (!section) return;

    this.db.db.delete(challengeSectionsTable).where(eq(challengeSectionsTable.id, id)).run();
  }

  // ─── Topics ─────────────────────────────────────────────────────────────

  async getTopicsBySection(sectionId: string) {
    return this.db.db
      .select()
      .from(challengeTopicsTable)
      .where(eq(challengeTopicsTable.sectionId, sectionId))
      .orderBy(challengeTopicsTable.orderIdx)
      .all();
  }

  async getTopicById(id: string) {
    return this.db.db.select().from(challengeTopicsTable).where(eq(challengeTopicsTable.id, id)).get();
  }

  async createTopic(input: CreateTopicInput, userId: string) {
    const section = await this.getSectionById(input.sectionId);
    if (!section) throw new NotFoundException('Section not found');

    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.db
      .insert(challengeTopicsTable)
      .values({
        id,
        ...input,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.getTopicById(id);
  }

  async updateTopic(id: string, input: Partial<CreateTopicInput>, userId: string) {
    const topic = await this.getTopicById(id);
    if (!topic) throw new NotFoundException('Topic not found');

    const now = new Date().toISOString();
    this.db.db
      .update(challengeTopicsTable)
      .set({ ...input, updatedAt: now })
      .where(eq(challengeTopicsTable.id, id))
      .run();

    return this.getTopicById(id);
  }

  async reorderTopics(sectionId: string, topicIds: string[], userId: string) {
    const now = new Date().toISOString();

    for (let i = 0; i < topicIds.length; i++) {
      this.db.db
        .update(challengeTopicsTable)
        .set({ orderIdx: i, updatedAt: now })
        .where(eq(challengeTopicsTable.id, topicIds[i]))
        .run();
    }
  }

  async deleteTopic(id: string, userId: string) {
    const topic = await this.getTopicById(id);
    if (!topic) throw new NotFoundException('Topic not found');

    this.db.db.delete(challengeTopicsTable).where(eq(challengeTopicsTable.id, id)).run();
  }

  // ─── Submissions ────────────────────────────────────────────────────────

  async getSubmissionsByTopic(topicId: string) {
    return this.db.db
      .select()
      .from(challengeSubmissionsTable)
      .where(eq(challengeSubmissionsTable.topicId, topicId))
      .all();
  }

  async getSubmissionById(id: string) {
    return this.db.db.select().from(challengeSubmissionsTable).where(eq(challengeSubmissionsTable.id, id)).get();
  }

  async getMySubmission(topicId: string, userId: string) {
    return this.db.db
      .select()
      .from(challengeSubmissionsTable)
      .where(and(eq(challengeSubmissionsTable.topicId, topicId), eq(challengeSubmissionsTable.userId, userId)))
      .get();
  }

  async createSubmission(input: CreateSubmissionInput, userId: string) {
    const topic = await this.getTopicById(input.topicId);
    if (!topic) throw new NotFoundException('Topic not found');

    const existing = await this.getMySubmission(input.topicId, userId);
    if (existing) {
      return this.updateSubmission(existing.id, input, userId);
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.db
      .insert(challengeSubmissionsTable)
      .values({
        id,
        topicId: input.topicId,
        userId,
        content: input.content,
        checkedItems: input.checkedItems,
        score: 0,
        maxScore: this.calculateMaxScore(topic),
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.getSubmissionById(id);
  }

  async updateSubmission(id: string, input: Partial<CreateSubmissionInput>, userId: string) {
    const submission = await this.getSubmissionById(id);
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.userId !== userId) throw new ForbiddenException('Not authorized');

    const now = new Date().toISOString();
    const topic = await this.getTopicById(submission.topicId);

    this.db.db
      .update(challengeSubmissionsTable)
      .set({
        content: input.content ?? submission.content,
        checkedItems: input.checkedItems ?? submission.checkedItems,
        score: this.calculateScore(input.checkedItems ?? submission.checkedItems, topic),
        updatedAt: now,
      })
      .where(eq(challengeSubmissionsTable.id, id))
      .run();

    return this.getSubmissionById(id);
  }

  async rateSubmission(id: string, rating: number, feedback?: string, userId?: string) {
    const submission = await this.getSubmissionById(id);
    if (!submission) throw new NotFoundException('Submission not found');

    const now = new Date().toISOString();
    this.db.db
      .update(challengeSubmissionsTable)
      .set({
        adminRating: rating,
        adminFeedback: feedback,
        ratedBy: userId,
        updatedAt: now,
      })
      .where(eq(challengeSubmissionsTable.id, id))
      .run();

    return this.getSubmissionById(id);
  }

  private calculateMaxScore(topic: any): number {
    if (topic.blockType !== 'CHECKLIST') return 0;
    try {
      const items = JSON.parse(topic.content);
      return Array.isArray(items) ? items.length * 10 : 0;
    } catch {
      return 0;
    }
  }

  private calculateScore(checkedItems: string[], topic: any): number {
    if (topic.blockType !== 'CHECKLIST') return 0;
    return checkedItems.length * 10;
  }

  // ─── GPT Threads ────────────────────────────────────────────────────────

  async getGptThreads(sectionId: string, userId: string) {
    return this.db.db
      .select()
      .from(challengeGptThreadsTable)
      .where(eq(challengeGptThreadsTable.userId, userId))
      .all();
  }

  async getGptThreadById(id: string) {
    return this.db.db.select().from(challengeGptThreadsTable).where(eq(challengeGptThreadsTable.id, id)).get();
  }

  async createGptThread(input: CreateGptThreadInput, userId: string) {
    const section = await this.getSectionById(input.sectionId);
    if (!section) throw new NotFoundException('Section not found');

    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.db
      .insert(challengeGptThreadsTable)
      .values({
        id,
        ...input,
        userId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.getGptThreadById(id);
  }

  async updateGptThread(id: string, updates: any, userId: string) {
    const thread = await this.getGptThreadById(id);
    if (!thread) throw new NotFoundException('Thread not found');
    if (thread.userId !== userId) throw new ForbiddenException('Not authorized');

    const now = new Date().toISOString();
    this.db.db
      .update(challengeGptThreadsTable)
      .set({ ...updates, updatedAt: now })
      .where(eq(challengeGptThreadsTable.id, id))
      .run();

    return this.getGptThreadById(id);
  }

  async deleteGptThread(id: string, userId: string) {
    const thread = await this.getGptThreadById(id);
    if (!thread) throw new NotFoundException('Thread not found');
    if (thread.userId !== userId) throw new ForbiddenException('Not authorized');

    this.db.db.delete(challengeGptThreadsTable).where(eq(challengeGptThreadsTable.id, id)).run();
  }

  // ─── GPT Messages ───────────────────────────────────────────────────────

  async getGptMessages(threadId: string) {
    return this.db.db
      .select()
      .from(challengeGptMessagesTable)
      .where(eq(challengeGptMessagesTable.threadId, threadId))
      .orderBy(challengeGptMessagesTable.createdAt)
      .all();
  }

  async createGptMessage(threadId: string, role: GptMessageRole, content: string, tokensIn?: number, tokensOut?: number) {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.db
      .insert(challengeGptMessagesTable)
      .values({
        id,
        threadId,
        role,
        content,
        tokensIn,
        tokensOut,
        createdAt: now,
      })
      .run();

    return this.db.db.select().from(challengeGptMessagesTable).where(eq(challengeGptMessagesTable.id, id)).get();
  }

  // ─── User Notes ─────────────────────────────────────────────────────────

  async getMyNotes(sectionId: string, userId: string) {
    return this.db.db
      .select()
      .from(challengeUserNotesTable)
      .where(and(eq(challengeUserNotesTable.userId, userId), eq(challengeUserNotesTable.sectionId, sectionId)))
      .orderBy(desc(challengeUserNotesTable.pinned), desc(challengeUserNotesTable.updatedAt))
      .all();
  }

  async getSharedNotes(sectionId: string, userId: string) {
    return this.db.db
      .select()
      .from(challengeUserNotesTable)
      .where(
        and(
          eq(challengeUserNotesTable.sectionId, sectionId),
          sql`${challengeUserNotesTable.userId} != ${userId}`,
          sql`${challengeUserNotesTable.visibility} IN ('shared', 'public')`,
        ),
      )
      .orderBy(desc(challengeUserNotesTable.updatedAt))
      .all();
  }

  async getNoteById(id: string) {
    return this.db.db.select().from(challengeUserNotesTable).where(eq(challengeUserNotesTable.id, id)).get();
  }

  async createNote(input: CreateNoteInput, userId: string) {
    if (!input.sectionId && !input.topicId) {
      throw new BadRequestException('sectionId or topicId must be provided');
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.db
      .insert(challengeUserNotesTable)
      .values({
        id,
        ...input,
        userId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.getNoteById(id);
  }

  async updateNote(id: string, input: Partial<CreateNoteInput>, userId: string) {
    const note = await this.getNoteById(id);
    if (!note) throw new NotFoundException('Note not found');
    if (note.userId !== userId) throw new ForbiddenException('Not authorized');

    const now = new Date().toISOString();
    this.db.db
      .update(challengeUserNotesTable)
      .set({ ...input, updatedAt: now })
      .where(eq(challengeUserNotesTable.id, id))
      .run();

    return this.getNoteById(id);
  }

  async deleteNote(id: string, userId: string) {
    const note = await this.getNoteById(id);
    if (!note) throw new NotFoundException('Note not found');
    if (note.userId !== userId) throw new ForbiddenException('Not authorized');

    this.db.db.delete(challengeUserNotesTable).where(eq(challengeUserNotesTable.id, id)).run();
  }
}
