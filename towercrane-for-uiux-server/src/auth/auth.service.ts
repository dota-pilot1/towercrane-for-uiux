import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { sessionsTable, usersTable, type UserRow } from '../database/schema';
import {
  emailSchema,
  loginSchema,
  resetPasswordWithCodeSchema,
  signupSchema,
  verifyEmailCodeSchema,
} from './auth.schemas';
import { EmailVerificationService } from './email-verification.service';
import { MailService } from '../mail/mail.service';

const SESSION_TTL_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly mailService: MailService,
  ) {}

  signup(payload: unknown) {
    const input = signupSchema.parse(payload);
    const existingUser = this.databaseService.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .get();

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    this.emailVerificationService.consumeVerifiedToken({
      email: input.email,
      purpose: 'signup',
      verifiedToken: input.verifiedToken,
    });

    const now = new Date().toISOString();
    const userCount =
      this.databaseService.db
        .select({ count: sql<number>`count(*)` })
        .from(usersTable)
        .get()?.count ?? 0;

    const user = {
      id: randomUUID(),
      email: input.email,
      passwordHash: this.hashPassword(input.password),
      name: input.name,
      role: (userCount === 0 ? 'admin' : 'user') as 'admin' | 'user',
      createdAt: now,
      updatedAt: now,
    };

    this.databaseService.db.insert(usersTable).values(user).run();

    return this.createSession(user);
  }

  login(payload: unknown) {
    const input = loginSchema.parse(payload);
    const user = this.databaseService.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .get();

    if (!user || !this.verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createSession(user);
  }

  checkEmail(payload: unknown) {
    const input = emailSchema.parse(payload);
    return {
      available: this.emailVerificationService.isEmailAvailable(input.email),
    };
  }

  async sendSignupCode(payload: unknown) {
    const input = emailSchema.parse(payload);
    await this.emailVerificationService.sendSignupCode(input.email);
    return { success: true };
  }

  verifySignupCode(payload: unknown) {
    const input = verifyEmailCodeSchema.parse(payload);
    return this.emailVerificationService.verifyCode(
      input.email,
      'signup',
      input.code,
    );
  }

  async requestPasswordResetCode(payload: unknown) {
    const input = emailSchema.parse(payload);
    await this.emailVerificationService.sendPasswordResetCode(input.email);
    return { success: true };
  }

  verifyPasswordResetCode(payload: unknown) {
    const input = verifyEmailCodeSchema.parse(payload);
    return this.emailVerificationService.verifyCode(
      input.email,
      'password_reset',
      input.code,
    );
  }

  async resetPasswordWithCode(payload: unknown) {
    const input = resetPasswordWithCodeSchema.parse(payload);
    this.emailVerificationService.consumeVerifiedToken({
      email: input.email,
      purpose: 'password_reset',
      verifiedToken: input.verifiedToken,
    });

    const user = this.databaseService.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .get();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedAt = new Date().toISOString();
    this.databaseService.db
      .update(usersTable)
      .set({
        passwordHash: this.hashPassword(input.newPassword),
        updatedAt,
      })
      .where(eq(usersTable.id, user.id))
      .run();

    this.databaseService.db
      .delete(sessionsTable)
      .where(eq(sessionsTable.userId, user.id))
      .run();

    await this.mailService.sendPasswordChanged(user.email, user.name);
    return { success: true };
  }

  logout(token: string) {
    this.databaseService.db
      .delete(sessionsTable)
      .where(eq(sessionsTable.token, token))
      .run();

    return { success: true };
  }

  getSessionUser(token: string) {
    const session = this.databaseService.db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.token, token))
      .get();

    if (!session) {
      throw new UnauthorizedException('Authentication required');
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.databaseService.db
        .delete(sessionsTable)
        .where(eq(sessionsTable.id, session.id))
        .run();
      throw new UnauthorizedException('Session expired');
    }

    const user = this.databaseService.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .get();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.sanitizeUser(user);
  }

  private createSession(user: UserRow) {
    const now = new Date();
    const createdAt = now.toISOString();
    const expiresAt = new Date(
      now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const token = randomBytes(32).toString('hex');

    this.databaseService.db
      .insert(sessionsTable)
      .values({
        id: randomUUID(),
        userId: user.id,
        token,
        createdAt,
        expiresAt,
      })
      .run();

    return {
      token,
      user: this.sanitizeUser(user),
      expiresAt,
    };
  }

  private sanitizeUser(user: UserRow) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, storedValue: string) {
    const [salt, storedHash] = storedValue.split(':');

    if (!salt || !storedHash) {
      return false;
    }

    const computedHash = scryptSync(password, salt, 64).toString('hex');
    return timingSafeEqual(
      Buffer.from(storedHash, 'hex'),
      Buffer.from(computedHash, 'hex'),
    );
  }
}
