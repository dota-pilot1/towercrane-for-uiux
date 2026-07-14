import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { asc, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  aiStudyNoteItemNotesTable,
  aiStudyNoteItemsTable,
  aiStudyNotesTable,
  usersTable,
  type AiStudyNoteItemNoteRow,
  type AiStudyNoteItemRow,
  type AiStudyNoteRow,
} from '../database/schema';
import type {
  CreateAiStudyNoteInput,
  CreateAiStudyNoteItemInput,
  CreateAiStudyNoteNoteInput,
  UpdateAiStudyNoteInput,
  UpdateAiStudyNoteItemInput,
  UpdateAiStudyNoteNoteInput,
} from './dto/ai-study-note.schema';

@Injectable()
export class AiStudyNoteService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  private now() {
    return new Date().toISOString();
  }

  // 내 계획 + 공유/공개 계획 (작성자 이름 + 항목 수/완료 수 집계 → 진행률)
  listPlans(userId: string) {
    const rows = this.db
      .select({
        id: aiStudyNotesTable.id,
        userId: aiStudyNotesTable.userId,
        title: aiStudyNotesTable.title,
        description: aiStudyNotesTable.description,
        visibility: aiStudyNotesTable.visibility,
        createdAt: aiStudyNotesTable.createdAt,
        updatedAt: aiStudyNotesTable.updatedAt,
        ownerName: usersTable.name,
      })
      .from(aiStudyNotesTable)
      .innerJoin(usersTable, eq(aiStudyNotesTable.userId, usersTable.id))
      .where(
        or(
          eq(aiStudyNotesTable.userId, userId),
          eq(aiStudyNotesTable.visibility, 'public'),
        ),
      )
      .orderBy(desc(aiStudyNotesTable.createdAt))
      .all();

    const counts = this.db
      .select({
        planId: aiStudyNoteItemsTable.planId,
        total: sql<number>`count(*)`,
        done: sql<number>`sum(case when ${aiStudyNoteItemsTable.status} = 'done' then 1 else 0 end)`,
      })
      .from(aiStudyNoteItemsTable)
      .groupBy(aiStudyNoteItemsTable.planId)
      .all();
    const countMap = new Map(
      counts.map((c) => [
        c.planId,
        { total: Number(c.total), done: Number(c.done) },
      ]),
    );

    return rows.map((p) => {
      const c = countMap.get(p.id) ?? { total: 0, done: 0 };
      return {
        ...p,
        isMine: p.userId === userId,
        itemCount: c.total,
        doneCount: c.done,
      };
    });
  }

  createPlan(userId: string, input: CreateAiStudyNoteInput) {
    const now = this.now();
    const id = `plan-${randomUUID().slice(0, 12)}`;
    this.db
      .insert(aiStudyNotesTable)
      .values({
        id,
        userId,
        title: input.title,
        description: input.description ?? null,
        visibility: input.visibility,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return this.getPlan(userId, id);
  }

  getPlan(userId: string, planId: string) {
    const plan = this.ensureReadable(userId, planId);
    // 헤더 "학습 노트 (소유자)" 표기용 — 상세도 목록처럼 작성자 이름을 실어준다
    const owner = this.db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, plan.userId))
      .get();
    const items = this.db
      .select()
      .from(aiStudyNoteItemsTable)
      .where(eq(aiStudyNoteItemsTable.planId, planId))
      .orderBy(
        asc(aiStudyNoteItemsTable.orderIdx),
        desc(aiStudyNoteItemsTable.createdAt),
      )
      .all();
    // 항목 카드 인디케이터용 단계 노트 개수 — 항목별로 묶어서 붙인다
    const itemIds = items.map((i) => i.id);
    const noteCounts = itemIds.length
      ? this.db
          .select({
            itemId: aiStudyNoteItemNotesTable.itemId,
            count: sql<number>`count(*)`,
          })
          .from(aiStudyNoteItemNotesTable)
          .where(inArray(aiStudyNoteItemNotesTable.itemId, itemIds))
          .groupBy(aiStudyNoteItemNotesTable.itemId)
          .all()
      : [];
    const noteCountMap = new Map(
      noteCounts.map((c) => [c.itemId, Number(c.count)]),
    );
    return {
      ...plan,
      isMine: plan.userId === userId,
      ownerName: owner?.name,
      items: items.map((i) => ({ ...i, noteCount: noteCountMap.get(i.id) ?? 0 })),
    };
  }

  updatePlan(userId: string, planId: string, input: UpdateAiStudyNoteInput) {
    this.ensureOwner(userId, planId);
    this.db
      .update(aiStudyNotesTable)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.visibility !== undefined
          ? { visibility: input.visibility }
          : {}),
        updatedAt: this.now(),
      })
      .where(eq(aiStudyNotesTable.id, planId))
      .run();
    return this.getPlan(userId, planId);
  }

  deletePlan(userId: string, planId: string) {
    this.ensureOwner(userId, planId);
    this.db.delete(aiStudyNotesTable).where(eq(aiStudyNotesTable.id, planId)).run();
    return { success: true };
  }

  createItem(userId: string, planId: string, input: CreateAiStudyNoteItemInput) {
    this.ensureOwner(userId, planId);
    const now = this.now();
    const id = `item-${randomUUID().slice(0, 12)}`;
    const maxOrder = this.db
      .select({
        max: sql<number>`coalesce(max(${aiStudyNoteItemsTable.orderIdx}), -1)`,
      })
      .from(aiStudyNoteItemsTable)
      .where(eq(aiStudyNoteItemsTable.planId, planId))
      .get();
    this.db
      .insert(aiStudyNoteItemsTable)
      .values({
        id,
        planId,
        userId,
        title: input.title,
        content: input.content,
        resourceUrl: input.resourceUrl ?? null,
        status: input.status,
        orderIdx: Number(maxOrder?.max ?? -1) + 1,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return this.db
      .select()
      .from(aiStudyNoteItemsTable)
      .where(eq(aiStudyNoteItemsTable.id, id))
      .get();
  }

  updateItem(userId: string, itemId: string, input: UpdateAiStudyNoteItemInput) {
    const item = this.ensureItemOwner(userId, itemId);
    this.db
      .update(aiStudyNoteItemsTable)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.resourceUrl !== undefined
          ? { resourceUrl: input.resourceUrl }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: this.now(),
      })
      .where(eq(aiStudyNoteItemsTable.id, item.id))
      .run();
    return this.db
      .select()
      .from(aiStudyNoteItemsTable)
      .where(eq(aiStudyNoteItemsTable.id, item.id))
      .get();
  }

  deleteItem(userId: string, itemId: string) {
    const item = this.ensureItemOwner(userId, itemId);
    this.db
      .delete(aiStudyNoteItemsTable)
      .where(eq(aiStudyNoteItemsTable.id, item.id))
      .run();
    return { success: true };
  }

  // ── 항목별 단계 노트 (댓글식) ────────────────────────────────────
  // 노트 응답에 작성자 이름(ownerName)을 실어 "OO의 노트" 개인화에 사용
  private noteSelection() {
    return {
      id: aiStudyNoteItemNotesTable.id,
      itemId: aiStudyNoteItemNotesTable.itemId,
      userId: aiStudyNoteItemNotesTable.userId,
      title: aiStudyNoteItemNotesTable.title,
      content: aiStudyNoteItemNotesTable.content,
      orderIdx: aiStudyNoteItemNotesTable.orderIdx,
      createdAt: aiStudyNoteItemNotesTable.createdAt,
      updatedAt: aiStudyNoteItemNotesTable.updatedAt,
      ownerName: usersTable.name,
    };
  }

  private getNoteWithOwner(noteId: string) {
    return this.db
      .select(this.noteSelection())
      .from(aiStudyNoteItemNotesTable)
      .innerJoin(usersTable, eq(aiStudyNoteItemNotesTable.userId, usersTable.id))
      .where(eq(aiStudyNoteItemNotesTable.id, noteId))
      .get();
  }

  listItemNotes(userId: string, itemId: string) {
    const item = this.getItemRow(itemId);
    this.ensureReadable(userId, item.planId);
    return this.db
      .select(this.noteSelection())
      .from(aiStudyNoteItemNotesTable)
      .innerJoin(usersTable, eq(aiStudyNoteItemNotesTable.userId, usersTable.id))
      .where(eq(aiStudyNoteItemNotesTable.itemId, itemId))
      .orderBy(
        asc(aiStudyNoteItemNotesTable.orderIdx),
        asc(aiStudyNoteItemNotesTable.createdAt),
      )
      .all();
  }

  createItemNote(
    userId: string,
    itemId: string,
    input: CreateAiStudyNoteNoteInput,
  ) {
    this.ensureItemOwner(userId, itemId);
    const now = this.now();
    const id = `note-${randomUUID().slice(0, 12)}`;
    const maxOrder = this.db
      .select({
        max: sql<number>`coalesce(max(${aiStudyNoteItemNotesTable.orderIdx}), -1)`,
      })
      .from(aiStudyNoteItemNotesTable)
      .where(eq(aiStudyNoteItemNotesTable.itemId, itemId))
      .get();
    this.db
      .insert(aiStudyNoteItemNotesTable)
      .values({
        id,
        itemId,
        userId,
        title: input.title ?? '',
        content: input.content,
        orderIdx: Number(maxOrder?.max ?? -1) + 1,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return this.getNoteWithOwner(id);
  }

  updateItemNote(
    userId: string,
    noteId: string,
    input: UpdateAiStudyNoteNoteInput,
  ) {
    const note = this.ensureItemNoteOwner(userId, noteId);
    this.db
      .update(aiStudyNoteItemNotesTable)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
        updatedAt: this.now(),
      })
      .where(eq(aiStudyNoteItemNotesTable.id, note.id))
      .run();
    return this.getNoteWithOwner(note.id);
  }

  deleteItemNote(userId: string, noteId: string) {
    const note = this.ensureItemNoteOwner(userId, noteId);
    this.db
      .delete(aiStudyNoteItemNotesTable)
      .where(eq(aiStudyNoteItemNotesTable.id, note.id))
      .run();
    return { success: true };
  }

  // ── 접근 제어 헬퍼 ──────────────────────────────────────────────
  private getPlanRow(planId: string): AiStudyNoteRow {
    const row = this.db
      .select()
      .from(aiStudyNotesTable)
      .where(eq(aiStudyNotesTable.id, planId))
      .get();
    if (!row) throw new NotFoundException('학습 노트를 찾을 수 없습니다.');
    return row;
  }

  private ensureReadable(userId: string, planId: string) {
    const row = this.getPlanRow(planId);
    if (row.userId !== userId && row.visibility === 'private') {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }
    return row;
  }

  private ensureOwner(userId: string, planId: string) {
    const row = this.getPlanRow(planId);
    if (row.userId !== userId) {
      throw new ForbiddenException('작성자만 수정할 수 있습니다.');
    }
    return row;
  }

  private getItemRow(itemId: string): AiStudyNoteItemRow {
    const item = this.db
      .select()
      .from(aiStudyNoteItemsTable)
      .where(eq(aiStudyNoteItemsTable.id, itemId))
      .get();
    if (!item) throw new NotFoundException('학습 항목을 찾을 수 없습니다.');
    return item;
  }

  private ensureItemOwner(userId: string, itemId: string): AiStudyNoteItemRow {
    const item = this.getItemRow(itemId);
    if (item.userId !== userId) {
      throw new ForbiddenException('작성자만 수정할 수 있습니다.');
    }
    return item;
  }

  private ensureItemNoteOwner(
    userId: string,
    noteId: string,
  ): AiStudyNoteItemNoteRow {
    const note = this.db
      .select()
      .from(aiStudyNoteItemNotesTable)
      .where(eq(aiStudyNoteItemNotesTable.id, noteId))
      .get();
    if (!note) throw new NotFoundException('노트를 찾을 수 없습니다.');
    if (note.userId !== userId) {
      throw new ForbiddenException('작성자만 수정할 수 있습니다.');
    }
    return note;
  }
}
