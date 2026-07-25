import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  teamDocNodesTable,
  usersTable,
  type TeamDocNodeInsert,
  type TeamDocNodeRow,
  type UserRow,
} from '../database/schema';
import {
  createTeamDocDocumentSchema,
  createTeamDocFileSchema,
  createTeamDocFolderSchema,
  reorderTeamDocNodesSchema,
  updateTeamDocNodeSchema,
} from './team-docs.schemas';

export type TeamDocUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

@Injectable()
export class TeamDocsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  // 트리: 전체 노드를 본문 없이 평탄하게 반환(클라이언트가 parentId로 트리 구성)
  getTree() {
    const usersById = this.getUsersById();
    return this.db
      .select()
      .from(teamDocNodesTable)
      .orderBy(
        asc(teamDocNodesTable.orderIdx),
        asc(teamDocNodesTable.createdAt),
      )
      .all()
      .map((node) => this.toSummaryDto(node, usersById));
  }

  // 단일 노드 상세(DOC 본문 포함)
  getNode(id: string) {
    return this.toDto(this.ensureNode(id), this.getUsersById());
  }

  createFolder(user: TeamDocUser, payload: unknown) {
    const input = createTeamDocFolderSchema.parse(payload);
    this.assertParent(input.parentId);
    return this.insertNode(user, {
      type: 'FOLDER',
      title: input.title,
      parentId: input.parentId,
    });
  }

  createDocument(user: TeamDocUser, payload: unknown) {
    const input = createTeamDocDocumentSchema.parse(payload);
    this.assertParent(input.parentId);
    return this.insertNode(user, {
      type: 'DOC',
      title: input.title,
      parentId: input.parentId,
      content: input.content,
    });
  }

  createFile(user: TeamDocUser, payload: unknown) {
    const input = createTeamDocFileSchema.parse(payload);
    this.assertParent(input.parentId);
    return this.insertNode(user, {
      type: 'FILE',
      title: input.fileName,
      parentId: input.parentId,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      contentType: input.contentType,
      fileSize: input.fileSize,
    });
  }

  updateNode(user: TeamDocUser, id: string, payload: unknown) {
    const node = this.ensureNode(id);
    const input = updateTeamDocNodeSchema.parse(payload);

    const patch: Partial<TeamDocNodeInsert> = {
      updatedBy: user.id,
      updatedAt: new Date().toISOString(),
    };

    if (input.title !== undefined) patch.title = input.title;
    if (input.content !== undefined) {
      if (node.type !== 'DOC') {
        throw new BadRequestException('문서만 본문을 수정할 수 있습니다.');
      }
      patch.content = input.content;
    }
    if (input.parentId !== undefined) {
      this.assertParent(input.parentId);
      this.assertNoCycle(id, input.parentId);
      patch.parentId = input.parentId;
      patch.orderIdx = this.nextOrderIdx(input.parentId);
    }

    this.db
      .update(teamDocNodesTable)
      .set(patch)
      .where(eq(teamDocNodesTable.id, id))
      .run();

    return this.toDto(this.ensureNode(id), this.getUsersById());
  }

  reorder(payload: unknown) {
    const input = reorderTeamDocNodesSchema.parse(payload);
    const now = new Date().toISOString();
    for (const item of input.items) {
      this.db
        .update(teamDocNodesTable)
        .set({
          orderIdx: item.orderIdx,
          parentId: input.parentId,
          updatedAt: now,
        })
        .where(eq(teamDocNodesTable.id, item.id))
        .run();
    }
    return { success: true };
  }

  deleteNode(id: string) {
    this.ensureNode(id);
    // 폴더는 FK ON DELETE CASCADE 로 하위 노드까지 함께 삭제됨
    this.db.delete(teamDocNodesTable).where(eq(teamDocNodesTable.id, id)).run();
    return { success: true };
  }

  // ── 내부 헬퍼 ────────────────────────────────────────────────────────────

  private insertNode(
    user: TeamDocUser,
    fields: Pick<TeamDocNodeInsert, 'type' | 'title' | 'parentId'> &
      Partial<TeamDocNodeInsert>,
  ) {
    const now = new Date().toISOString();
    const row: TeamDocNodeInsert = {
      id: `team-doc-${randomUUID().slice(0, 12)}`,
      parentId: fields.parentId ?? null,
      type: fields.type,
      title: fields.title,
      orderIdx: this.nextOrderIdx(fields.parentId ?? null),
      content: fields.content ?? null,
      fileUrl: fields.fileUrl ?? null,
      fileName: fields.fileName ?? null,
      contentType: fields.contentType ?? null,
      fileSize: fields.fileSize ?? null,
      createdBy: user.id,
      updatedBy: user.id,
      createdAt: now,
      updatedAt: now,
    };
    this.db.insert(teamDocNodesTable).values(row).run();
    return this.toDto(this.ensureNode(row.id), this.getUsersById());
  }

  private ensureNode(id: string): TeamDocNodeRow {
    const node = this.db
      .select()
      .from(teamDocNodesTable)
      .where(eq(teamDocNodesTable.id, id))
      .get();
    if (!node) throw new NotFoundException('문서를 찾을 수 없습니다.');
    return node;
  }

  private assertParent(parentId: string | null | undefined) {
    if (!parentId) return;
    const parent = this.db
      .select({ type: teamDocNodesTable.type })
      .from(teamDocNodesTable)
      .where(eq(teamDocNodesTable.id, parentId))
      .get();
    if (!parent) throw new NotFoundException('상위 폴더를 찾을 수 없습니다.');
    if (parent.type !== 'FOLDER') {
      throw new BadRequestException('폴더 안에만 넣을 수 있습니다.');
    }
  }

  // 자기 자신/후손 폴더로 이동하는 순환 방지
  private assertNoCycle(nodeId: string, newParentId: string | null) {
    let cursor: string | null = newParentId;
    while (cursor) {
      if (cursor === nodeId) {
        throw new BadRequestException('하위 폴더로는 이동할 수 없습니다.');
      }
      const parent: { parentId: string | null } | undefined = this.db
        .select({ parentId: teamDocNodesTable.parentId })
        .from(teamDocNodesTable)
        .where(eq(teamDocNodesTable.id, cursor))
        .get();
      cursor = parent?.parentId ?? null;
    }
  }

  private nextOrderIdx(parentId: string | null) {
    const siblings = this.db
      .select({ orderIdx: teamDocNodesTable.orderIdx })
      .from(teamDocNodesTable)
      .where(
        parentId
          ? eq(teamDocNodesTable.parentId, parentId)
          : isNull(teamDocNodesTable.parentId),
      )
      .all();
    return siblings.reduce((max, s) => Math.max(max, s.orderIdx), -1) + 1;
  }

  private getUsersById() {
    const rows = this.db.select().from(usersTable).all();
    return new Map(rows.map((user) => [user.id, user]));
  }

  private toDto(node: TeamDocNodeRow, usersById: Map<string, UserRow>) {
    const creator = node.createdBy ? usersById.get(node.createdBy) : null;
    const updater = node.updatedBy ? usersById.get(node.updatedBy) : null;
    return {
      ...node,
      createdByName: creator?.name ?? null,
      updatedByName: updater?.name ?? null,
    };
  }

  // 트리용: 본문(content)은 제외해 페이로드를 가볍게
  private toSummaryDto(node: TeamDocNodeRow, usersById: Map<string, UserRow>) {
    const { content: _content, ...rest } = node;
    void _content;
    const creator = node.createdBy ? usersById.get(node.createdBy) : null;
    const updater = node.updatedBy ? usersById.get(node.updatedBy) : null;
    return {
      ...rest,
      createdByName: creator?.name ?? null,
      updatedByName: updater?.name ?? null,
    };
  }
}
