import { Injectable } from '@nestjs/common';
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
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .all();
  }
}
