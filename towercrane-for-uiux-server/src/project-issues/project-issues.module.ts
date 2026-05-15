import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ProjectIssuesController } from './project-issues.controller';
import { ProjectIssuesService } from './project-issues.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ProjectIssuesController],
  providers: [ProjectIssuesService],
  exports: [ProjectIssuesService],
})
export class ProjectIssuesModule {}
