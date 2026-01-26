import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ERROR_CODE } from '../constants/error-code';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
  };
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockArgumentsHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;
  });

  describe('HTTP 상태 코드별 처리', () => {
    it('400 BadRequest를 처리해야 한다', () => {
      const exception = new BadRequestException('Bad request message');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: ERROR_CODE.BAD_REQUEST,
          message: 'Bad request message',
        },
      });
    });

    it('401 Unauthorized를 처리해야 한다', () => {
      const exception = new UnauthorizedException('Unauthorized message');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: ERROR_CODE.UNAUTHORIZED,
          message: 'Unauthorized message',
        },
      });
    });

    it('403 Forbidden을 처리해야 한다', () => {
      const exception = new ForbiddenException('Forbidden message');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: ERROR_CODE.FORBIDDEN,
          message: 'Forbidden message',
        },
      });
    });

    it('404 NotFound를 처리해야 한다', () => {
      const exception = new NotFoundException('Not found message');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: ERROR_CODE.NOT_FOUND,
          message: 'Not found message',
        },
      });
    });

    it('409 Conflict를 처리해야 한다', () => {
      const exception = new ConflictException('Conflict message');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: ERROR_CODE.CONFLICT,
          message: 'Conflict message',
        },
      });
    });

    it('500 InternalServerError를 처리해야 한다', () => {
      const exception = new InternalServerErrorException('Internal error');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: ERROR_CODE.INTERNAL_SERVER_ERROR,
          message: 'Internal error',
        },
      });
    });
  });

  describe('일반 Error 처리', () => {
    it('HttpException이 아닌 일반 Error는 500으로 처리해야 한다', () => {
      const exception = new Error('Unknown error occurred');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: ERROR_CODE.INTERNAL_SERVER_ERROR,
          message: 'Unknown error occurred',
        },
      });
    });

    it('메시지가 없는 일반 Error는 기본 메시지를 사용해야 한다', () => {
      const exception = new Error();

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: ERROR_CODE.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        },
      });
    });

    it('null/undefined 예외도 처리해야 한다', () => {
      filter.catch(null, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: ERROR_CODE.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        },
      });
    });
  });

  describe('응답 메시지 추출', () => {
    it('응답이 문자열이면 그대로 사용해야 한다', () => {
      const exception = new HttpException('String message', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          error: expect.objectContaining({
            message: 'String message',
          }),
        }) as object,
      );
    });

    it('응답 객체의 message가 문자열이면 사용해야 한다', () => {
      const exception = new HttpException(
        { message: 'Object message', statusCode: 400 },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          error: expect.objectContaining({
            message: 'Object message',
          }),
        }) as object,
      );
    });

    it('응답 객체에 message와 details가 있으면 둘 다 포함해야 한다', () => {
      const exception = new HttpException(
        { message: 'Error message', details: { field: 'email', reason: 'invalid' } },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: ERROR_CODE.VALIDATION_ERROR,
          message: 'Error message',
          details: { field: 'email', reason: 'invalid' },
        },
      });
    });

    it('응답 객체의 message가 배열이면 details로 사용하고 기본 메시지를 설정해야 한다', () => {
      const exception = new HttpException(
        { message: ['field1 is required', 'field2 must be a number'] },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: ERROR_CODE.VALIDATION_ERROR,
          message: 'Bad request',
          details: ['field1 is required', 'field2 must be a number'],
        },
      });
    });

    it('응답 객체의 error 필드를 메시지로 사용해야 한다', () => {
      const exception = new HttpException(
        { error: 'Custom error string', statusCode: 403 },
        HttpStatus.FORBIDDEN,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          error: expect.objectContaining({
            message: 'Custom error string',
          }),
        }) as object,
      );
    });
  });

  describe('에러 코드 추출', () => {
    it('응답에 errorCode가 있으면 그것을 사용해야 한다', () => {
      const exception = new HttpException(
        { errorCode: 'CUSTOM_ERROR_CODE', message: 'Custom error' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          error: expect.objectContaining({
            code: 'CUSTOM_ERROR_CODE',
          }),
        }) as object,
      );
    });

    it('details가 있으면 VALIDATION_ERROR 코드를 사용해야 한다', () => {
      const exception = new HttpException(
        { message: 'Validation failed', details: ['error1'] },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          error: expect.objectContaining({
            code: ERROR_CODE.VALIDATION_ERROR,
          }),
        }) as object,
      );
    });

    it('message가 배열이면 VALIDATION_ERROR 코드를 사용해야 한다', () => {
      const exception = new HttpException(
        { message: ['error1', 'error2'] },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          error: expect.objectContaining({
            code: ERROR_CODE.VALIDATION_ERROR,
          }),
        }) as object,
      );
    });

    it('4xx 에러 중 알 수 없는 상태는 REQUEST_FAILED를 사용해야 한다', () => {
      const exception = new HttpException('Payment required', HttpStatus.PAYMENT_REQUIRED);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          error: expect.objectContaining({
            code: ERROR_CODE.REQUEST_FAILED,
          }),
        }) as object,
      );
    });
  });

  describe('응답 형식', () => {
    it('응답은 ok: false와 error 객체를 포함해야 한다', () => {
      const exception = new BadRequestException('Test error');

      filter.catch(exception, mockArgumentsHost);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const response = mockResponse.json.mock.calls[0][0] as {
        ok: boolean;
        error: { code: string; message: string; details?: unknown };
      };
      expect(response).toHaveProperty('ok', false);
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
    });

    it('details가 명시적으로 없으면 응답의 details는 undefined여야 한다', () => {
      const exception = new BadRequestException('Error without details');

      filter.catch(exception, mockArgumentsHost);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const response = mockResponse.json.mock.calls[0][0] as {
        ok: boolean;
        error: { code: string; message: string; details?: unknown };
      };
      expect(response.error.details).toBeUndefined();
    });

    it('details가 있으면 응답에 details 필드가 있어야 한다', () => {
      const exception = new HttpException(
        { message: 'Error with details', details: { field: 'email' } },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const response = mockResponse.json.mock.calls[0][0] as {
        ok: boolean;
        error: { code: string; message: string; details?: unknown };
      };
      expect(response.error).toHaveProperty('details', { field: 'email' });
    });
  });
});
