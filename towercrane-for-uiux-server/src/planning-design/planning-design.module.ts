import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { PlanningDesignController } from './planning-design.controller';
import { PlanningDesignService } from './planning-design.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PlanningDesignController],
  providers: [PlanningDesignService],
})
export class PlanningDesignModule {}
