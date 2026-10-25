import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './error.middleware';

export { AppError };

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    activeBranchId?: string;
    permissions?: string[];
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No token provided', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1] || '';

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret as string) as any;
    req.user = {
      userId: payload.userId,
      organizationId: payload.organizationId
    };
    next();
  } catch (error) {
    next(error);
  }
}
