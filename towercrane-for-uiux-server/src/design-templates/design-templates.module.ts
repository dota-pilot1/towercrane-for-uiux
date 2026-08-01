import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { DesignTemplatesController } from './design-templates.controller';
import { DesignTemplatesService } from './design-templates.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [DesignTemplatesController],
  providers: [DesignTemplatesService],
})
export class DesignTemplatesModule {}
