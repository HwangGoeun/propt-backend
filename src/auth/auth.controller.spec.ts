import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { JwtConfigService } from '../config/jwt.config';
import { McpAuthService } from '../mcp/mcp-auth.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  loginAsGuest: jest.fn().mockResolvedValue({
    user: {
      id: 'user-123',
      name: 'user_abc',
    },
    tokens: {
      accessToken: 'accessToken_123',
      refreshToken: 'refreshToken_123',
    },
  }),
  findOrCreateOAuthUser: jest.fn(),
  generateTokens: jest.fn(),
  refreshTokens: jest.fn(),
  validateToken: jest.fn(),
};

const mockJwtConfigService = {
  getJwtConfig: jest.fn().mockReturnValue({
    accessExpiresIn: '1h',
    refreshExpiresIn: '7d',
  }),
};

const mockMcpAuthService = {
  generateAndSaveDeviceCode: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  const createMockResponse = () =>
    ({
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      redirect: jest.fn(),
    }) as unknown as Response;

  const createMockRequest = (
    cookies: Record<string, string> = {},
    user?: Record<string, unknown>,
  ) =>
    ({
      cookies,
      user,
    }) as unknown as Request;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: JwtConfigService,
          useValue: mockJwtConfigService,
        },
        {
          provide: McpAuthService,
          useValue: mockMcpAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('googleCallback', () => {
    it('일반 로그인 시 쿠키를 설정하고 /templates로 리다이렉트해야 한다', async () => {
      const mockResponse = createMockResponse();
      const mockUser = {
        id: 'user-123',
        oauthId: 'google-user-123',
        oauthProvider: 'google',
      };
      const oauthProfile = {
        provider: 'google',
        providerUserId: 'google-user-123',
        email: 'test@example.com',
      };
      const mockRequest = createMockRequest({}, oauthProfile);

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);
      mockAuthService.generateTokens.mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const originalEnv = process.env.FRONTEND_URL;
      process.env.FRONTEND_URL = 'http://localhost:3000';

      await controller.googleCallback(mockRequest, mockResponse);

      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(oauthProfile);
      expect(mockAuthService.generateTokens).toHaveBeenCalledWith('google-user-123', 'google');
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'accessToken',
        'access-token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith('http://localhost:3000/templates');

      process.env.FRONTEND_URL = originalEnv;
    });

    it('state=mcp인 경우 디바이스 코드를 발급하고 /mcp/code로 리다이렉트해야 한다', async () => {
      const mockResponse = createMockResponse();
      const mockUser = {
        id: 'user-123',
        oauthId: 'google-user-123',
        oauthProvider: 'google',
      };
      const oauthProfile = {
        provider: 'google',
        providerUserId: 'google-user-123',
      };
      const mockRequest = createMockRequest({}, oauthProfile);

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);
      mockMcpAuthService.generateAndSaveDeviceCode.mockResolvedValue('ABC123');

      const originalEnv = process.env.FRONTEND_URL;
      process.env.FRONTEND_URL = 'http://localhost:3000';

      await controller.googleCallback(mockRequest, mockResponse, 'mcp');

      expect(mockMcpAuthService.generateAndSaveDeviceCode).toHaveBeenCalledWith('user-123');
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/mcp/code?code=ABC123',
      );
      expect(mockAuthService.generateTokens).not.toHaveBeenCalled();

      process.env.FRONTEND_URL = originalEnv;
    });
  });

  describe('getMe', () => {
    it('accessToken이 있으면 사용자 정보를 반환해야 한다', async () => {
      const mockRequest = createMockRequest({ accessToken: 'valid-token' });

      mockAuthService.validateToken.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      });

      const result = await controller.getMe(mockRequest);

      expect(mockAuthService.validateToken).toHaveBeenCalledWith('valid-token');
      expect(result).toEqual({
        ok: true,
        data: {
          isAuthenticated: true,
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
          },
        },
      });
    });

    it('accessToken이 없으면 UnauthorizedException을 던져야 한다', async () => {
      const mockRequest = createMockRequest({});

      await expect(controller.getMe(mockRequest)).rejects.toThrow(UnauthorizedException);
      await expect(controller.getMe(mockRequest)).rejects.toThrow('인증되지 않았습니다.');
    });
  });

  describe('loginAsGuest', () => {
    it('일반 로그인 시 쿠키를 설정하고 ok:true를 반환해야 한다', async () => {
      const mockResponse = createMockResponse();

      const result = await controller.loginAsGuest({}, mockResponse);

      expect(mockAuthService.loginAsGuest).toHaveBeenCalled();
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'accessToken',
        'accessToken_123',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refreshToken_123',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        }),
      );
      expect(result).toEqual({ ok: true, data: null });
    });

    it('state=mcp인 경우 디바이스 코드를 반환해야 한다', async () => {
      const mockResponse = createMockResponse();

      mockMcpAuthService.generateAndSaveDeviceCode.mockResolvedValue('DEF456');

      const result = await controller.loginAsGuest({ state: 'mcp' }, mockResponse);

      expect(mockMcpAuthService.generateAndSaveDeviceCode).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        ok: true,
        data: {
          code: 'DEF456',
        },
      });
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('refreshToken으로 새 토큰을 발급해야 한다', () => {
      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: '1h',
      };

      mockAuthService.refreshTokens.mockReturnValue(mockTokens);

      const result = controller.refresh({ refreshToken: 'old-refresh-token' });

      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('old-refresh-token');
      expect(result).toEqual(mockTokens);
    });
  });

  describe('logout', () => {
    it('쿠키를 삭제하고 ok:true를 반환해야 한다', () => {
      const mockResponse = createMockResponse();

      const result = controller.logout(mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'accessToken',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({ ok: true, data: null });
    });
  });
});
