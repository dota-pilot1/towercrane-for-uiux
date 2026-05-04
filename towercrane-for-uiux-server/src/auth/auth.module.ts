import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MailModule } from '../mail/mail.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { OptionalAuthGuard } from './optional-auth.guard';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';

@Module({
  imports: [DatabaseModule, MailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailVerificationService,
    AuthGuard,
    OptionalAuthGuard,
  ],
  exports: [AuthService, AuthGuard, OptionalAuthGuard],
})
export class AuthModule {}
