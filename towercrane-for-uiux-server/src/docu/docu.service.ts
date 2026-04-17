import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  categoriesTable,
  docSectionsTable,
  documentBlocksTable,
  documentsTable,
  prototypesTable,
} from '../database/schema';
import {
  createDocumentSchema,
  createSectionSchema,
  reorderSchema,
  replaceBlocksSchema,
  updateDocumentSchema,
  updateSectionSchema,
} from './docu.schemas';

@Injectable()
export class DocuService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  getTree(userId: string, userRole: string, prototypeId: string) {
    this.ensurePrototype(userId, userRole, prototypeId);

    const sections = this.db
      .select()
      .from(docSectionsTable)
      .where(eq(docSectionsTable.prototypeId, prototypeId))
      .orderBy(asc(docSectionsTable.orderIdx))
      .all();

    const sectionIds = sections.map((s) => s.id);

    const documents =
      sectionIds.length > 0
        ? this.db
            .select()
            .from(documentsTable)
            .orderBy(asc(documentsTable.orderIdx))
            .all()
            .filter((d) => sectionIds.includes(d.sectionId))
        : [];

    return sections.map((section) => ({
      id: section.id,
      prototypeId: section.prototypeId,
      title: section.title,
      orderIdx: section.orderIdx,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
      documents: documents
        .filter((doc) => doc.sectionId === section.id)
        .map((doc) => ({
          id: doc.id,
          sectionId: doc.sectionId,
          title: doc.title,
          orderIdx: doc.orderIdx,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        })),
    }));
  }

  createSection(
    userId: string,
    userRole: string,
    prototypeId: string,
    payload: unknown,
  ) {
    this.ensurePrototype(userId, userRole, prototypeId);
    const input = createSectionSchema.parse(payload);
    const now = new Date().toISOString();
    const id = `docsec-${randomUUID().slice(0, 8)}`;

    const maxOrder = this.db
      .select({ orderIdx: docSectionsTable.orderIdx })
      .from(docSectionsTable)
      .where(eq(docSectionsTable.prototypeId, prototypeId))
      .all()
      .reduce((max, row) => Math.max(max, row.orderIdx), -1);

    this.db
      .insert(docSectionsTable)
      .values({
        id,
        prototypeId,
        title: input.title,
        orderIdx: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.getTree(userId, userRole, prototypeId);
  }

  updateSection(
    userId: string,
    userRole: string,
    sectionId: string,
    payload: unknown,
  ) {
    const section = this.ensureSection(userId, userRole, sectionId);
    const input = updateSectionSchema.parse(payload);

    this.db
      .update(docSectionsTable)
      .set({ title: input.title, updatedAt: new Date().toISOString() })
      .where(eq(docSectionsTable.id, sectionId))
      .run();

    return this.getTree(userId, userRole, section.prototypeId);
  }

  deleteSection(userId: string, userRole: string, sectionId: string) {
    const section = this.ensureSection(userId, userRole, sectionId);

    this.db
      .delete(docSectionsTable)
      .where(eq(docSectionsTable.id, sectionId))
      .run();

    return this.getTree(userId, userRole, section.prototypeId);
  }

  reorderSections(
    userId: string,
    userRole: string,
    prototypeId: string,
    payload: unknown,
  ) {
    this.ensurePrototype(userId, userRole, prototypeId);
    const input = reorderSchema.parse(payload);
    const now = new Date().toISOString();

    for (const item of input.items) {
      this.db
        .update(docSectionsTable)
        .set({ orderIdx: item.orderIdx, updatedAt: now })
        .where(
          and(
            eq(docSectionsTable.id, item.id),
            eq(docSectionsTable.prototypeId, prototypeId),
          ),
        )
        .run();
    }

    return this.getTree(userId, userRole, prototypeId);
  }

  createDocument(
    userId: string,
    userRole: string,
    sectionId: string,
    payload: unknown,
  ) {
    const section = this.ensureSection(userId, userRole, sectionId);
    const input = createDocumentSchema.parse(payload);
    const now = new Date().toISOString();
    const id = `doc-${randomUUID().slice(0, 8)}`;

    const maxOrder = this.db
      .select({ orderIdx: documentsTable.orderIdx })
      .from(documentsTable)
      .where(eq(documentsTable.sectionId, sectionId))
      .all()
      .reduce((max, row) => Math.max(max, row.orderIdx), -1);

    this.db
      .insert(documentsTable)
      .values({
        id,
        sectionId,
        title: input.title,
        content: '',
        orderIdx: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.getTree(userId, userRole, section.prototypeId);
  }

  updateDocument(
    userId: string,
    userRole: string,
    documentId: string,
    payload: unknown,
  ) {
    const { section } = this.ensureDocument(userId, userRole, documentId);
    const input = updateDocumentSchema.parse(payload);

    this.db
      .update(documentsTable)
      .set({ title: input.title, updatedAt: new Date().toISOString() })
      .where(eq(documentsTable.id, documentId))
      .run();

    return this.getTree(userId, userRole, section.prototypeId);
  }

  deleteDocument(userId: string, userRole: string, documentId: string) {
    const { section } = this.ensureDocument(userId, userRole, documentId);

    this.db
      .delete(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .run();

    return this.getTree(userId, userRole, section.prototypeId);
  }

  reorderDocuments(
    userId: string,
    userRole: string,
    sectionId: string,
    payload: unknown,
  ) {
    const section = this.ensureSection(userId, userRole, sectionId);
    const input = reorderSchema.parse(payload);
    const now = new Date().toISOString();

    for (const item of input.items) {
      this.db
        .update(documentsTable)
        .set({ orderIdx: item.orderIdx, updatedAt: now })
        .where(
          and(
            eq(documentsTable.id, item.id),
            eq(documentsTable.sectionId, sectionId),
          ),
        )
        .run();
    }

    return this.getTree(userId, userRole, section.prototypeId);
  }

  getDocumentDetail(userId: string, userRole: string, documentId: string) {
    const { document, section } = this.ensureDocument(
      userId,
      userRole,
      documentId,
    );

    const blocks = this.db
      .select()
      .from(documentBlocksTable)
      .where(eq(documentBlocksTable.documentId, documentId))
      .orderBy(asc(documentBlocksTable.orderIdx))
      .all();

    return {
      id: document.id,
      sectionId: document.sectionId,
      prototypeId: section.prototypeId,
      title: document.title,
      orderIdx: document.orderIdx,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      blocks: blocks.map((block) => ({
        id: block.id,
        documentId: block.documentId,
        blockType: block.blockType,
        blockTitle: block.blockTitle,
        content: block.content,
        orderIdx: block.orderIdx,
      })),
    };
  }

  replaceBlocks(
    userId: string,
    userRole: string,
    documentId: string,
    payload: unknown,
  ) {
    this.ensureDocument(userId, userRole, documentId);
    const input = replaceBlocksSchema.parse(payload);
    const now = new Date().toISOString();

    this.db
      .delete(documentBlocksTable)
      .where(eq(documentBlocksTable.documentId, documentId))
      .run();

    if (input.blocks.length > 0) {
      const rows = input.blocks.map((block, index) => ({
        id: `blk-${randomUUID().slice(0, 8)}`,
        documentId,
        blockType: block.blockType,
        blockTitle: block.blockTitle ?? null,
        content: block.content,
        orderIdx: index,
        createdAt: now,
        updatedAt: now,
      }));

      this.db.insert(documentBlocksTable).values(rows).run();
    }

    this.db
      .update(documentsTable)
      .set({ updatedAt: now })
      .where(eq(documentsTable.id, documentId))
      .run();

    return this.getDocumentDetail(userId, userRole, documentId);
  }

  private ensurePrototype(userId: string, userRole: string, prototypeId: string) {
    const baseQuery = this.db
      .select({
        id: prototypesTable.id,
        categoryUserId: categoriesTable.userId,
      })
      .from(prototypesTable)
      .innerJoin(
        categoriesTable,
        eq(prototypesTable.categoryId, categoriesTable.id),
      )
      .where(eq(prototypesTable.id, prototypeId));

    const row = baseQuery.get();
    if (!row) {
      throw new NotFoundException(`Prototype not found: ${prototypeId}`);
    }

    if (userRole !== 'admin' && row.categoryUserId !== userId) {
      throw new NotFoundException(`Prototype not found: ${prototypeId}`);
    }

    return row;
  }

  private ensureSection(userId: string, userRole: string, sectionId: string) {
    const section = this.db
      .select()
      .from(docSectionsTable)
      .where(eq(docSectionsTable.id, sectionId))
      .get();

    if (!section) {
      throw new NotFoundException(`Doc section not found: ${sectionId}`);
    }

    this.ensurePrototype(userId, userRole, section.prototypeId);
    return section;
  }

  private ensureDocument(
    userId: string,
    userRole: string,
    documentId: string,
  ) {
    const document = this.db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .get();

    if (!document) {
      throw new NotFoundException(`Document not found: ${documentId}`);
    }

    const section = this.ensureSection(userId, userRole, document.sectionId);
    return { document, section };
  }
}
