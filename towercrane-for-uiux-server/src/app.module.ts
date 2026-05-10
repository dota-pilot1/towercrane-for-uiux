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
import { ApiDocModule } from './api-doc/api-doc.module';
import { IssuesModule } from './issues/issues.module';
import { ChallengeModule } from './challenge/challenge.module';

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
    ApiDocModule,
    IssuesModule,
    ChallengeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
