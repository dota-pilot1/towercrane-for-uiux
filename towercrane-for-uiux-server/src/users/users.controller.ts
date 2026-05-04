import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
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

  @Get()
  @Roles('admin')
  findAll() {
    return this.usersService.findAll();
  }

  @Patch('me/profile-image')
  updateMyProfileImage(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    const input = updateProfileImageSchema.parse(body);
    return this.usersService.updateProfileImage(user.id, input.profileImageUrl);
  }
}
