import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SqlPracticeController } from './sql-practice.controller';
import { SqlPracticeService } from './sql-practice.service';

@Module({
  imports: [AuthModule],
  controllers: [SqlPracticeController],
  providers: [SqlPracticeService],
})
export class SqlPracticeModule {}
