import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  tutorialCategoriesTable,
  tutorialContentsTable,
  tutorialLessonsTable,
  tutorialSectionsTable,
} from '../database/schema';
import {
  createTutorialCategorySchema,
  createTutorialLessonSchema,
  createTutorialSectionSchema,
  updateTutorialCategorySchema,
  updateTutorialLessonSchema,
  updateTutorialSectionSchema,
  createTutorialContentSchema,
  updateTutorialContentSchema,
} from './tutorial.schemas';

@Injectable()
export class TutorialService {
  constructor(private readonly databaseService: DatabaseService) {}

  list(userId: string) {
    this.ensureDefaultTutorials(userId);
    const categories = this.databaseService.db
      .select()
      .from(tutorialCategoriesTable)
      .where(eq(tutorialCategoriesTable.userId, userId))
      .orderBy(asc(tutorialCategoriesTable.orderIdx), asc(tutorialCategoriesTable.createdAt))
      .all();
    const sections = this.databaseService.db
      .select()
      .from(tutorialSectionsTable)
      .orderBy(asc(tutorialSectionsTable.orderIdx), asc(tutorialSectionsTable.createdAt))
      .all();
    const lessons = this.databaseService.db
      .select()
      .from(tutorialLessonsTable)
      .orderBy(asc(tutorialLessonsTable.orderIdx), asc(tutorialLessonsTable.createdAt))
      .all();
    let contents = this.databaseService.db
      .select()
      .from(tutorialContentsTable)
      .orderBy(asc(tutorialContentsTable.orderIdx), asc(tutorialContentsTable.createdAt))
      .all();
    if (this.migrateLegacyContents(lessons, contents)) {
      contents = this.databaseService.db
        .select()
        .from(tutorialContentsTable)
        .orderBy(asc(tutorialContentsTable.orderIdx), asc(tutorialContentsTable.createdAt))
        .all();
    }

    return categories.map((category) => ({
      ...category,
      sections: sections
        .filter((section) => section.categoryId === category.id)
        .map((section) => ({
          ...section,
          lessons: lessons
            .filter((lesson) => lesson.sectionId === section.id)
            .map((lesson) => ({
              ...lesson,
              contents: contents.filter((content) => content.lessonId === lesson.id),
            })),
        })),
    }));
  }

  createCategory(userId: string, payload: unknown) {
    const input = createTutorialCategorySchema.parse(payload);
    const now = new Date().toISOString();
    const category = {
      id: `tutorial-category-${randomUUID().slice(0, 12)}`,
      userId,
      title: input.title,
      summary: input.summary,
      orderIdx: this.nextOrder(tutorialCategoriesTable, tutorialCategoriesTable.userId, userId),
      createdAt: now,
      updatedAt: now,
    };
    this.databaseService.db.insert(tutorialCategoriesTable).values(category).run();
    return this.list(userId).find((item) => item.id === category.id);
  }

  updateCategory(userId: string, categoryId: string, payload: unknown) {
    const category = this.ensureCategory(userId, categoryId);
    const input = updateTutorialCategorySchema.parse(payload);
    this.databaseService.db
      .update(tutorialCategoriesTable)
      .set({
        title: input.title,
        summary: input.summary,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tutorialCategoriesTable.id, category.id))
      .run();
    return this.list(userId).find((item) => item.id === category.id);
  }

  deleteCategory(userId: string, categoryId: string) {
    this.ensureCategory(userId, categoryId);
    this.databaseService.db
      .delete(tutorialCategoriesTable)
      .where(eq(tutorialCategoriesTable.id, categoryId))
      .run();
    return { success: true };
  }

  createSection(userId: string, categoryId: string, payload: unknown) {
    const category = this.ensureCategory(userId, categoryId);
    const input = createTutorialSectionSchema.parse(payload);
    const now = new Date().toISOString();
    const section = {
      id: `tutorial-section-${randomUUID().slice(0, 12)}`,
      categoryId: category.id,
      title: input.title,
      summary: input.summary,
      orderIdx: this.nextOrder(tutorialSectionsTable, tutorialSectionsTable.categoryId, category.id),
      createdAt: now,
      updatedAt: now,
    };
    this.databaseService.db.insert(tutorialSectionsTable).values(section).run();
    return this.list(userId).find((item) => item.id === category.id);
  }

  updateSection(userId: string, sectionId: string, payload: unknown) {
    const section = this.ensureSection(userId, sectionId);
    const input = updateTutorialSectionSchema.parse(payload);
    this.databaseService.db
      .update(tutorialSectionsTable)
      .set({
        title: input.title,
        summary: input.summary,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tutorialSectionsTable.id, section.id))
      .run();
    return this.list(userId).find((item) => item.id === section.categoryId);
  }

  deleteSection(userId: string, sectionId: string) {
    this.ensureSection(userId, sectionId);
    this.databaseService.db
      .delete(tutorialSectionsTable)
      .where(eq(tutorialSectionsTable.id, sectionId))
      .run();
    return { success: true };
  }

