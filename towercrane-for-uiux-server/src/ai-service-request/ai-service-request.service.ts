import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { aiServiceRequestsTable, usersTable } from '../database/schema';

export type ServiceType = 'chatbot' | 'api' | 'account';
export type EstimatedUsage = 'low' | 'medium' | 'large';
export type SecurityLevel = 'internal' | 'confidential';
export type RequestStatus =
  | 'pending'
  | 'manager_approved'
  | 'admin_approved'
  | 'active'
  | 'rejected'
  | 'revision_requested';

@Injectable()
export class AiServiceRequestService {
  constructor(private readonly db: DatabaseService) {}

  async submit(userId: string, userName: string, body: {
    serviceType: ServiceType;
    purpose: string;
    estimatedUsage: EstimatedUsage;
    securityLevel: SecurityLevel;
  }) {
    const ACTIVE_STATUSES: RequestStatus[] = ['pending', 'manager_approved', 'admin_approved', 'active'];
    const existing = this.db.db
      .select()
      .from(aiServiceRequestsTable)
      .where(
        and(
          eq(aiServiceRequestsTable.userId, userId),
          eq(aiServiceRequestsTable.serviceType, body.serviceType),
          inArray(aiServiceRequestsTable.status, ACTIVE_STATUSES),
        ),
      )
      .get();
    if (existing) {
      throw new ConflictException(`이미 진행 중인 "${body.serviceType}" 서비스 신청이 있습니다.`);
    }

    const now = new Date().toISOString();
    const id = randomUUID();
    this.db.db.insert(aiServiceRequestsTable).values({
      id,
      userId,
      userName,
      serviceType: body.serviceType,
      purpose: body.purpose,
      estimatedUsage: body.estimatedUsage,
      securityLevel: body.securityLevel,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }).run();
    return this.db.db.select().from(aiServiceRequestsTable).where(eq(aiServiceRequestsTable.id, id)).get();
  }

  getMyRequests(userId: string) {
    return this.db.db
      .select()
      .from(aiServiceRequestsTable)
      .where(eq(aiServiceRequestsTable.userId, userId))
      .orderBy(desc(aiServiceRequestsTable.createdAt))
      .all();
  }

  getRequest(id: string, userId: string, role: string) {
    const req = this.db.db
      .select()
      .from(aiServiceRequestsTable)
      .where(eq(aiServiceRequestsTable.id, id))
      .get();
    if (!req) throw new NotFoundException();
    if (role !== 'admin' && req.userId !== userId) throw new ForbiddenException();
    return req;
  }

  getAllRequests() {
    return this.db.db
      .select()
      .from(aiServiceRequestsTable)
      .orderBy(desc(aiServiceRequestsTable.createdAt))
      .all();
  }

  updateStatus(id: string, status: RequestStatus, rejectReason?: string) {
    const now = new Date().toISOString();
    this.db.db
      .update(aiServiceRequestsTable)
      .set({ status, rejectReason: rejectReason ?? null, updatedAt: now })
      .where(eq(aiServiceRequestsTable.id, id))
      .run();

    const req = this.db.db.select().from(aiServiceRequestsTable).where(eq(aiServiceRequestsTable.id, id)).get();

    if (req) {
      if (status === 'active') {
        this.db.db.update(usersTable).set({ aiAccess: 1 }).where(eq(usersTable.id, req.userId)).run();
      } else if (status === 'rejected') {
        this.db.db.update(usersTable).set({ aiAccess: 0 }).where(eq(usersTable.id, req.userId)).run();
      }
    }

    return req;
  }
}
