import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { asc, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { departmentsTable, usersTable } from '../database/schema';

export type OrgMember = {
  id: string;
  name: string;
  email: string;
  position: string | null;
  role: 'admin' | 'user';
  profileImageUrl: string | null;
};

export type OrgNode = {
  id: string;
  name: string;
  members: OrgMember[];
  children: OrgNode[];
};

// 직급 정렬 우선순위 (낮을수록 위)
const POSITION_RANK: Record<string, number> = {
  대표이사: 0,
  본부장: 1,
  팀장: 2,
  시니어: 3,
  주니어: 4,
  사원: 5,
};

@Injectable()
export class OrgService {
  constructor(private readonly databaseService: DatabaseService) {}

  listDepartments() {
    return this.databaseService.db
      .select({
        id: departmentsTable.id,
        name: departmentsTable.name,
        parentId: departmentsTable.parentId,
        orderIdx: departmentsTable.orderIdx,
      })
      .from(departmentsTable)
      .orderBy(asc(departmentsTable.orderIdx))
      .all();
  }

  getTree(): OrgNode[] {
    const db = this.databaseService.db;

    const departments = db
      .select({
        id: departmentsTable.id,
        name: departmentsTable.name,
        parentId: departmentsTable.parentId,
        orderIdx: departmentsTable.orderIdx,
      })
      .from(departmentsTable)
      .orderBy(asc(departmentsTable.orderIdx))
      .all();

    const users = db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        position: usersTable.position,
        role: usersTable.role,
        profileImageUrl: usersTable.profileImageUrl,
        departmentId: usersTable.departmentId,
      })
      .from(usersTable)
      .where(eq(usersTable.isActive, true))
      .all();

    // 부서별 멤버 그룹핑 + 직급순 정렬
    const membersByDept = new Map<string, OrgMember[]>();
    for (const u of users) {
      if (!u.departmentId) continue;
      const member: OrgMember = {
        id: u.id,
        name: u.name,
        email: u.email,
        position: u.position,
        role: u.role,
        profileImageUrl: u.profileImageUrl,
      };
      const list = membersByDept.get(u.departmentId) ?? [];
      list.push(member);
      membersByDept.set(u.departmentId, list);
    }
    for (const list of membersByDept.values()) {
      list.sort((a, b) => {
        const ra = POSITION_RANK[a.position ?? ''] ?? 99;
        const rb = POSITION_RANK[b.position ?? ''] ?? 99;
        return ra - rb || a.name.localeCompare(b.name, 'ko');
      });
    }

    // 노드 생성 후 계층 조립
    const nodeById = new Map<string, OrgNode>();
    for (const d of departments) {
      nodeById.set(d.id, {
        id: d.id,
        name: d.name,
        members: membersByDept.get(d.id) ?? [],
        children: [],
      });
    }

    const roots: OrgNode[] = [];
    for (const d of departments) {
      const node = nodeById.get(d.id)!;
      const parent = d.parentId ? nodeById.get(d.parentId) : null;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }

    return roots;
  }

  createDepartment(name: string, parentId: string | null) {
    if (parentId) this.getDepartmentOrThrow(parentId);

    const maxOrder =
      this.databaseService.db
        .select({ value: departmentsTable.orderIdx })
        .from(departmentsTable)
        .orderBy(desc(departmentsTable.orderIdx))
        .limit(1)
        .get()?.value ?? -1;

    const now = new Date().toISOString();
    const row = {
      id: `dept-${randomUUID().slice(0, 12)}`,
      name,
      parentId,
      orderIdx: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };
    this.databaseService.db.insert(departmentsTable).values(row).run();
    return row;
  }

  updateDepartment(
    id: string,
    input: { name?: string; parentId?: string | null },
  ) {
    this.getDepartmentOrThrow(id);

    if (input.parentId) {
      if (input.parentId === id) {
        throw new BadRequestException(
          '자기 자신을 상위 부서로 지정할 수 없습니다.',
        );
      }
      this.assertNoCycle(id, input.parentId);
    }

    const now = new Date().toISOString();
    this.databaseService.db
      .update(departmentsTable)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
        updatedAt: now,
      })
      .where(eq(departmentsTable.id, id))
      .run();

    return this.databaseService.db
      .select()
      .from(departmentsTable)
      .where(eq(departmentsTable.id, id))
      .get();
  }

  deleteDepartment(id: string) {
    this.getDepartmentOrThrow(id);

    const hasChildren = this.databaseService.db
      .select({ id: departmentsTable.id })
      .from(departmentsTable)
      .where(eq(departmentsTable.parentId, id))
      .get();
    if (hasChildren) {
      throw new BadRequestException(
        '하위 부서가 있는 부서는 삭제할 수 없습니다. 하위 부서를 먼저 정리해 주세요.',
      );
    }

    const hasMembers = this.databaseService.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.departmentId, id))
      .get();
    if (hasMembers) {
      throw new BadRequestException(
        '소속된 구성원이 있는 부서는 삭제할 수 없습니다. 구성원을 먼저 다른 부서로 옮겨 주세요.',
      );
    }

    this.databaseService.db
      .delete(departmentsTable)
      .where(eq(departmentsTable.id, id))
      .run();
    return { success: true };
  }

  private getDepartmentOrThrow(id: string) {
    const dept = this.databaseService.db
      .select()
      .from(departmentsTable)
      .where(eq(departmentsTable.id, id))
      .get();
    if (!dept) throw new NotFoundException('존재하지 않는 부서입니다.');
    return dept;
  }

  // parentId를 target으로 바꿨을 때 조상 체인에 자기 자신(id)이 다시 나타나는지 검사
  private assertNoCycle(id: string, targetParentId: string) {
    const all = this.databaseService.db
      .select({
        id: departmentsTable.id,
        parentId: departmentsTable.parentId,
      })
      .from(departmentsTable)
      .all();
    const parentById = new Map(all.map((d) => [d.id, d.parentId]));

    let cursor: string | null = targetParentId;
    const seen = new Set<string>();
    while (cursor) {
      if (cursor === id) {
        throw new BadRequestException(
          '하위 부서를 상위 부서로 지정할 수 없습니다.',
        );
      }
      if (seen.has(cursor)) break;
      seen.add(cursor);
      cursor = parentById.get(cursor) ?? null;
    }
  }
}
