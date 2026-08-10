import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { UserAiKeysController } from './user-ai-keys.controller';
import { UserAiKeysService } from './user-ai-keys.service';

@Module({ imports: [DatabaseModule, AuthModule], controllers: [UserAiKeysController], providers: [UserAiKeysService], exports: [UserAiKeysService] })
export class UserAiKeysModule {}
