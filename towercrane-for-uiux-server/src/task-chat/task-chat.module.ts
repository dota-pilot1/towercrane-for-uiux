import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TasksModule } from '../tasks/tasks.module';
import { TaskChatController } from './task-chat.controller';
import { TaskChatService } from './task-chat.service';

@Module({
  imports: [TasksModule, AuthModule],
  controllers: [TaskChatController],
  providers: [TaskChatService],
})
export class TaskChatModule {}
