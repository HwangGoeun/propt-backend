import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ERROR_CODE } from '../constants/error-code';
import { ApiErrorResponse } from '../types/response.types';

type NestErrorResponse = {
  message?: unknown;
  details?: unknown;
  error?: string;
  statusCode?: number;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawResponse = exception instanceof HttpException ? exception.getResponse() : null;

    const { message, details } = extractMessageAndDetails(status, rawResponse, exception);
    const code = mapStatusToCode(status, rawResponse);

    const body: ApiErrorResponse = {
      ok: false,
      error: {
        code,
        message,
        ...(details !== null ? { details } : {}),
      },
    };

    res.status(status).json(body);
  }
}

function extractMessageAndDetails(
  status: number,
  rawResponse: string | object | null,
  exception: unknown,
): {
  message: string;
  details?: unknown;
} {
  if (typeof rawResponse === 'string') {
    return { message: rawResponse };
  }

  if (rawResponse && typeof rawResponse === 'object') {
    const raw = rawResponse as NestErrorResponse;

    if (typeof raw.message === 'string') {
      if (raw.details != null) {
        return { message: raw.message, details: raw.details };
      }

      return { message: raw.message };
    }

    if (raw.message != null) {
      return {
        message: defaultMessageByStatus(status),
        details: raw.message,
      };
    }

    if (typeof raw.error === 'string' && raw.error.trim() !== '') {
      return { message: raw.error };
    }
  }

  if (exception && typeof exception === 'object' && 'message' in exception) {
    const msg = (exception as { message?: unknown }).message;

    if (typeof msg === 'string' && msg.trim() !== '') {
      return { message: msg };
    }
  }

  return { message: defaultMessageByStatus(status) };
}

function defaultMessageByStatus(status: HttpStatus): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'Bad request';
    case HttpStatus.UNAUTHORIZED:
      return 'Unauthorized';
    case HttpStatus.FORBIDDEN:
      return 'Forbidden';
    case HttpStatus.NOT_FOUND:
      return 'Not found';
    case HttpStatus.CONFLICT:
      return 'Conflict';
    default:
      return status >= HttpStatus.INTERNAL_SERVER_ERROR
        ? 'Internal server error'
        : 'Request failed';
  }
}

function mapStatusToCode(status: HttpStatus, rawResponse: string | object | null): string {
  if (rawResponse && typeof rawResponse === 'object') {
    const raw = rawResponse as NestErrorResponse;

    if (raw.details != null || Array.isArray(raw.message)) {
      return ERROR_CODE.VALIDATION_ERROR;
    }
  }

  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return ERROR_CODE.BAD_REQUEST;
    case HttpStatus.UNAUTHORIZED:
      return ERROR_CODE.UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return ERROR_CODE.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ERROR_CODE.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return ERROR_CODE.CONFLICT;
    default:
      return status >= HttpStatus.INTERNAL_SERVER_ERROR
        ? ERROR_CODE.INTERNAL_SERVER_ERROR
        : ERROR_CODE.REQUEST_FAILED;
  }
}
