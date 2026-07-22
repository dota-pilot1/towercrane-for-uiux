import { Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
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
}
