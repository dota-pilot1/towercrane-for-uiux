import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';
import { SessionToken } from './session-token.decorator';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() body: unknown) {
    return this.authService.signup(body);
  }

  @Post('login')
  login(@Body() body: unknown) {
    return this.authService.login(body);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  logout(@SessionToken() token: string) {
    return this.authService.logout(token);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: unknown) {
    return user;
  }
}
