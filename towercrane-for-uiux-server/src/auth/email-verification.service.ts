import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { emailVerificationsTable, usersTable } from '../database/schema';
import { MailService } from '../mail/mail.service';

type VerificationPurpose = 'signup' | 'password_reset';

const CODE_TTL_MS = 5 * 60 * 1000;
const VERIFIED_TOKEN_TTL_MS = 30 * 60 * 1000;
const MAX_FAIL_COUNT = 5;
const RESEND_COOLDOWN_MS = 5 * 1000;

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly mailService: MailService,
  ) {}

  async sendSignupCode(email: string) {
    if (!this.isEmailAvailable(email)) {
      throw new ConflictException('Email is already registered');
    }

    await this.createAndSendCode(email, 'signup');
  }

  async sendPasswordResetCode(email: string) {
    const user = this.databaseService.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .get();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.createAndSendCode(email, 'password_reset');
  }

  verifyCode(email: string, purpose: VerificationPurpose, code: string) {
    const verification = this.databaseService.db
      .select()
      .from(emailVerificationsTable)
      .where(
        and(
          eq(emailVerificationsTable.email, email),
          eq(emailVerificationsTable.purpose, purpose),
        ),
      )
      .orderBy(desc(emailVerificationsTable.createdAt))
      .get();

    if (!verification) {
      throw new BadRequestException('Email verification code not found');
    }

    if (new Date(verification.expiresAt).getTime() < Date.now()) {
      throw new BadRequestException('Email verification code expired');
    }

    if (verification.failCount >= MAX_FAIL_COUNT) {
      throw new HttpException(
        'Too many verification attempts',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (verification.codeHash !== this.hashSecret(code)) {
      this.databaseService.db
        .update(emailVerificationsTable)
        .set({
          failCount: verification.failCount + 1,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(emailVerificationsTable.id, verification.id))
        .run();
      throw new BadRequestException('Invalid email verification code');
    }

    const verifiedToken = randomBytes(32).toString('hex');
    const now = new Date();

    this.databaseService.db
      .update(emailVerificationsTable)
      .set({
        verified: true,
        verifiedTokenHash: this.hashSecret(verifiedToken),
        verifiedTokenExpiresAt: new Date(
          now.getTime() + VERIFIED_TOKEN_TTL_MS,
        ).toISOString(),
        updatedAt: now.toISOString(),
      })
      .where(eq(emailVerificationsTable.id, verification.id))
      .run();

    return { verifiedToken };
  }

  consumeVerifiedToken(input: {
    email: string;
    purpose: VerificationPurpose;
    verifiedToken: string;
  }) {
    const verification = this.databaseService.db
      .select()
      .from(emailVerificationsTable)
      .where(
        eq(
          emailVerificationsTable.verifiedTokenHash,
          this.hashSecret(input.verifiedToken),
        ),
      )
      .get();

    if (
      !verification ||
      !verification.verified ||
      verification.email !== input.email ||
      verification.purpose !== input.purpose ||
      !verification.verifiedTokenExpiresAt ||
      new Date(verification.verifiedTokenExpiresAt).getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'Email verification token is invalid or expired',
      );
    }

    this.databaseService.db
      .delete(emailVerificationsTable)
      .where(eq(emailVerificationsTable.id, verification.id))
      .run();
  }

  isEmailAvailable(email: string) {
    const existingUser = this.databaseService.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .get();

    return !existingUser;
  }

  private async createAndSendCode(email: string, purpose: VerificationPurpose) {
    this.assertResendAllowed(email, purpose);

    this.databaseService.db
      .delete(emailVerificationsTable)
      .where(
        and(
          eq(emailVerificationsTable.email, email),
          eq(emailVerificationsTable.purpose, purpose),
        ),
      )
      .run();

    const now = new Date();
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');

    this.databaseService.db
      .insert(emailVerificationsTable)
      .values({
        id: randomUUID(),
        email,
        purpose,
        codeHash: this.hashSecret(code),
        expiresAt: new Date(now.getTime() + CODE_TTL_MS).toISOString(),
        failCount: 0,
        verified: false,
        verifiedTokenHash: null,
        verifiedTokenExpiresAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })
      .run();

    if (purpose === 'signup') {
      await this.mailService.sendEmailVerificationCode(email, code);
    } else {
      await this.mailService.sendPasswordResetCode(email, code);
    }
  }

  private assertResendAllowed(email: string, purpose: VerificationPurpose) {
    const latest = this.databaseService.db
      .select()
      .from(emailVerificationsTable)
      .where(
        and(
          eq(emailVerificationsTable.email, email),
          eq(emailVerificationsTable.purpose, purpose),
        ),
      )
      .orderBy(desc(emailVerificationsTable.createdAt))
      .get();

    if (
      latest &&
      Date.now() - new Date(latest.createdAt).getTime() < RESEND_COOLDOWN_MS
    ) {
      throw new HttpException(
        '이미 인증코드를 보냈습니다. 5초 후 다시 발송할 수 있습니다.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private hashSecret(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
