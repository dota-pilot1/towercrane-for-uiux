import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { IssuesController } from './issues.controller';
import { IssuesService } from './issues.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [IssuesController],
  providers: [IssuesService],
})
export class IssuesModule {}
