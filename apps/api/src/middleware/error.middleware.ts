import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { Prisma } from '@erp/database';
import { sendError, sendValidationError } from '../utils/response';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number = 400, code: string = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  logger.error(`${err.name}: ${err.message}`);
  
  if (err instanceof ZodError) {
    return sendValidationError(res, err.errors);
  }

  if (err instanceof TokenExpiredError) {
    return sendError(res, { message: 'Token expired' }, 401, 'TOKEN_EXPIRED');
  }

  if (err instanceof JsonWebTokenError) {
    return sendError(res, { message: 'Invalid token' }, 401, 'INVALID_TOKEN');
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    return sendError(
      res,
      { message: 'Database connection failed. Please ensure PostgreSQL is running at localhost:5432 or update DATABASE_URL in .env.' },
      503,
      'DATABASE_UNAVAILABLE'
    );
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return sendError(res, { message: 'Unique constraint failed' }, 409, 'UNIQUE_CONSTRAINT_ERROR');
      case 'P2025':
        return sendError(res, { message: 'Record not found' }, 404, 'NOT_FOUND');
      case 'P2003':
        return sendError(res, { message: 'Foreign key constraint failed' }, 409, 'FOREIGN_KEY_ERROR');
      default:
        return sendError(res, { message: 'Database error' }, 500, 'DB_ERROR');
    }
  }

  if (err instanceof AppError) {
    return sendError(res, { message: err.message }, err.statusCode, err.code);
  }

  return sendError(res, { message: 'Internal Server Error' }, 500, 'INTERNAL_ERROR');
}
