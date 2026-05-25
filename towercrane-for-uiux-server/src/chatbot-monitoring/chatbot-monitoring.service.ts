import { Injectable } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  chatMessagesTable,
  chatSessionsTable,
  usersTable,
} from '../database/schema';

@Injectable()
export class ChatbotMonitoringService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  getSummary() {
    const totalQuestions =
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(chatMessagesTable)
        .where(eq(chatMessagesTable.role, 'user'))
        .get()?.count ?? 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayQuestions =
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(chatMessagesTable)
        .where(
          sql`${chatMessagesTable.role} = 'user'
            AND ${chatMessagesTable.createdAt} >= ${today.toISOString()}
            AND ${chatMessagesTable.createdAt} < ${tomorrow.toISOString()}`,
        )
        .get()?.count ?? 0;

    const totalSessions =
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(chatSessionsTable)
        .get()?.count ?? 0;

    const activeUsers =
      this.db
        .select({
          count: sql<number>`count(distinct ${chatSessionsTable.userId})`,
        })
        .from(chatMessagesTable)
        .innerJoin(
          chatSessionsTable,
          eq(chatSessionsTable.id, chatMessagesTable.sessionId),
        )
        .where(eq(chatMessagesTable.role, 'user'))
        .get()?.count ?? 0;

    return {
      totalQuestions,
      todayQuestions,
      totalSessions,
      activeUsers,
    };
  }

  getUsers() {
    return this.db
      .select({
        userId: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        questionCount: sql<number>`count(${chatMessagesTable.id})`,
        sessionCount: sql<number>`count(distinct ${chatSessionsTable.id})`,
        lastQuestionAt: sql<string | null>`max(${chatMessagesTable.createdAt})`,
      })
      .from(usersTable)
      .innerJoin(chatSessionsTable, eq(chatSessionsTable.userId, usersTable.id))
      .leftJoin(
        chatMessagesTable,
        sql`${chatMessagesTable.sessionId} = ${chatSessionsTable.id}
          AND ${chatMessagesTable.role} = 'user'`,
      )
      .groupBy(usersTable.id)
      .orderBy(desc(sql<number>`count(${chatMessagesTable.id})`))
      .all();
  }
}
