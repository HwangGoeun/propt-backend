import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
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
};

const mockJwtConfigService = {};

const mockMcpAuthService = {
  generateAndSaveDeviceCode: jest.fn(),
};

const mockResponse = {
  cookie: jest.fn(),
} as unknown as Response;

describe('AuthController', () => {
  let controller: AuthController;

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

  it('guestLogin()은 쿠키를 설정하고 메시지를 반환해야 한다', async () => {
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
});
