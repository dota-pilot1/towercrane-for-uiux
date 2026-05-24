import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  challengeCategoriesTable,
  challengeSectionsTable,
  challengeTopicsTable,
  challengeUserNotesTable,
  studyDiariesTable,
  usersTable,
  type ChallengeCategoryRow,
  type ChallengeSectionRow,
  type ChallengeTopicRow,
  type StudyDiaryRow,
} from '../database/schema';
import type {
  CreateStudyDiaryCategoryInput,
  CreateStudyDiaryNoteInput,
  CreateStudyDiarySectionInput,
  UpdateStudyDiaryCategoryInput,
  UpdateStudyDiaryInput,
  UpdateStudyDiaryNoteInput,
  UpdateStudyDiarySectionInput,
} from './dto/study-diary.schema';

@Injectable()
export class StudyDiaryService {
  constructor(private readonly db: DatabaseService) {}

  listWorkspaces(userId: string) {
    this.getOrCreateMyDiary(userId);
    const user = this.getUser(userId);

    return this.db.db
      .select()
      .from(studyDiariesTable)
      .where(eq(studyDiariesTable.userId, userId))
      .orderBy(desc(studyDiariesTable.updatedAt))
      .all()
      .map((diary) => ({ ...diary, ownerName: user.name }));
  }

