import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { CommonComponentTemplatesController } from './common-component-templates.controller';
import { CommonComponentTemplatesService } from './common-component-templates.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CommonComponentTemplatesController],
  providers: [CommonComponentTemplatesService],
})
export class CommonComponentTemplatesModule {}
