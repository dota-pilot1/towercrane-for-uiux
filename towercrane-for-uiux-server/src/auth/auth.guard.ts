import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';

export type AuthenticatedRequest = Request & {
  user?: ReturnType<AuthService['getSessionUser']>;
  sessionToken?: string;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is required');
    }

    const token = authorization.slice('Bearer '.length).trim();

    if (!token) {
      throw new UnauthorizedException('Bearer token is required');
    }

    request.user = this.authService.getSessionUser(token);
    request.sessionToken = token;

    return true;
  }
}
