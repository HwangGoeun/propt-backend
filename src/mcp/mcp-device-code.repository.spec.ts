import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { McpDeviceCodeRepository } from './mcp-device-code.repository';

const mockPrismaService = {
  mcpDeviceCode: {
    create: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('McpDeviceCodeRepository', () => {
  let repository: McpDeviceCodeRepository;
  let prisma: typeof mockPrismaService;

  const mockDeviceCode = {
    id: 'device-code-123',
    userId: 'user-123',
    code: 'ABC123',
    expiresAt: new Date('2025-01-01T12:00:00Z'),
    createdAt: new Date('2025-01-01T11:00:00Z'),
  };

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [McpDeviceCodeRepository, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    repository = module.get<McpDeviceCodeRepository>(McpDeviceCodeRepository);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('디바이스 코드를 생성해야 한다', async () => {
      const userId = 'user-123';
      const code = 'XYZ789';
      const expiresAt = new Date('2025-01-01T12:00:00Z');

      prisma.mcpDeviceCode.create.mockResolvedValue({
        id: 'new-device-code',
        userId,
        code,
        expiresAt,
        createdAt: new Date(),
      });

      const result = await repository.create(userId, code, expiresAt);

      expect(prisma.mcpDeviceCode.create).toHaveBeenCalledWith({
        data: {
          userId,
          code,
          expiresAt,
        },
      });
      expect(result.code).toBe(code);
      expect(result.userId).toBe(userId);
    });
  });

  describe('findValidCode', () => {
    it('유효한 코드를 찾으면 user 정보와 함께 반환해야 한다', async () => {
      const deviceCodeWithUser = {
        ...mockDeviceCode,
        user: mockUser,
      };

      prisma.mcpDeviceCode.findFirst.mockResolvedValue(deviceCodeWithUser);

      const result = await repository.findValidCode('ABC123');

      expect(prisma.mcpDeviceCode.findFirst).toHaveBeenCalledWith({
        where: {
          code: 'ABC123',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          expiresAt: { gt: expect.any(Date) },
        },
        include: { user: true },
      });
      expect(result).toEqual(deviceCodeWithUser);
      expect(result?.user).toEqual(mockUser);
    });

    it('코드가 존재하지 않으면 null을 반환해야 한다', async () => {
      prisma.mcpDeviceCode.findFirst.mockResolvedValue(null);

      const result = await repository.findValidCode('INVALID');

      expect(prisma.mcpDeviceCode.findFirst).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('만료된 코드는 조회되지 않아야 한다 (expiresAt > now 조건)', async () => {
      prisma.mcpDeviceCode.findFirst.mockResolvedValue(null);

      const result = await repository.findValidCode('EXPIRED');

      expect(prisma.mcpDeviceCode.findFirst).toHaveBeenCalledWith({
        where: {
          code: 'EXPIRED',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          expiresAt: { gt: expect.any(Date) },
        },
        include: { user: true },
      });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('ID로 디바이스 코드를 삭제해야 한다', async () => {
      prisma.mcpDeviceCode.delete.mockResolvedValue(mockDeviceCode);

      const result = await repository.delete('device-code-123');

      expect(prisma.mcpDeviceCode.delete).toHaveBeenCalledWith({
        where: { id: 'device-code-123' },
      });
      expect(result).toEqual(mockDeviceCode);
    });
  });

  describe('deleteExpired', () => {
    it('만료된 디바이스 코드를 일괄 삭제해야 한다', async () => {
      prisma.mcpDeviceCode.deleteMany.mockResolvedValue({ count: 5 });

      const result = await repository.deleteExpired();

      expect(prisma.mcpDeviceCode.deleteMany).toHaveBeenCalledWith({
        where: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          expiresAt: { lt: expect.any(Date) },
        },
      });
      expect(result).toEqual({ count: 5 });
    });

    it('만료된 코드가 없으면 count 0을 반환해야 한다', async () => {
      prisma.mcpDeviceCode.deleteMany.mockResolvedValue({ count: 0 });

      const result = await repository.deleteExpired();

      expect(result).toEqual({ count: 0 });
    });
  });
});