  createLesson(userId: string, sectionId: string, payload: unknown) {
    const section = this.ensureSection(userId, sectionId);
    const input = createTutorialLessonSchema.parse(payload);
    const now = new Date().toISOString();
    const lesson = {
      id: `tutorial-lesson-${randomUUID().slice(0, 12)}`,
      sectionId: section.id,
      title: input.title,
      summary: input.summary,
      content: input.content,
      videoUrl: input.videoUrl,
      videoTitle: input.videoTitle,
      documentUrl: input.documentUrl,
      documentTitle: input.documentTitle,
      orderIdx: this.nextOrder(tutorialLessonsTable, tutorialLessonsTable.sectionId, section.id),
      createdAt: now,
      updatedAt: now,
    };
    this.databaseService.db.insert(tutorialLessonsTable).values(lesson).run();
    return this.list(userId).find((item) => item.id === section.categoryId);
  }

  updateLesson(userId: string, lessonId: string, payload: unknown) {
    const lesson = this.ensureLesson(userId, lessonId);
    const input = updateTutorialLessonSchema.parse(payload);
    this.databaseService.db
      .update(tutorialLessonsTable)
      .set({
        title: input.title,
        summary: input.summary,
        content: input.content,
        videoUrl: input.videoUrl,
        videoTitle: input.videoTitle,
        documentUrl: input.documentUrl,
        documentTitle: input.documentTitle,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tutorialLessonsTable.id, lesson.id))
      .run();
    return this.list(userId).find((item) => item.id === lesson.categoryId);
  }

  deleteLesson(userId: string, lessonId: string) {
    this.ensureLesson(userId, lessonId);
    this.databaseService.db
      .delete(tutorialLessonsTable)
      .where(eq(tutorialLessonsTable.id, lessonId))
      .run();
    return { success: true };
  }

  createContent(userId: string, lessonId: string, payload: unknown) {
    const lesson = this.ensureLesson(userId, lessonId);
    const input = createTutorialContentSchema.parse(payload);
    const now = new Date().toISOString();
    const content = {
      id: `tutorial-content-${randomUUID().slice(0, 12)}`,
      lessonId: lesson.id,
      type: input.type,
      title: input.title,
      content: input.content,
      url: input.url,
      orderIdx: this.nextContentOrder(lesson.id),
      createdAt: now,
      updatedAt: now,
    };
    this.databaseService.db.insert(tutorialContentsTable).values(content).run();
    return this.list(userId).find((item) => item.id === lesson.categoryId);
  }

  updateContent(userId: string, contentId: string, payload: unknown) {
    const content = this.ensureContent(userId, contentId);
    const input = updateTutorialContentSchema.parse(payload);
    this.databaseService.db
      .update(tutorialContentsTable)
      .set({
        type: input.type,
        title: input.title,
        content: input.content,
        url: input.url,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tutorialContentsTable.id, content.id))
      .run();
    return this.list(userId).find((item) => item.id === content.categoryId);
  }

  deleteContent(userId: string, contentId: string) {
    this.ensureContent(userId, contentId);
    this.databaseService.db
      .delete(tutorialContentsTable)
      .where(eq(tutorialContentsTable.id, contentId))
      .run();
    return { success: true };
  }

  private ensureCategory(userId: string, categoryId: string) {
    const category = this.databaseService.db
      .select()
      .from(tutorialCategoriesTable)
      .where(and(eq(tutorialCategoriesTable.id, categoryId), eq(tutorialCategoriesTable.userId, userId)))
      .get();
    if (!category) throw new NotFoundException(`Tutorial category not found: ${categoryId}`);
    return category;
  }

  private ensureSection(userId: string, sectionId: string) {
    const section = this.databaseService.db
      .select()
      .from(tutorialSectionsTable)
      .where(eq(tutorialSectionsTable.id, sectionId))
      .get();
    if (!section) throw new NotFoundException(`Tutorial section not found: ${sectionId}`);
    const category = this.ensureCategory(userId, section.categoryId);
    return { ...section, categoryId: category.id };
  }

  private ensureLesson(userId: string, lessonId: string) {
    const lesson = this.databaseService.db
      .select()
      .from(tutorialLessonsTable)
      .where(eq(tutorialLessonsTable.id, lessonId))
      .get();
    if (!lesson) throw new NotFoundException(`Tutorial lesson not found: ${lessonId}`);
    const section = this.ensureSection(userId, lesson.sectionId);
    return { ...lesson, categoryId: section.categoryId };
  }

  private ensureContent(userId: string, contentId: string) {
    const content = this.databaseService.db
      .select()
      .from(tutorialContentsTable)
      .where(eq(tutorialContentsTable.id, contentId))
      .get();
    if (!content) throw new NotFoundException(`Tutorial content not found: ${contentId}`);
    const lesson = this.ensureLesson(userId, content.lessonId);
    return { ...content, categoryId: lesson.categoryId };
  }

  private nextContentOrder(lessonId: string) {
    const row = this.databaseService.db
      .select({ maxIdx: sql<number>`max(${tutorialContentsTable.orderIdx})` })
      .from(tutorialContentsTable)
      .where(eq(tutorialContentsTable.lessonId, lessonId))
      .get();
    return Number(row?.maxIdx ?? -1) + 1;
  }

