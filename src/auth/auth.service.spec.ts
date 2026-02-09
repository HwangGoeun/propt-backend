import { Test, TestingModule } from '@nestjs/testing';
import { ERROR_CODE } from 'src/common/constants/error-code';
import { NotFoundError, SystemError, UnauthorizedError } from 'src/common/errors/app.error';
import { UserRepository } from '../user/user.repository';
import { AuthService } from './auth.service';
import { OAuthProfileDto } from './dto/oauth-profile.dto';
import { TokenService } from './token.service';

const mockUserRepository = {
  create: jest.fn(),
  updateRefreshToken: jest.fn(),
  findByOAuthCredentials: jest.fn(),
  findByOAuthId: jest.fn(),
  deleteUser: jest.fn(),
};

const mockTokenService = {
  generateTokens: jest.fn().mockReturnValue({
    accessToken: 'mock_access_token',
    refreshToken: 'mock_refresh_token',
    expiresIn: '1h',
  }),
  refreshTokens: jest.fn().mockReturnValue({
    accessToken: 'new_access_token',
    refreshToken: 'new_refresh_token',
    expiresIn: '1h',
  }),
  verifyToken: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: typeof mockUserRepository;
  let tokenService: typeof mockTokenService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: TokenService, useValue: mockTokenService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(UserRepository);
    tokenService = module.get(TokenService);
  });

  describe('loginAsGuest', () => {
    it('유저생성 -> 토큰발급 -> DB저장 과정을 수행해야 한다', async () => {
      const mockUser = { id: 'user-123', name: 'user_abc' };
      userRepository.create.mockResolvedValue(mockUser);

      const result = await service.loginAsGuest();

      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.updateRefreshToken).toHaveBeenCalledWith(
        'user-123',
        'mock_refresh_token',
      );
      expect(result).toEqual({
        user: {
          id: 'user-123',
          name: 'user_abc',
        },
        tokens: {
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token',
          expiresIn: '1h',
        },
      });
    });
  });

  describe('findOrCreateOAuthUser', () => {
    const mockOAuthProfile: OAuthProfileDto = {
      provider: 'google',
      providerUserId: 'google-user-123',
      email: 'test@example.com',
      emailVerified: true,
      name: 'Test User',
    };

    it('기존 사용자가 있으면 해당 사용자를 반환해야 한다', async () => {
      const existingUser = {
        id: 'user-db-id',
        oauthProvider: 'google',
        oauthId: 'google-user-123',
        email: 'test@example.com',
        name: 'Test User',
      };
      userRepository.findByOAuthCredentials.mockResolvedValue(existingUser);

      const result = await service.findOrCreateOAuthUser(mockOAuthProfile);

      expect(userRepository.findByOAuthCredentials).toHaveBeenCalledWith(
        'google',
        'google-user-123',
      );
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(result).toEqual(existingUser);
    });

    it('신규 사용자면 새로 생성해야 한다', async () => {
      const newUser = {
        id: 'new-user-id',
        oauthProvider: 'google',
        oauthId: 'google-user-123',
        email: 'test@example.com',
        name: 'RandomName123',
      };
      userRepository.findByOAuthCredentials.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(newUser);

      const result = await service.findOrCreateOAuthUser(mockOAuthProfile);

      expect(userRepository.findByOAuthCredentials).toHaveBeenCalledWith(
        'google',
        'google-user-123',
      );
      expect(userRepository.create).toHaveBeenCalled();
      expect(result).toEqual(newUser);
    });

    it('providerUserId가 없으면 UnauthorizedError를 던져야 한다', async () => {
      const invalidProfile: OAuthProfileDto = {
        provider: 'google',
        providerUserId: '',
        email: 'test@example.com',
        emailVerified: true,
        name: 'Test User',
      };

      await expect(service.findOrCreateOAuthUser(invalidProfile)).rejects.toThrow(
        UnauthorizedError,
      );
      await expect(service.findOrCreateOAuthUser(invalidProfile)).rejects.toThrow(
        'Provider user ID is required',
      );
    });

    it('P2002 에러 발생 시 최대 3회 재시도해야 한다', async () => {
      const p2002Error = new Error('Unique constraint failed') as Error & { code: string };
      p2002Error.code = 'P2002';

      const newUser = {
        id: 'new-user-id',
        oauthProvider: 'google',
        oauthId: 'google-user-123',
        email: 'test@example.com',
        name: 'RandomName456',
      };

      userRepository.findByOAuthCredentials.mockResolvedValue(null);
      userRepository.create
        .mockRejectedValueOnce(p2002Error)
        .mockRejectedValueOnce(p2002Error)
        .mockResolvedValueOnce(newUser);

      const result = await service.findOrCreateOAuthUser(mockOAuthProfile);

      expect(userRepository.create).toHaveBeenCalledTimes(3);
      expect(result).toEqual(newUser);
    });

    it('3회 모두 P2002 에러 시 SystemError를 던져야 한다', async () => {
      const p2002Error1 = new Error('Unique constraint failed') as Error & { code: string };
      p2002Error1.code = 'P2002';
      const p2002Error2 = new Error('Unique constraint failed') as Error & { code: string };
      p2002Error2.code = 'P2002';
      const p2002Error3 = new Error('Unique constraint failed') as Error & { code: string };
      p2002Error3.code = 'P2002';

      userRepository.findByOAuthCredentials.mockResolvedValue(null);
      userRepository.create
        .mockRejectedValueOnce(p2002Error1)
        .mockRejectedValueOnce(p2002Error2)
        .mockRejectedValueOnce(p2002Error3);

      try {
        await service.findOrCreateOAuthUser(mockOAuthProfile);
        fail('Expected SystemError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SystemError);
        expect((error as SystemError).message).toBe(
          'Failed to create user after multiple attempts',
        );
      }
    });

    it('P2002가 아닌 DB 에러 시 SystemError를 던져야 한다', async () => {
      const dbError = new Error('Database connection failed') as Error & { code: string };
      dbError.code = 'P1001';

      userRepository.findByOAuthCredentials.mockResolvedValue(null);
      userRepository.create.mockRejectedValue(dbError);

      await expect(service.findOrCreateOAuthUser(mockOAuthProfile)).rejects.toThrow(SystemError);
      await expect(service.findOrCreateOAuthUser(mockOAuthProfile)).rejects.toThrow(
        'Failed to create user',
      );
    });
  });

  describe('generateTokens', () => {
    it('tokenService.generateTokens를 호출해야 한다', () => {
      const result = service.generateTokens('oauth-123', 'google');

      expect(tokenService.generateTokens).toHaveBeenCalledWith('oauth-123', 'google');
      expect(result).toEqual({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        expiresIn: '1h',
      });
    });
  });

  describe('refreshTokens', () => {
    it('tokenService.refreshTokens를 호출해야 한다', () => {
      const result = service.refreshTokens('valid-refresh-token');

      expect(tokenService.refreshTokens).toHaveBeenCalledWith('valid-refresh-token');
      expect(result).toEqual({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        expiresIn: '1h',
      });
    });
  });

  describe('validateToken', () => {
    it('유효한 토큰이면 사용자 정보를 반환해야 한다', async () => {
      const mockPayload = { oauthId: 'google-user-123', oauthProvider: 'google' };
      const mockUser = {
        id: 'user-db-id',
        email: 'test@example.com',
        name: 'Test User',
        oauthProvider: 'google',
        oauthId: 'google-user-123',
      };

      tokenService.verifyToken.mockReturnValue(mockPayload);
      userRepository.findByOAuthCredentials.mockResolvedValue(mockUser);

      const result = await service.validateToken('valid-access-token');

      expect(tokenService.verifyToken).toHaveBeenCalledWith('valid-access-token');
      expect(userRepository.findByOAuthCredentials).toHaveBeenCalledWith(
        'google',
        'google-user-123',
      );
      expect(result).toEqual({
        id: 'user-db-id',
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('사용자가 없으면 UnauthorizedError를 던져야 한다', async () => {
      const mockPayload = { oauthId: 'non-existent', oauthProvider: 'google' };

      tokenService.verifyToken.mockReturnValue(mockPayload);
      userRepository.findByOAuthCredentials.mockResolvedValue(null);

      try {
        await service.validateToken('valid-token');
        fail('Expected UnauthorizedError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect((error as UnauthorizedError).errorCode).toBe(ERROR_CODE.USER_NOT_FOUND);
      }
    });
  });

  describe('getUserByOAuthId', () => {
    it('사용자가 있으면 반환해야 한다', async () => {
      const mockUser = {
        id: 'user-db-id',
        email: 'test@example.com',
        name: 'Test User',
        oauthId: 'google-user-123',
      };

      userRepository.findByOAuthId.mockResolvedValue(mockUser);

      const result = await service.getUserByOAuthId('google-user-123');

      expect(userRepository.findByOAuthId).toHaveBeenCalledWith('google-user-123');
      expect(result).toEqual(mockUser);
    });

    it('사용자가 없으면 UnauthorizedError를 던져야 한다', async () => {
      userRepository.findByOAuthId.mockResolvedValue(null);

      try {
        await service.getUserByOAuthId('non-existent');
        fail('Expected UnauthorizedError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect((error as UnauthorizedError).errorCode).toBe(ERROR_CODE.USER_NOT_FOUND);
      }
    });
  });

  describe('withdraw', () => {
    it('사용자를 찾아서 삭제해야 한다', async () => {
      const mockUser = {
        id: 'user-db-id',
        oauthProvider: 'google',
        oauthId: 'google-user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      userRepository.findByOAuthCredentials.mockResolvedValue(mockUser);
      userRepository.deleteUser.mockResolvedValue(undefined);

      await service.withdraw('google', 'google-user-123');

      expect(userRepository.findByOAuthCredentials).toHaveBeenCalledWith(
        'google',
        'google-user-123',
      );
      expect(userRepository.deleteUser).toHaveBeenCalledWith('user-db-id');
    });

    it('사용자가 없으면 NotFoundError를 던져야 한다', async () => {
      userRepository.findByOAuthCredentials.mockResolvedValue(null);

      await expect(service.withdraw('google', 'non-existent')).rejects.toThrow(NotFoundError);
    });
  });
});
