import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AxStudyController } from './ax-study.controller';
import { AxStudyService } from './ax-study.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AxStudyController],
  providers: [AxStudyService],
})
export class AxStudyModule {}
