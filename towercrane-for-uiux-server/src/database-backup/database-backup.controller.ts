import {
  Controller,
  Get,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guard/admin.guard';
import { SessionGuard } from '../auth/guard/session.guard';
import { DatabaseService } from '../database/database.service';

@Controller('admin/database-backup')
@UseGuards(SessionGuard, AdminGuard)
export class DatabaseBackupController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  async download(): Promise<StreamableFile> {
    const backup = await this.database.createBackup();
    return new StreamableFile(backup, {
      type: 'application/vnd.sqlite3',
      disposition: `attachment; filename="towercrane-catalog-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite"`,
    });
  }
}
