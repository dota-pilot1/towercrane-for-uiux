import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UsersService } from './users.service';

const updateProfileImageSchema = z.object({
  profileImageUrl: z.string().url().nullable(),
});

@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('assignable')
  findAssignable() {
    return this.usersService.findAssignable();
  }

  @Get()
  @Roles('admin')
  findAll() {
    return this.usersService.findAll();
  }

  @Delete(':id')
  @Roles('admin')
  deactivate(@CurrentUser() user: { id: string }, @Param('id') userId: string) {
    return this.usersService.deactivate(userId, user.id);
  }

  @Patch('me/profile-image')
  updateMyProfileImage(
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
  ) {
    const input = updateProfileImageSchema.parse(body);
    return this.usersService.updateProfileImage(user.id, input.profileImageUrl);
  }
}