  private migrateLegacyContents(
    lessons: Array<{
      id: string;
      content: string;
      videoUrl: string;
      videoTitle: string;
      documentUrl: string;
      documentTitle: string;
      createdAt: string;
      updatedAt: string;
    }>,
    contents: Array<{ lessonId: string }>,
  ) {
    const existingLessonIds = new Set(contents.map((content) => content.lessonId));
    let migrated = false;
    for (const lesson of lessons) {
      if (existingLessonIds.has(lesson.id)) continue;
      const legacy = [
        lesson.content
          ? { type: 'lexical' as const, title: '본문', content: lesson.content, url: '' }
          : null,
        lesson.videoUrl
          ? { type: 'youtube' as const, title: lesson.videoTitle || 'YouTube 영상', content: '', url: lesson.videoUrl }
          : null,
        lesson.documentUrl
          ? { type: 'document' as const, title: lesson.documentTitle || '참고 문서', content: '', url: lesson.documentUrl }
          : null,
      ].filter((item): item is NonNullable<typeof item> => item !== null);
      for (const [orderIdx, item] of legacy.entries()) {
        this.databaseService.db.insert(tutorialContentsTable).values({
          id: `tutorial-content-${randomUUID().slice(0, 12)}`,
          lessonId: lesson.id,
          type: item.type,
          title: item.title,
          content: item.content,
          url: item.url,
          orderIdx,
          createdAt: lesson.createdAt,
          updatedAt: lesson.updatedAt,
        }).run();
        migrated = true;
      }
    }
    return migrated;
  }

  private nextOrder<T extends typeof tutorialCategoriesTable | typeof tutorialSectionsTable | typeof tutorialLessonsTable>(
    table: T,
    column: T extends typeof tutorialCategoriesTable
      ? typeof tutorialCategoriesTable.userId
      : T extends typeof tutorialSectionsTable
        ? typeof tutorialSectionsTable.categoryId
        : typeof tutorialLessonsTable.sectionId,
    value: string,
  ) {
    const row = this.databaseService.db
      .select({ maxIdx: sql<number>`max(${table.orderIdx})` })
      .from(table)
      .where(eq(column as never, value))
      .get();
    return Number(row?.maxIdx ?? -1) + 1;
  }

  private ensureDefaultTutorials(userId: string) {
    const existing = this.databaseService.db
      .select({ id: tutorialCategoriesTable.id })
      .from(tutorialCategoriesTable)
      .where(eq(tutorialCategoriesTable.userId, userId))
      .get();
    if (existing) return;

    const now = new Date().toISOString();
    const defaults = [
      {
        title: 'Spring Boot 서버',
        summary: '서버를 만들고 주문 API를 연결합니다.',
        section: { title: '처음 시작하기', summary: '프로젝트를 만들고 첫 API를 실행합니다.' },
        lesson: { title: '첫 번째 API 만들기', summary: 'Spring Boot로 주문 조회 API를 만듭니다.' },
      },
      {
        title: 'React 화면',
        summary: '사용자가 주문하고 배송을 확인하는 화면을 만듭니다.',
        section: { title: '화면 만들기', summary: '목록, 상세, 주문 화면을 만듭니다.' },
        lesson: { title: '상품 목록 만들기', summary: '상품을 카드 목록으로 보여줍니다.' },
      },
      {
        title: '후원+구매 실습',
        summary: '물품 구매부터 배송 추적까지 직접 연결합니다.',
        section: { title: '주문 흐름', summary: '주문·후원·배송 상태를 이어 붙입니다.' },
        lesson: { title: '물건 주문하고 배송 보기', summary: '후원 물품을 주문하고 배송 번호를 확인합니다.' },
      },
    ];

    for (const [categoryIndex, item] of defaults.entries()) {
      const categoryId = `tutorial-category-${randomUUID().slice(0, 12)}`;
      const sectionId = `tutorial-section-${randomUUID().slice(0, 12)}`;
      this.databaseService.db.insert(tutorialCategoriesTable).values({
        id: categoryId,
        userId,
        title: item.title,
        summary: item.summary,
        orderIdx: categoryIndex,
        createdAt: now,
        updatedAt: now,
      }).run();
      this.databaseService.db.insert(tutorialSectionsTable).values({
        id: sectionId,
        categoryId,
        title: item.section.title,
        summary: item.section.summary,
        orderIdx: 0,
        createdAt: now,
        updatedAt: now,
      }).run();
      this.databaseService.db.insert(tutorialLessonsTable).values({
        id: `tutorial-lesson-${randomUUID().slice(0, 12)}`,
        sectionId,
        title: item.lesson.title,
        summary: item.lesson.summary,
        content: '',
        videoUrl: '',
        videoTitle: '',
        documentUrl: '',
        documentTitle: '',
        orderIdx: 0,
        createdAt: now,
        updatedAt: now,
      }).run();
    }
  }
}
