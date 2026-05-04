import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { usersTable } from '../database/schema';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  findAll() {
    return this.databaseService.db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        profileImageUrl: usersTable.profileImageUrl,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .all();
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
