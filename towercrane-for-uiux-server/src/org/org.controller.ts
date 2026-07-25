import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgService } from './org.service';

const createDepartmentSchema = z.object({
  name: z.string().min(1).max(40),
  parentId: z.string().min(1).nullable().default(null),
});

const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  parentId: z.string().min(1).nullable().optional(),
});

@Controller('org')
@UseGuards(AuthGuard, RolesGuard)
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

  @Post('departments')
  @Roles('admin')
  createDepartment(@Body() body: unknown) {
    const input = createDepartmentSchema.parse(body);
    return this.orgService.createDepartment(input.name, input.parentId);
  }

  @Patch('departments/:id')
  @Roles('admin')
  updateDepartment(@Param('id') id: string, @Body() body: unknown) {
    const input = updateDepartmentSchema.parse(body);
    return this.orgService.updateDepartment(id, input);
  }

  @Delete('departments/:id')
  @Roles('admin')
  deleteDepartment(@Param('id') id: string) {
    return this.orgService.deleteDepartment(id);
  }
}
