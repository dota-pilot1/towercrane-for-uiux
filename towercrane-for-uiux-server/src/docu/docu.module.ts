import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { DocuController } from './docu.controller';
import { DocuService } from './docu.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [DocuController],
  providers: [DocuService],
})
export class DocuModule {}
