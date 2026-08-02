import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ArchitecturePlaybookController } from './architecture-playbook.controller';
import { ArchitecturePlaybookService } from './architecture-playbook.service';

@Module({ imports: [DatabaseModule, AuthModule], controllers: [ArchitecturePlaybookController], providers: [ArchitecturePlaybookService] })
export class ArchitecturePlaybookModule {}

