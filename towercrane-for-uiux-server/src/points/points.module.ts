import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { PointsController } from './points.controller';
import { PointsService } from './points.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PointsController],
  providers: [PointsService],
})
export class PointsModule {}
