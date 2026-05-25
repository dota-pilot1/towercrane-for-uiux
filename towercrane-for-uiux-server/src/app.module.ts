import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { DatabaseModule } from './database/database.module';
import { DocuModule } from './docu/docu.module';
import { ReviewModule } from './review/review.module';
import { UploadModule } from './upload/upload.module';
import { UsersModule } from './users/users.module';
import { MenusModule } from './menus/menus.module';
import { MeetingModule } from './meeting/meeting.module';
import { TasksModule } from './tasks/tasks.module';
import { ProjectIssuesModule } from './project-issues/project-issues.module';
import { ApiDocModule } from './api-doc/api-doc.module';
import { IssuesModule } from './issues/issues.module';
import { ChallengeModule } from './challenge/challenge.module';
import { SqlPracticeModule } from './sql-practice/sql-practice.module';
import { DevChallengeModule } from './dev-challenge/dev-challenge.module';
import { StudyDiaryModule } from './study-diary/study-diary.module';
import { BoardsModule } from './boards/boards.module';
import { AiEvaluationModule } from './ai-evaluation/ai-evaluation.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { ChatbotMonitoringModule } from './chatbot-monitoring/chatbot-monitoring.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    CatalogModule,
    DocuModule,
    ReviewModule,
    UploadModule,
    UsersModule,
    MenusModule,
    MeetingModule,
    TasksModule,
    ProjectIssuesModule,
    ApiDocModule,
    IssuesModule,
    ChallengeModule,
    StudyDiaryModule,
    DevChallengeModule,
    SqlPracticeModule,
    BoardsModule,
    AiEvaluationModule,
    ChatbotModule,
    ChatbotMonitoringModule,
    KnowledgeBaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
