import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from '../user/user.repository';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

const mockUserRepository = {
  create: jest.fn(),
  updateRefreshToken: jest.fn(),
};

const mockTokenService = {
  generateTokens: jest.fn().mockReturnValue({
    accessToken: 'mock_access_token',
    refreshToken: 'mock_refresh_token',
  }),
};

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: typeof mockUserRepository;

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
  });

  it('loginAsGuest()는 유저생성 -> 토큰발급 -> DB저장 과정을 수행해야 한다', async () => {
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
      },
    });
  });
});
