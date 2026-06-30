import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { TeamDocsController } from './team-docs.controller';
import { TeamDocsService } from './team-docs.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [TeamDocsController],
  providers: [TeamDocsService],
  exports: [TeamDocsService],
})
export class TeamDocsModule {}
