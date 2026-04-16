import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database/database.service';

@Injectable()
export class AppService {
  constructor(private readonly databaseService: DatabaseService) {}

  getHello() {
    return {
      service: 'towercrane-for-uiux-server',
      status: 'ok',
      storage: this.databaseService.health(),
    };
  }
}
