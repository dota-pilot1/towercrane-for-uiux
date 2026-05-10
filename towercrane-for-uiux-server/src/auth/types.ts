import type { Request } from 'express';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

export interface SessionRequest extends Request {
  user: SessionUser;
  sessionToken?: string;
}
