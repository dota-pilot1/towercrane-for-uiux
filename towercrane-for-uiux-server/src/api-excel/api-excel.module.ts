import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ApiExcelController } from './api-excel.controller';
import { ApiExcelService } from './api-excel.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ApiExcelController],
  providers: [ApiExcelService],
})
export class ApiExcelModule {}
