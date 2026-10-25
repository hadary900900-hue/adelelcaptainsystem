import { Response } from 'express';
import { ApiResponse, ApiErrorResponse, PaginatedResponse } from '@erp/shared';

export function sendSuccess<T>(res: Response, data: T, messageOrCode?: string | number, statusCode: number = 200) {
  let message = 'Success';
  let status = statusCode;
  if (typeof messageOrCode === 'number') {
    status = messageOrCode;
  } else if (typeof messageOrCode === 'string') {
    message = messageOrCode;
  }
  const response: ApiResponse<T> = {
    success: true,
    message,
    data
  };
  res.status(status).json(response);
}

export function sendPaginated<T>(res: Response, data: T[], pagination: PaginatedResponse<T>['pagination'], message: string = 'Success', statusCode: number = 200) {
  const response: PaginatedResponse<T> = {
    success: true,
    message,
    data,
    pagination
  };
  res.status(statusCode).json(response);
}

export function sendError(res: Response, error: any, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
  const response: ApiErrorResponse = {
    success: false,
    message: error.message || 'An unexpected error occurred',
    code
  };
  res.status(statusCode).json(response);
}

export function sendValidationError(res: Response, details: any) {
  const response: ApiErrorResponse = {
    success: false,
    message: 'Validation Error',
    code: 'VALIDATION_ERROR',
    details
  };
  res.status(400).json(response);
}
