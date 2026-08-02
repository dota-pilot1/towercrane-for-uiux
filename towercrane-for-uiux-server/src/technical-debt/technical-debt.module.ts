import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { TechnicalDebtPlaybookController } from './technical-debt.controller';
import { TechnicalDebtPlaybookService } from './technical-debt.service';

@Module({ imports: [DatabaseModule, AuthModule], controllers: [TechnicalDebtPlaybookController], providers: [TechnicalDebtPlaybookService] })
export class TechnicalDebtPlaybookModule {}

