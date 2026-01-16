import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UserRepository } from './user.repository';

const mockPrismaService = {
  user: {
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('UserRepository', () => {
  let repository: UserRepository;
  let prisma: PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserRepository, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('create()는 Prisma를 통해 유저를 생성해야 한다', async () => {
    const userInput = { oauthProvider: 'guest', oauthId: 'guest_123', name: 'user_123' };
    const mockUser = { id: 'user-123', ...userInput };
    mockPrismaService.user.create.mockResolvedValue(mockUser);

    const result = await repository.create(userInput);

    expect(prisma.user.create).toHaveBeenCalledWith({ data: userInput });
    expect(result).toEqual(mockUser);
  });

  it('updateRefreshToken()은 Prisma를 통해 토큰을 업데이트해야 한다', async () => {
    await repository.updateRefreshToken('user-id', 'some-token');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: { refreshToken: 'some-token' },
    });
  });
});
