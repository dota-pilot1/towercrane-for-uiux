import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { CicdPlaybookController } from './cicd-playbook.controller';
import { CicdPlaybookService } from './cicd-playbook.service';

@Module({ imports: [DatabaseModule, AuthModule], controllers: [CicdPlaybookController], providers: [CicdPlaybookService] })
export class CicdPlaybookModule {}