  createWorkspace(userId: string, input: UpdateStudyDiaryInput) {
    const user = this.getUser(userId);
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.db
      .insert(studyDiariesTable)
      .values({
        id,
        userId,
        title: input.title ?? `${user.name}의 스터디 다이어리`,
        description: input.description ?? null,
        visibility: input.visibility ?? 'private',
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.getWorkspace(userId, id);
  }

  getWorkspace(userId: string, workspaceId: string) {
    const diary = this.assertWorkspaceOwner(workspaceId, userId);
    const user = this.getUser(diary.userId);
    return { ...diary, ownerName: user.name };
  }

  updateWorkspace(
    userId: string,
    workspaceId: string,
    input: UpdateStudyDiaryInput,
  ) {
    this.assertWorkspaceOwner(workspaceId, userId);
    const now = new Date().toISOString();

    this.db.db
      .update(studyDiariesTable)
      .set({
        ...input,
        updatedAt: now,
      })
      .where(eq(studyDiariesTable.id, workspaceId))
      .run();

    return this.getWorkspace(userId, workspaceId);
  }

  getWorkspaceCategories(userId: string, workspaceId: string) {
    this.assertWorkspaceOwner(workspaceId, userId);

    return this.db.db
      .select()
      .from(challengeCategoriesTable)
      .where(eq(challengeCategoriesTable.diaryId, workspaceId))
      .orderBy(challengeCategoriesTable.orderIdx)
      .all();
  }

  createWorkspaceCategory(
    userId: string,
    workspaceId: string,
    input: CreateStudyDiaryCategoryInput,
  ) {
    this.assertWorkspaceOwner(workspaceId, userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    const orderIdx = this.getNextCategoryOrderIdx(workspaceId);

    this.db.db
      .insert(challengeCategoriesTable)
      .values({
        id,
        diaryId: workspaceId,
        ...input,
        orderIdx,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.assertCategoryInWorkspace(id, userId, workspaceId);
  }

  reorderWorkspaceCategories(
    userId: string,
    workspaceId: string,
    categoryIds: string[],
  ) {
    const categories = this.getWorkspaceCategories(userId, workspaceId);
    const ownedIds = new Set(categories.map((category) => category.id));

    if (categoryIds.some((id) => !ownedIds.has(id))) {
      throw new ForbiddenException('Not authorized');
    }

    const now = new Date().toISOString();
    for (let i = 0; i < categoryIds.length; i++) {
      this.db.db
        .update(challengeCategoriesTable)
        .set({ orderIdx: i, updatedAt: now })
        .where(eq(challengeCategoriesTable.id, categoryIds[i]))
        .run();
    }
  }

  getWorkspaceSectionsByCategory(
    userId: string,
    workspaceId: string,
    categoryId: string,
  ) {
    this.assertCategoryInWorkspace(categoryId, userId, workspaceId);

    return this.db.db
      .select()
      .from(challengeSectionsTable)
      .where(eq(challengeSectionsTable.categoryId, categoryId))
      .orderBy(challengeSectionsTable.orderIdx)
      .all();
  }

  getWorkspaceNotes(userId: string, workspaceId: string, sectionId: string) {
    this.assertSectionInWorkspace(sectionId, userId, workspaceId);

    return this.db.db
      .select()
      .from(challengeUserNotesTable)
      .where(
        and(
          eq(challengeUserNotesTable.userId, userId),
          eq(challengeUserNotesTable.sectionId, sectionId),
        ),
      )
      .orderBy(
        desc(challengeUserNotesTable.pinned),
        desc(challengeUserNotesTable.updatedAt),
      )
      .all();
  }

  getMyDiary(userId: string) {
    const diary = this.getOrCreateMyDiary(userId);
    const user = this.getUser(userId);

    return {
      ...diary,
      ownerName: user.name,
    };
  }

  updateMyDiary(userId: string, input: UpdateStudyDiaryInput) {
    const diary = this.getOrCreateMyDiary(userId);
    const now = new Date().toISOString();

    this.db.db
      .update(studyDiariesTable)
      .set({
        ...input,
        updatedAt: now,
      })
      .where(eq(studyDiariesTable.id, diary.id))
      .run();

    return this.getMyDiary(userId);
  }

  getCategories(userId: string) {
    const diary = this.getOrCreateMyDiary(userId);

    return this.db.db
      .select()
      .from(challengeCategoriesTable)
      .where(eq(challengeCategoriesTable.diaryId, diary.id))
      .orderBy(challengeCategoriesTable.orderIdx)
      .all();
  }

  createCategory(userId: string, input: CreateStudyDiaryCategoryInput) {
    const diary = this.getOrCreateMyDiary(userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    const orderIdx = this.getNextCategoryOrderIdx(diary.id);

    this.db.db
      .insert(challengeCategoriesTable)
      .values({
        id,
        diaryId: diary.id,
        ...input,
        orderIdx,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.assertCategoryInMyDiary(id, userId);
  }

  updateCategory(
    userId: string,
    id: string,
    input: UpdateStudyDiaryCategoryInput,
  ) {
    this.assertCategoryInMyDiary(id, userId);

    this.db.db
      .update(challengeCategoriesTable)
      .set({
        ...input,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(challengeCategoriesTable.id, id))
      .run();

    return this.assertCategoryInMyDiary(id, userId);
  }

  deleteCategory(userId: string, id: string) {
    this.assertCategoryInMyDiary(id, userId);

    this.db.db
      .delete(challengeCategoriesTable)
      .where(eq(challengeCategoriesTable.id, id))
      .run();
  }

  reorderCategories(userId: string, categoryIds: string[]) {
    const categories = this.getCategories(userId);
    const ownedIds = new Set(categories.map((category) => category.id));

    if (categoryIds.some((id) => !ownedIds.has(id))) {
      throw new ForbiddenException('Not authorized');
    }

    const now = new Date().toISOString();
    for (let i = 0; i < categoryIds.length; i++) {
      this.db.db
        .update(challengeCategoriesTable)
        .set({ orderIdx: i, updatedAt: now })
        .where(eq(challengeCategoriesTable.id, categoryIds[i]))
        .run();
    }
  }

  getSectionsByCategory(userId: string, categoryId: string) {
    this.assertCategoryInMyDiary(categoryId, userId);

    return this.db.db
      .select()
      .from(challengeSectionsTable)
      .where(eq(challengeSectionsTable.categoryId, categoryId))
      .orderBy(challengeSectionsTable.orderIdx)
      .all();
  }

  createSection(userId: string, input: CreateStudyDiarySectionInput) {
    this.assertCategoryInMyDiary(input.categoryId, userId);

    const id = randomUUID();
    const now = new Date().toISOString();
    const orderIdx =
      input.orderIdx ?? this.getNextSectionOrderIdx(input.categoryId);

    this.db.db
      .insert(challengeSectionsTable)
      .values({
        id,
        categoryId: input.categoryId,
        title: input.title,
        summary: input.summary,
        orderIdx,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.assertSectionInMyDiary(id, userId);
  }

  updateSection(
    userId: string,
    id: string,
    input: UpdateStudyDiarySectionInput,
  ) {
    this.assertSectionInMyDiary(id, userId);

    this.db.db
      .update(challengeSectionsTable)
      .set({
        ...input,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(challengeSectionsTable.id, id))
      .run();

    return this.assertSectionInMyDiary(id, userId);
  }

  deleteSection(userId: string, id: string) {
    this.assertSectionInMyDiary(id, userId);

    this.db.db
      .delete(challengeSectionsTable)
      .where(eq(challengeSectionsTable.id, id))
      .run();
  }

  reorderSections(userId: string, categoryId: string, sectionIds: string[]) {
    this.assertCategoryInMyDiary(categoryId, userId);
    const sections = this.getSectionsByCategory(userId, categoryId);
    const ownedIds = new Set(sections.map((section) => section.id));

    if (sectionIds.some((id) => !ownedIds.has(id))) {
      throw new ForbiddenException('Not authorized');
    }

    const now = new Date().toISOString();
    for (let i = 0; i < sectionIds.length; i++) {
      this.db.db
        .update(challengeSectionsTable)
        .set({ orderIdx: i, updatedAt: now })
        .where(eq(challengeSectionsTable.id, sectionIds[i]))
        .run();
    }
  }

  getMyNotes(userId: string, sectionId: string) {
    this.assertSectionInMyDiary(sectionId, userId);

    return this.db.db
      .select()
      .from(challengeUserNotesTable)
      .where(
        and(
          eq(challengeUserNotesTable.userId, userId),
          eq(challengeUserNotesTable.sectionId, sectionId),
        ),
      )
      .orderBy(
        desc(challengeUserNotesTable.pinned),
        desc(challengeUserNotesTable.updatedAt),
      )
      .all();
  }

  createNote(userId: string, input: CreateStudyDiaryNoteInput) {
    this.assertNoteTargetInMyDiary(userId, input.sectionId, input.topicId);

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

    return this.getNoteById(id, userId);
  }

  updateNote(userId: string, id: string, input: UpdateStudyDiaryNoteInput) {
    const note = this.getNoteById(id, userId);
    if (!note) {
      throw new NotFoundException('Note not found');
    }

    this.assertNoteTargetInMyDiary(
      userId,
      input.sectionId ?? note.sectionId ?? undefined,
      input.topicId ?? note.topicId ?? undefined,
    );

    this.db.db
      .update(challengeUserNotesTable)
      .set({
        ...input,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(challengeUserNotesTable.id, id))
      .run();

    return this.getNoteById(id, userId);
  }

  deleteNote(userId: string, id: string) {
    const note = this.getNoteById(id, userId);
    if (!note) {
      throw new NotFoundException('Note not found');
    }

    this.db.db
      .delete(challengeUserNotesTable)
      .where(eq(challengeUserNotesTable.id, id))
      .run();
  }

  getPublicDiary(targetUserId: string) {
    const diary = this.getDiaryByUserId(targetUserId);
    if (diary.visibility === 'private') {
      throw new ForbiddenException('This diary is private');
    }
    const user = this.getUser(targetUserId);
    return { ...diary, ownerName: user.name };
  }

  getPublicWorkspace(workspaceId: string) {
    const diary = this.getDiaryById(workspaceId);
    if (diary.visibility === 'private') {
      throw new ForbiddenException('This diary is private');
    }
    const user = this.getUser(diary.userId);
    return { ...diary, ownerName: user.name };
  }

  getPublicWorkspaceCategories(workspaceId: string) {
    const diary = this.getDiaryById(workspaceId);
    if (diary.visibility === 'private') {
      throw new ForbiddenException('This diary is private');
    }
    return this.db.db
      .select()
      .from(challengeCategoriesTable)
      .where(eq(challengeCategoriesTable.diaryId, diary.id))
      .orderBy(challengeCategoriesTable.orderIdx)
      .all();
  }

  getPublicWorkspaceSections(workspaceId: string, categoryId: string) {
    const diary = this.getDiaryById(workspaceId);
    if (diary.visibility === 'private') {
      throw new ForbiddenException('This diary is private');
    }
    const category = this.db.db
      .select()
      .from(challengeCategoriesTable)
      .where(
        and(
          eq(challengeCategoriesTable.id, categoryId),
          eq(challengeCategoriesTable.diaryId, diary.id),
        ),
      )
      .get();
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return this.db.db
      .select()
      .from(challengeSectionsTable)
      .where(eq(challengeSectionsTable.categoryId, categoryId))
      .orderBy(challengeSectionsTable.orderIdx)
      .all();
  }

  getPublicWorkspaceNotes(workspaceId: string, sectionId: string) {
    const diary = this.getDiaryById(workspaceId);
    if (diary.visibility === 'private') {
      throw new ForbiddenException('This diary is private');
    }
    this.assertSectionInDiary(sectionId, diary.id);
    return this.db.db
      .select()
      .from(challengeUserNotesTable)
      .where(
        and(
          eq(challengeUserNotesTable.userId, diary.userId),
          eq(challengeUserNotesTable.sectionId, sectionId),
        ),
      )
      .orderBy(
        desc(challengeUserNotesTable.pinned),
        desc(challengeUserNotesTable.updatedAt),
      )
      .all();
  }

  getPublicCategories(targetUserId: string) {
    const diary = this.getDiaryByUserId(targetUserId);
    if (diary.visibility === 'private') {
      throw new ForbiddenException('This diary is private');
    }
    return this.db.db
      .select()
      .from(challengeCategoriesTable)
      .where(eq(challengeCategoriesTable.diaryId, diary.id))
      .orderBy(challengeCategoriesTable.orderIdx)
      .all();
  }

  getPublicSections(targetUserId: string, categoryId: string) {
    const diary = this.getDiaryByUserId(targetUserId);
    if (diary.visibility === 'private') {
      throw new ForbiddenException('This diary is private');
    }
    const category = this.db.db
      .select()
      .from(challengeCategoriesTable)
      .where(
        and(
          eq(challengeCategoriesTable.id, categoryId),
          eq(challengeCategoriesTable.diaryId, diary.id),
        ),
      )
      .get();
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return this.db.db
      .select()
      .from(challengeSectionsTable)
      .where(eq(challengeSectionsTable.categoryId, categoryId))
      .orderBy(challengeSectionsTable.orderIdx)
      .all();
  }

  getPublicNotes(targetUserId: string, sectionId: string) {
    const diary = this.getDiaryByUserId(targetUserId);
    if (diary.visibility === 'private') {
      throw new ForbiddenException('This diary is private');
    }
    return this.db.db
      .select()
      .from(challengeUserNotesTable)
      .where(
        and(
          eq(challengeUserNotesTable.userId, targetUserId),
          eq(challengeUserNotesTable.sectionId, sectionId),
        ),
      )
      .orderBy(
        desc(challengeUserNotesTable.pinned),
        desc(challengeUserNotesTable.updatedAt),
      )
      .all();
  }

  private getDiaryByUserId(userId: string): StudyDiaryRow {
    const diary = this.db.db
      .select()
      .from(studyDiariesTable)
      .where(eq(studyDiariesTable.userId, userId))
      .get();
    if (!diary) {
      throw new NotFoundException('Study diary not found');
    }
    return diary;
  }

  private getDiaryById(id: string): StudyDiaryRow {
    const diary = this.db.db
      .select()
      .from(studyDiariesTable)
      .where(eq(studyDiariesTable.id, id))
      .get();
    if (!diary) {
      throw new NotFoundException('Study diary not found');
    }
    return diary;
  }

  private assertWorkspaceOwner(
    workspaceId: string,
    userId: string,
  ): StudyDiaryRow {
    const diary = this.db.db
      .select()
      .from(studyDiariesTable)
      .where(
        and(
          eq(studyDiariesTable.id, workspaceId),
          eq(studyDiariesTable.userId, userId),
        ),
      )
      .get();

    if (!diary) {
      throw new ForbiddenException('Not authorized');
    }

    return diary;
  }

  private getOrCreateMyDiary(userId: string): StudyDiaryRow {
    const existing = this.db.db
      .select()
      .from(studyDiariesTable)
      .where(eq(studyDiariesTable.userId, userId))
      .get();

    if (existing) {
      return existing;
    }

    const user = this.getUser(userId);
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.db
      .insert(studyDiariesTable)
      .values({
        id,
        userId,
        title: `${user.name}의 스터디 다이어리`,
        description: null,
        visibility: 'private',
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const diary = this.db.db
      .select()
      .from(studyDiariesTable)
      .where(eq(studyDiariesTable.id, id))
      .get();

    if (!diary) {
      throw new BadRequestException('Failed to create study diary');
    }

    return diary;
  }

  private getUser(userId: string) {
    const user = this.db.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .get();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private assertCategoryInMyDiary(
    categoryId: string,
    userId: string,
  ): ChallengeCategoryRow {
    const row = this.db.db
      .select({ category: challengeCategoriesTable })
      .from(challengeCategoriesTable)
      .innerJoin(
        studyDiariesTable,
        eq(challengeCategoriesTable.diaryId, studyDiariesTable.id),
      )
      .where(
        and(
          eq(challengeCategoriesTable.id, categoryId),
          eq(studyDiariesTable.userId, userId),
        ),
      )
      .get();

    if (!row) {
      throw new ForbiddenException('Not authorized');
    }

    return row.category;
  }

  private assertCategoryInWorkspace(
    categoryId: string,
    userId: string,
    workspaceId: string,
  ): ChallengeCategoryRow {
    this.assertWorkspaceOwner(workspaceId, userId);

    const category = this.db.db
      .select()
      .from(challengeCategoriesTable)
      .where(
        and(
          eq(challengeCategoriesTable.id, categoryId),
          eq(challengeCategoriesTable.diaryId, workspaceId),
        ),
      )
      .get();

    if (!category) {
      throw new ForbiddenException('Not authorized');
    }

    return category;
  }

  private assertSectionInMyDiary(
    sectionId: string,
    userId: string,
  ): ChallengeSectionRow {
    const row = this.db.db
      .select({ section: challengeSectionsTable })
      .from(challengeSectionsTable)
      .innerJoin(
        challengeCategoriesTable,
        eq(challengeSectionsTable.categoryId, challengeCategoriesTable.id),
      )
      .innerJoin(
        studyDiariesTable,
        eq(challengeCategoriesTable.diaryId, studyDiariesTable.id),
      )
      .where(
        and(
          eq(challengeSectionsTable.id, sectionId),
          eq(studyDiariesTable.userId, userId),
        ),
      )
      .get();

    if (!row) {
      throw new ForbiddenException('Not authorized');
    }

    return row.section;
  }

  private assertSectionInWorkspace(
    sectionId: string,
    userId: string,
    workspaceId: string,
  ): ChallengeSectionRow {
    this.assertWorkspaceOwner(workspaceId, userId);
    const row = this.db.db
      .select({ section: challengeSectionsTable })
      .from(challengeSectionsTable)
      .innerJoin(
        challengeCategoriesTable,
        eq(challengeSectionsTable.categoryId, challengeCategoriesTable.id),
      )
      .where(
        and(
          eq(challengeSectionsTable.id, sectionId),
          eq(challengeCategoriesTable.diaryId, workspaceId),
        ),
      )
      .get();

    if (!row) {
      throw new ForbiddenException('Not authorized');
    }

    return row.section;
  }

  private assertSectionInDiary(
    sectionId: string,
    diaryId: string,
  ): ChallengeSectionRow {
    const row = this.db.db
      .select({ section: challengeSectionsTable })
      .from(challengeSectionsTable)
      .innerJoin(
        challengeCategoriesTable,
        eq(challengeSectionsTable.categoryId, challengeCategoriesTable.id),
      )
      .where(
        and(
          eq(challengeSectionsTable.id, sectionId),
          eq(challengeCategoriesTable.diaryId, diaryId),
        ),
      )
      .get();

    if (!row) {
      throw new NotFoundException('Section not found');
    }

    return row.section;
  }

  private assertTopicInMyDiary(
    topicId: string,
    userId: string,
  ): ChallengeTopicRow {
    const row = this.db.db
      .select({ topic: challengeTopicsTable })
      .from(challengeTopicsTable)
      .innerJoin(
        challengeSectionsTable,
        eq(challengeTopicsTable.sectionId, challengeSectionsTable.id),
      )
      .innerJoin(
        challengeCategoriesTable,
        eq(challengeSectionsTable.categoryId, challengeCategoriesTable.id),
      )
      .innerJoin(
        studyDiariesTable,
        eq(challengeCategoriesTable.diaryId, studyDiariesTable.id),
      )
      .where(
        and(
          eq(challengeTopicsTable.id, topicId),
          eq(studyDiariesTable.userId, userId),
        ),
      )
      .get();

    if (!row) {
      throw new ForbiddenException('Not authorized');
    }

    return row.topic;
  }

  private assertNoteTargetInMyDiary(
    userId: string,
    sectionId?: string,
    topicId?: string,
  ) {
    if (sectionId) {
      this.assertSectionInMyDiary(sectionId, userId);
    }

    if (topicId) {
      this.assertTopicInMyDiary(topicId, userId);
    }

    if (!sectionId && !topicId) {
      throw new BadRequestException('sectionId or topicId must be provided');
    }
  }

  private getNoteById(id: string, userId: string) {
    return this.db.db
      .select()
      .from(challengeUserNotesTable)
      .where(
        and(
          eq(challengeUserNotesTable.id, id),
          eq(challengeUserNotesTable.userId, userId),
        ),
      )
      .get();
  }

  private getNextCategoryOrderIdx(diaryId: string) {
    const result = this.db.db
      .select({
        maxOrderIdx: sql<number>`COALESCE(MAX(${challengeCategoriesTable.orderIdx}), -1)`,
      })
      .from(challengeCategoriesTable)
      .where(eq(challengeCategoriesTable.diaryId, diaryId))
      .get();

    return (result?.maxOrderIdx ?? -1) + 1;
  }

  private getNextSectionOrderIdx(categoryId: string) {
    const result = this.db.db
      .select({
        maxOrderIdx: sql<number>`COALESCE(MAX(${challengeSectionsTable.orderIdx}), -1)`,
      })
      .from(challengeSectionsTable)
      .where(eq(challengeSectionsTable.categoryId, categoryId))
      .get();

    return (result?.maxOrderIdx ?? -1) + 1;
  }
}
