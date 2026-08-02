import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AxPlaybookController } from './ax-playbook.controller';
import { AxPlaybookService } from './ax-playbook.service';

@Module({ imports: [DatabaseModule, AuthModule], controllers: [AxPlaybookController], providers: [AxPlaybookService] })
export class AxPlaybookModule {}
