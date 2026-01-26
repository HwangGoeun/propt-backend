import { Test, TestingModule } from '@nestjs/testing';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ERROR_CODE } from 'src/common/constants/error-code';
import { SystemError, UnauthorizedError } from 'src/common/errors/app.error';
import { JwtConfigService } from 'src/config/jwt.config';
import { TokenService } from './token.service';

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  JsonWebTokenError: class JsonWebTokenError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'JsonWebTokenError';
    }
  },
  TokenExpiredError: class TokenExpiredError extends Error {
    expiredAt: Date;
    constructor(message: string, expiredAt: Date) {
      super(message);
      this.name = 'TokenExpiredError';
      this.expiredAt = expiredAt;
    }
  },
}));

import { sign, verify } from 'jsonwebtoken';

describe('TokenService', () => {
  let service: TokenService;

  const mockJwtConfig = {
    accessSecret: 'test-access-secret',
    accessExpiresIn: '1h',
    refreshSecret: 'test-refresh-secret',
    refreshExpiresIn: '7d',
  };

  const mockJwtConfigService = {
    getJwtConfig: jest.fn().mockReturnValue(mockJwtConfig),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenService, { provide: JwtConfigService, useValue: mockJwtConfigService }],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  describe('generateTokens', () => {
    it('유효한 입력으로 토큰 쌍을 생성해야 한다', () => {
      const oauthId = 'google-user-123';
      const oauthProvider = 'google';

      (sign as jest.Mock)
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      const result = service.generateTokens(oauthId, oauthProvider);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: '1h',
      });

      expect(sign).toHaveBeenCalledTimes(2);
      expect(sign).toHaveBeenNthCalledWith(
        1,
        { oauthId, oauthProvider },
        mockJwtConfig.accessSecret,
        { expiresIn: mockJwtConfig.accessExpiresIn },
      );
      expect(sign).toHaveBeenNthCalledWith(
        2,
        { oauthId, oauthProvider },
        mockJwtConfig.refreshSecret,
        { expiresIn: mockJwtConfig.refreshExpiresIn },
      );
    });

    it('oauthId가 빈 문자열일 때 SystemError를 던져야 한다', () => {
      expect(() => service.generateTokens('', 'google')).toThrow(SystemError);
      expect(() => service.generateTokens('', 'google')).toThrow(
        'Invalid token payload: oauthId and oauthProvider are required',
      );
    });

    it('oauthProvider가 빈 문자열일 때 SystemError를 던져야 한다', () => {
      expect(() => service.generateTokens('user-123', '')).toThrow(SystemError);
      expect(() => service.generateTokens('user-123', '')).toThrow(
        'Invalid token payload: oauthId and oauthProvider are required',
      );
    });

    it('oauthId와 oauthProvider 모두 빈 문자열일 때 SystemError를 던져야 한다', () => {
      expect(() => service.generateTokens('', '')).toThrow(SystemError);
    });

    it('sign 함수에서 에러 발생 시 SystemError를 던져야 한다', () => {
      (sign as jest.Mock).mockImplementation(() => {
        throw new Error('Sign failed');
      });

      expect(() => service.generateTokens('user-123', 'google')).toThrow(SystemError);
      expect(() => service.generateTokens('user-123', 'google')).toThrow(
        'Failed to generate tokens',
      );
    });
  });

  describe('refreshTokens', () => {
    it('유효한 refreshToken으로 새 토큰 쌍을 발급해야 한다', () => {
      const mockPayload = { oauthId: 'google-user-123', oauthProvider: 'google' };

      (verify as jest.Mock).mockReturnValue(mockPayload);
      (sign as jest.Mock)
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = service.refreshTokens('valid-refresh-token');

      expect(verify).toHaveBeenCalledWith('valid-refresh-token', mockJwtConfig.refreshSecret);
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: '1h',
      });
    });

    it('만료된 refreshToken일 때 UnauthorizedError(TOKEN_EXPIRED)를 던져야 한다', () => {
      (verify as jest.Mock).mockImplementation(() => {
        throw new TokenExpiredError('jwt expired', new Date());
      });

      try {
        service.refreshTokens('expired-token');
        fail('Expected UnauthorizedError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect((error as UnauthorizedError).errorCode).toBe(ERROR_CODE.TOKEN_EXPIRED);
        expect((error as UnauthorizedError).message).toBe('Refresh token has expired');
      }
    });

    it('잘못된 refreshToken일 때 UnauthorizedError(TOKEN_INVALID)를 던져야 한다', () => {
      (verify as jest.Mock).mockImplementation(() => {
        throw new JsonWebTokenError('invalid token');
      });

      try {
        service.refreshTokens('invalid-token');
        fail('Expected UnauthorizedError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect((error as UnauthorizedError).errorCode).toBe(ERROR_CODE.TOKEN_INVALID);
        expect((error as UnauthorizedError).message).toBe('Invalid refresh token');
      }
    });

    it('기타 에러 발생 시 UnauthorizedError(TOKEN_INVALID)를 던져야 한다', () => {
      (verify as jest.Mock).mockImplementation(() => {
        throw new Error('Unknown error');
      });

      try {
        service.refreshTokens('some-token');
        fail('Expected UnauthorizedError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect((error as UnauthorizedError).errorCode).toBe(ERROR_CODE.TOKEN_INVALID);
        expect((error as UnauthorizedError).message).toBe('Token verification failed');
      }
    });
  });

  describe('verifyToken', () => {
    it('유효한 accessToken의 payload를 반환해야 한다', () => {
      const mockPayload = { oauthId: 'google-user-123', oauthProvider: 'google' };

      (verify as jest.Mock).mockReturnValue(mockPayload);

      const result = service.verifyToken('valid-access-token');

      expect(verify).toHaveBeenCalledWith('valid-access-token', mockJwtConfig.accessSecret);
      expect(result).toEqual(mockPayload);
    });

    it('만료된 accessToken일 때 UnauthorizedError(TOKEN_EXPIRED)를 던져야 한다', () => {
      (verify as jest.Mock).mockImplementation(() => {
        throw new TokenExpiredError('jwt expired', new Date());
      });

      try {
        service.verifyToken('expired-token');
        fail('Expected UnauthorizedError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect((error as UnauthorizedError).errorCode).toBe(ERROR_CODE.TOKEN_EXPIRED);
        expect((error as UnauthorizedError).message).toBe('Access token has expired');
      }
    });

    it('잘못된 accessToken일 때 UnauthorizedError(TOKEN_INVALID)를 던져야 한다', () => {
      (verify as jest.Mock).mockImplementation(() => {
        throw new JsonWebTokenError('invalid signature');
      });

      try {
        service.verifyToken('invalid-token');
        fail('Expected UnauthorizedError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect((error as UnauthorizedError).errorCode).toBe(ERROR_CODE.TOKEN_INVALID);
        expect((error as UnauthorizedError).message).toBe('Invalid access token');
      }
    });

    it('기타 에러 발생 시 UnauthorizedError(TOKEN_INVALID)를 던져야 한다', () => {
      (verify as jest.Mock).mockImplementation(() => {
        throw new Error('Unknown verification error');
      });

      try {
        service.verifyToken('some-token');
        fail('Expected UnauthorizedError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect((error as UnauthorizedError).errorCode).toBe(ERROR_CODE.TOKEN_INVALID);
        expect((error as UnauthorizedError).message).toBe('Token verification failed');
      }
    });
  });
});
