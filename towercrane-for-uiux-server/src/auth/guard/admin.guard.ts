import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { SessionRequest } from '../types';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<SessionRequest>();

    if (!request.user || request.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
