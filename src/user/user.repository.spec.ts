import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UserRepository } from './user.repository';

const mockPrismaService = {
  user: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
};

describe('UserRepository', () => {
  let repository: UserRepository;
  let prisma: typeof mockPrismaService;

  const mockUser = {
    id: 'user-123',
    oauthProvider: 'google',
    oauthId: 'google-user-123',
    email: 'test@example.com',
    name: 'Test User',
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserRepository, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('Prisma를 통해 유저를 생성해야 한다', async () => {
      const userInput = { oauthProvider: 'guest', oauthId: 'guest_123', name: 'user_123' };
      const createdUser = { id: 'user-123', ...userInput };
      prisma.user.create.mockResolvedValue(createdUser);

      const result = await repository.create(userInput);

      expect(prisma.user.create).toHaveBeenCalledWith({ data: userInput });
      expect(result).toEqual(createdUser);
    });
  });

  describe('findByOAuthCredentials', () => {
    it('oauthProvider와 oauthId의 복합 키로 사용자를 조회해야 한다', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findByOAuthCredentials('google', 'google-user-123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          oauthProvider_oauthId: {
            oauthProvider: 'google',
            oauthId: 'google-user-123',
          },
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('사용자가 없으면 null을 반환해야 한다', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.findByOAuthCredentials('google', 'non-existent');

      expect(prisma.user.findUnique).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('findByOAuthId', () => {
    it('oauthId로 사용자를 조회해야 한다', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await repository.findByOAuthId('google-user-123');

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { oauthId: 'google-user-123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('사용자가 없으면 null을 반환해야 한다', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await repository.findByOAuthId('non-existent');

      expect(prisma.user.findFirst).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('id로 사용자를 조회해야 한다', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findById('user-123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: undefined,
      });
      expect(result).toEqual(mockUser);
    });

    it('select 옵션을 지정하면 해당 필드만 조회해야 한다', async () => {
      const selectedUser = { id: 'user-123', name: 'Test User' };
      prisma.user.findUnique.mockResolvedValue(selectedUser);

      const result = await repository.findById('user-123', { id: true, name: true });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { id: true, name: true },
      });
      expect(result).toEqual(selectedUser);
    });

    it('사용자가 없으면 null을 반환해야 한다', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateRefreshToken', () => {
    it('Prisma를 통해 토큰을 업데이트해야 한다', async () => {
      await repository.updateRefreshToken('user-id', 'some-token');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { refreshToken: 'some-token' },
      });
    });

    it('토큰을 null로 업데이트할 수 있어야 한다', async () => {
      await repository.updateRefreshToken('user-id', null);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { refreshToken: null },
      });
    });
  });
});
