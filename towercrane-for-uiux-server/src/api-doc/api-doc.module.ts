import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ApiDocController } from './api-doc.controller';
import { ApiDocService } from './api-doc.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ApiDocController],
  providers: [ApiDocService],
})
export class ApiDocModule {}
