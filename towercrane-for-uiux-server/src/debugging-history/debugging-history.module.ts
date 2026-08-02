import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { DebuggingPlaybookController } from './debugging-history.controller';
import { DebuggingPlaybookService } from './debugging-history.service';

@Module({ imports: [DatabaseModule, AuthModule], controllers: [DebuggingPlaybookController], providers: [DebuggingPlaybookService] })
export class DebuggingPlaybookModule {}

