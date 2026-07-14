import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { sessionsTable, usersTable } from '../database/schema';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  findAssignable() {
    return this.databaseService.db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        profileImageUrl: usersTable.profileImageUrl,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(eq(usersTable.isActive, true))
      .orderBy(asc(usersTable.name))
      .all();
  }

  findAll() {
    return this.databaseService.db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        profileImageUrl: usersTable.profileImageUrl,
        role: usersTable.role,
        isActive: usersTable.isActive,
        deletedAt: usersTable.deletedAt,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .all();
  }

  deactivate(userId: string, actorId: string) {
    if (userId === actorId) {
      throw new ForbiddenException(
        '현재 로그인한 계정은 비활성화할 수 없습니다.',
      );
    }

    const target = this.databaseService.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .get();
    if (!target) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    if (!target.isActive) return { success: true };

    if (target.role === 'admin') {
      const activeAdminCount =
        this.databaseService.db
          .select({ count: sql<number>`count(*)` })
          .from(usersTable)
          .where(
            and(eq(usersTable.role, 'admin'), eq(usersTable.isActive, true)),
          )
          .get()?.count ?? 0;
      if (activeAdminCount <= 1) {
        throw new BadRequestException(
          '마지막 활성 관리자는 비활성화할 수 없습니다.',
        );
      }
    }

    const now = new Date().toISOString();
    this.databaseService.db.transaction((tx) => {
      tx.update(usersTable)
        .set({ isActive: false, deletedAt: now, updatedAt: now })
        .where(eq(usersTable.id, userId))
        .run();
      tx.delete(sessionsTable).where(eq(sessionsTable.userId, userId)).run();
    });

    return { success: true };
  }

  updateProfileImage(userId: string, profileImageUrl: string | null) {
    const now = new Date().toISOString();

    this.databaseService.db
      .update(usersTable)
      .set({
        profileImageUrl,
        updatedAt: now,
      })
      .where(eq(usersTable.id, userId))
      .run();

    return this.databaseService.db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        profileImageUrl: usersTable.profileImageUrl,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .get();
  }
}
