import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from '../auth/token.service';
import { UnauthorizedError } from '../common/errors/app.error';
import { UserRepository } from '../user/user.repository';
import { McpAuthService } from './mcp-auth.service';
import { McpDeviceCodeRepository } from './mcp-device-code.repository';

const mockDeviceCodeRepository = {
  create: jest.fn(),
  findValidCode: jest.fn(),
  delete: jest.fn(),
};

const mockTokenService = {
  generateTokens: jest.fn().mockReturnValue({
    accessToken: 'mock_access_token',
    refreshToken: 'mock_refresh_token',
  }),
};

const mockUserRepository = {
  updateRefreshToken: jest.fn(),
};

describe('McpAuthService', () => {
  let service: McpAuthService;
  let deviceCodeRepository: typeof mockDeviceCodeRepository;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpAuthService,
        { provide: McpDeviceCodeRepository, useValue: mockDeviceCodeRepository },
        { provide: TokenService, useValue: mockTokenService },
        { provide: UserRepository, useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get<McpAuthService>(McpAuthService);
    deviceCodeRepository = module.get(McpDeviceCodeRepository);
  });

  describe('generateAndSaveDeviceCode', () => {
    it('6자리 코드를 생성하고 DB에 저장해야 한다', async () => {
      deviceCodeRepository.create.mockResolvedValue({ id: 'code-123' });

      const code = await service.generateAndSaveDeviceCode('user-123');

      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-Z0-9]+$/);
      expect(deviceCodeRepository.create).toHaveBeenCalledWith(
        'user-123',
        expect.any(String),
        expect.any(Date),
      );
    });
  });

  describe('exchangeDeviceCodeForTokens', () => {
    it('유효한 코드로 토큰을 발급해야 한다', async () => {
      const mockDeviceCode = {
        id: 'code-123',
        code: 'ABC123',
        user: { oauthId: 'oauth-123', oauthProvider: 'google' },
      };
      deviceCodeRepository.findValidCode.mockResolvedValue(mockDeviceCode);

      const result = await service.exchangeDeviceCodeForTokens('ABC123');

      expect(deviceCodeRepository.findValidCode).toHaveBeenCalledWith('ABC123');
      expect(mockTokenService.generateTokens).toHaveBeenCalledWith('oauth-123', 'google');
      expect(deviceCodeRepository.delete).toHaveBeenCalledWith('code-123');
      expect(result).toEqual({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        userType: 'social',
      });
    });

    it('유효하지 않은 코드면 UnauthorizedError을 던져야 한다', async () => {
      deviceCodeRepository.findValidCode.mockResolvedValue(null);

      await expect(service.exchangeDeviceCodeForTokens('INVALID')).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it('소문자 코드도 대문자로 변환하여 처리해야 한다', async () => {
      const mockDeviceCode = {
        id: 'code-123',
        code: 'ABC123',
        user: { oauthId: 'oauth-123', oauthProvider: 'google' },
      };
      deviceCodeRepository.findValidCode.mockResolvedValue(mockDeviceCode);

      await service.exchangeDeviceCodeForTokens('abc123');

      expect(deviceCodeRepository.findValidCode).toHaveBeenCalledWith('ABC123');
    });

    it('게스트 사용자인 경우 userType이 guest여야 한다', async () => {
      const mockDeviceCode = {
        id: 'code-123',
        code: 'ABC123',
        user: { oauthId: 'guest-123', oauthProvider: 'guest' },
      };
      deviceCodeRepository.findValidCode.mockResolvedValue(mockDeviceCode);

      const result = await service.exchangeDeviceCodeForTokens('ABC123');

      expect(result).toEqual({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        userType: 'guest',
      });
    });
  });
});
