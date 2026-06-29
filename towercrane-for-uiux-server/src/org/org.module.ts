import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [OrgController],
  providers: [OrgService],
})
export class OrgModule {}
