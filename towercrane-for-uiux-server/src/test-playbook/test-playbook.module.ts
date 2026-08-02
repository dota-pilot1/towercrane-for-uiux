import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { TestPlaybookController } from './test-playbook.controller';
import { TestPlaybookService } from './test-playbook.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [TestPlaybookController],
  providers: [TestPlaybookService],
})
export class TestPlaybookModule {}
