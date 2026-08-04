import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { MybatisPlaybookController } from './mybatis-playbook.controller';
import { MybatisPlaybookService } from './mybatis-playbook.service';

@Module({ imports: [DatabaseModule, AuthModule], controllers: [MybatisPlaybookController], providers: [MybatisPlaybookService] })
export class MybatisPlaybookModule {}
