import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { TutorialController } from './tutorial.controller';
import { TutorialService } from './tutorial.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [TutorialController],
  providers: [TutorialService],
})
export class TutorialModule {}
