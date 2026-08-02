import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { DevopsPlaybookController } from './devops-playbook.controller';
import { DevopsPlaybookService } from './devops-playbook.service';

@Module({ imports: [DatabaseModule, AuthModule], controllers: [DevopsPlaybookController], providers: [DevopsPlaybookService] })
export class DevopsPlaybookModule {}
