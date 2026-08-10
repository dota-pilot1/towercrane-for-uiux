import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UserAiKeysController } from './user-ai-keys.controller';
import { UserAiKeysService } from './user-ai-keys.service';

@Module({ imports: [DatabaseModule], controllers: [UserAiKeysController], providers: [UserAiKeysService], exports: [UserAiKeysService] })
export class UserAiKeysModule {}
