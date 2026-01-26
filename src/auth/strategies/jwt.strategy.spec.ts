import { Test, TestingModule } from '@nestjs/testing';
import { JwtConfigService } from 'src/config/jwt.config';
import { JwtStrategy, Payload } from './jwt.strategy';

interface MockRequest {
  headers: {
    authorization?: string;
  };
  cookies: {
    accessToken?: string | number;
  };
}

interface JwtStrategyWithExtractor extends JwtStrategy {
  _jwtFromRequest: (req: MockRequest) => string | null;
}

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockJwtConfigService = {
    accessSecret: 'test-access-secret',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtStrategy, { provide: JwtConfigService, useValue: mockJwtConfigService }],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate', () => {
    it('payload를 userId와 provider로 변환해야 한다', () => {
      const payload: Payload = {
        oauthId: 'google-user-123',
        oauthProvider: 'google',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        userId: 'google-user-123',
        provider: 'google',
      });
    });

    it('guest provider도 처리해야 한다', () => {
      const payload: Payload = {
        oauthId: 'guest_12345_user',
        oauthProvider: 'guest',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        userId: 'guest_12345_user',
        provider: 'guest',
      });
    });
  });

  describe('jwtFromRequest (생성자에서 설정)', () => {
    it('Authorization 헤더에서 토큰을 추출해야 한다', () => {
      const mockRequest: MockRequest = {
        headers: {
          authorization: 'Bearer test-token-from-header',
        },
        cookies: {},
      };

      const jwtFromRequest = (strategy as unknown as JwtStrategyWithExtractor)._jwtFromRequest;
      const result = jwtFromRequest(mockRequest);

      expect(result).toBe('test-token-from-header');
    });

    it('쿠키에서 토큰을 추출해야 한다', () => {
      const mockRequest: MockRequest = {
        headers: {},
        cookies: {
          accessToken: 'test-token-from-cookie',
        },
      };

      const jwtFromRequest = (strategy as unknown as JwtStrategyWithExtractor)._jwtFromRequest;
      const result = jwtFromRequest(mockRequest);

      expect(result).toBe('test-token-from-cookie');
    });

    it('헤더가 있으면 쿠키보다 우선해야 한다', () => {
      const mockRequest: MockRequest = {
        headers: {
          authorization: 'Bearer header-token',
        },
        cookies: {
          accessToken: 'cookie-token',
        },
      };

      const jwtFromRequest = (strategy as unknown as JwtStrategyWithExtractor)._jwtFromRequest;
      const result = jwtFromRequest(mockRequest);

      expect(result).toBe('header-token');
    });

    it('토큰이 없으면 null을 반환해야 한다', () => {
      const mockRequest: MockRequest = {
        headers: {},
        cookies: {},
      };

      const jwtFromRequest = (strategy as unknown as JwtStrategyWithExtractor)._jwtFromRequest;
      const result = jwtFromRequest(mockRequest);

      expect(result).toBeNull();
    });

    it('쿠키의 accessToken이 문자열이 아니면 무시해야 한다', () => {
      const mockRequest: MockRequest = {
        headers: {},
        cookies: {
          accessToken: 12345,
        },
      };

      const jwtFromRequest = (strategy as unknown as JwtStrategyWithExtractor)._jwtFromRequest;
      const result = jwtFromRequest(mockRequest);

      expect(result).toBeNull();
    });
  });
});
