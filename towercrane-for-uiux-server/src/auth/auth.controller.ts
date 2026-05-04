import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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

  @Get('check-email')
  checkEmail(@Query('email') email: string) {
    return this.authService.checkEmail({ email });
  }

  @Post('email/send-code')
  @HttpCode(204)
  async sendEmailCode(@Body() body: unknown) {
    await this.authService.sendSignupCode(body);
  }

  @Post('email/verify-code')
  verifyEmailCode(@Body() body: unknown) {
    return this.authService.verifySignupCode(body);
  }

  @Post('password-reset/request-code')
  @HttpCode(204)
  async requestPasswordResetCode(@Body() body: unknown) {
    await this.authService.requestPasswordResetCode(body);
  }

  @Post('password-reset/verify-code')
  verifyPasswordResetCode(@Body() body: unknown) {
    return this.authService.verifyPasswordResetCode(body);
  }

  @Post('password-reset/reset-with-code')
  @HttpCode(204)
  async resetPasswordWithCode(@Body() body: unknown) {
    await this.authService.resetPasswordWithCode(body);
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
