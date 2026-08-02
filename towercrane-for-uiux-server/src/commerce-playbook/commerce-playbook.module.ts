import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { CommercePlaybookController } from './commerce-playbook.controller';
import { CommercePlaybookService } from './commerce-playbook.service';

@Module({ imports: [DatabaseModule, AuthModule], controllers: [CommercePlaybookController], providers: [CommercePlaybookService] })
export class CommercePlaybookModule {}

