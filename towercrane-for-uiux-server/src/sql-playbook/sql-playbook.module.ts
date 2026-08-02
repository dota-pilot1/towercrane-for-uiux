import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { SqlPlaybookController } from './sql-playbook.controller';
import { SqlPlaybookService } from './sql-playbook.service';

@Module({ imports: [DatabaseModule, AuthModule], controllers: [SqlPlaybookController], providers: [SqlPlaybookService] })
export class SqlPlaybookModule {}
