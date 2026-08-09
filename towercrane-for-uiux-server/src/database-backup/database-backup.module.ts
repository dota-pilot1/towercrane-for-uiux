import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { DatabaseBackupController } from './database-backup.controller';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [DatabaseBackupController],
})
export class DatabaseBackupModule {}
