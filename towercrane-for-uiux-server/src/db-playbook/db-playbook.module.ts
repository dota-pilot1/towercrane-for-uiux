import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { DbPlaybookController } from './db-playbook.controller';
import { DbPlaybookService } from './db-playbook.service';

@Module({ imports: [DatabaseModule, AuthModule], controllers: [DbPlaybookController], providers: [DbPlaybookService] })
export class DbPlaybookModule {}

