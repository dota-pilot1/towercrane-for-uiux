import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { TaskAgentController } from './task-agent.controller';
import { TaskPublicController } from './task-public.controller';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [TasksController, TaskPublicController, TaskAgentController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
