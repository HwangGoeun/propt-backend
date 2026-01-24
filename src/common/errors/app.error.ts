import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODE } from '../constants/error-code';

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

export class AppError extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    message: string,
    statusCode: HttpStatus,
    public readonly details?: unknown,
  ) {
    super({ errorCode, message, details }, statusCode);
  }
}

export class BusinessError extends AppError {
  constructor(errorCode: ErrorCode, message: string, details?: unknown) {
    super(errorCode, message, HttpStatus.BAD_REQUEST, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ERROR_CODE.NOT_FOUND, message, HttpStatus.NOT_FOUND, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string, errorCode: ErrorCode = ERROR_CODE.UNAUTHORIZED, details?: unknown) {
    super(errorCode, message, HttpStatus.UNAUTHORIZED, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ERROR_CODE.FORBIDDEN, message, HttpStatus.FORBIDDEN, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, errorCode: ErrorCode = ERROR_CODE.CONFLICT, details?: unknown) {
    super(errorCode, message, HttpStatus.CONFLICT, details);
  }
}

export class SystemError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ERROR_CODE.INTERNAL_SERVER_ERROR, message, HttpStatus.INTERNAL_SERVER_ERROR, details);
  }
}
