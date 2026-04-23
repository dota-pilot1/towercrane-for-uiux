import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth.guard';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return true;
    }

    const token = authorization.slice('Bearer '.length).trim();

    if (!token) {
      return true;
    }

    try {
      request.user = this.authService.getSessionUser(token);
      request.sessionToken = token;
    } catch {
      // Ignore invalid tokens for optional auth
    }

    return true;
  }
}
