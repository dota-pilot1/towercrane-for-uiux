import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OrgService } from './org.service';

@Controller('org')
@UseGuards(AuthGuard)
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get('tree')
  getTree() {
    return this.orgService.getTree();
  }

  @Get('departments')
  listDepartments() {
    return this.orgService.listDepartments();
  }
}
