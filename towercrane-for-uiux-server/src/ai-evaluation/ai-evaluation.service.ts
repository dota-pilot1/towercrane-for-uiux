import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { asc, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  evalCategoriesTable,
  evalItemsTable,
  evalScoresTable,
  evaluateesTable,
} from '../database/schema';

@Injectable()
export class AiEvaluationService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  // ── 평가 대상자 ──────────────────────────────────────────────────────────────

  listEvaluatees() {
    return this.db
      .select()
      .from(evaluateesTable)
      .orderBy(asc(evaluateesTable.createdAt))
      .all();
  }

  createEvaluatee(body: { name: string; role?: string; description?: string }) {
    const now = new Date().toISOString();
    const record = {
      id: `eval-${randomUUID().slice(0, 12)}`,
      name: body.name,
      role: body.role ?? null,
      description: body.description ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.db.insert(evaluateesTable).values(record).run();
    return record;
  }

  deleteEvaluatee(id: string) {
    const existing = this.db
      .select()
      .from(evaluateesTable)
      .where(eq(evaluateesTable.id, id))
      .get();
    if (!existing) throw new NotFoundException('대상자를 찾을 수 없습니다.');
    this.db.delete(evaluateesTable).where(eq(evaluateesTable.id, id)).run();
    return { ok: true };
  }

  // ── 평가 항목 ────────────────────────────────────────────────────────────────

  getItemsByEvaluatee(evaluateeId: string) {
    const categories = this.db
      .select()
      .from(evalCategoriesTable)
      .orderBy(asc(evalCategoriesTable.displayOrder))
      .all();

    const items = this.db
      .select({
        id: evalItemsTable.id,
        categoryId: evalItemsTable.categoryId,
        title: evalItemsTable.title,
        description: evalItemsTable.description,
        displayOrder: evalItemsTable.displayOrder,
        createdAt: evalItemsTable.createdAt,
        score: evalScoresTable.score,
        note: evalScoresTable.note,
        scoreId: evalScoresTable.id,
      })
      .from(evalItemsTable)
      .leftJoin(evalScoresTable, eq(evalScoresTable.itemId, evalItemsTable.id))
      .where(eq(evalItemsTable.evaluateeId, evaluateeId))
      .orderBy(asc(evalItemsTable.displayOrder))
      .all();

    return categories.map((cat) => ({
      ...cat,
      items: items.filter((i) => i.categoryId === cat.id),
    }));
  }

  createItem(
    evaluateeId: string,
    body: { categoryId: string; title: string; description?: string },
  ) {
    const now = new Date().toISOString();
    const maxOrder = this.db
      .select({ v: sql<number>`COALESCE(MAX(display_order), -1)` })
      .from(evalItemsTable)
      .where(
        sql`evaluatee_id = ${evaluateeId} AND category_id = ${body.categoryId}`,
      )
      .get();

    const record = {
      id: `item-${randomUUID().slice(0, 12)}`,
      categoryId: body.categoryId,
      evaluateeId,
      title: body.title,
      description: body.description ?? null,
      displayOrder: (maxOrder?.v ?? -1) + 1,
      createdAt: now,
    };
    this.db.insert(evalItemsTable).values(record).run();
    return record;
  }

  deleteItem(itemId: string) {
    const existing = this.db
      .select()
      .from(evalItemsTable)
      .where(eq(evalItemsTable.id, itemId))
      .get();
    if (!existing) throw new NotFoundException('항목을 찾을 수 없습니다.');
    this.db.delete(evalItemsTable).where(eq(evalItemsTable.id, itemId)).run();
    return { ok: true };
  }

  // ── 점수 ─────────────────────────────────────────────────────────────────────

  upsertScore(itemId: string, body: { score: number; note?: string }) {
    const score = Math.min(10, Math.max(0, body.score));
    const now = new Date().toISOString();

    const existing = this.db
      .select()
      .from(evalScoresTable)
      .where(eq(evalScoresTable.itemId, itemId))
      .get();

    if (existing) {
      this.db
        .update(evalScoresTable)
        .set({ score, note: body.note ?? existing.note, updatedAt: now })
        .where(eq(evalScoresTable.itemId, itemId))
        .run();
      return { ...existing, score, note: body.note ?? existing.note, updatedAt: now };
    } else {
      const record = {
        id: `score-${randomUUID().slice(0, 12)}`,
        itemId,
        score,
        note: body.note ?? null,
        updatedAt: now,
      };
      this.db.insert(evalScoresTable).values(record).run();
      return record;
    }
  }

  // ── 집계 ─────────────────────────────────────────────────────────────────────

  getSummary(evaluateeId: string) {
    const categories = this.db
      .select()
      .from(evalCategoriesTable)
      .orderBy(asc(evalCategoriesTable.displayOrder))
      .all();

    const rows = this.db
      .select({
        categoryId: evalItemsTable.categoryId,
        score: evalScoresTable.score,
      })
      .from(evalItemsTable)
      .leftJoin(evalScoresTable, eq(evalScoresTable.itemId, evalItemsTable.id))
      .where(eq(evalItemsTable.evaluateeId, evaluateeId))
      .all();

    const catSummaries = categories.map((cat) => {
      const catRows = rows.filter((r) => r.categoryId === cat.id);
      const score = catRows.reduce((sum, r) => sum + (r.score ?? 0), 0);
      const maxScore = catRows.length * 10;
      return { id: cat.id, name: cat.name, score, maxScore };
    });

    return {
      totalScore: catSummaries.reduce((s, c) => s + c.score, 0),
      maxScore: catSummaries.reduce((s, c) => s + c.maxScore, 0),
      categories: catSummaries,
    };
  }
}
