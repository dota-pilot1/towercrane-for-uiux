import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { TasksModule } from '../tasks/tasks.module';
import { FeaturePlansController } from './feature-plans.controller';
import { FeaturePlansService } from './feature-plans.service';

@Module({
  imports: [DatabaseModule, AuthModule, TasksModule],
  controllers: [FeaturePlansController],
  providers: [FeaturePlansService],
})
export class FeaturePlansModule {}
