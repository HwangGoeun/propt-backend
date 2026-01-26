import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { ConflictError, SystemError } from 'src/common/errors/app.error';
import { PrismaService } from 'src/prisma/prisma.service';
import { TemplateRepository } from './template.repository';

const mockPrismaService = {
  template: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('TemplateRepository', () => {
  let repository: TemplateRepository;
  let prisma: typeof mockPrismaService;

  const mockTemplate = {
    id: 'template-123',
    title: 'Test Template',
    content: 'Template content',
    outputType: 'text',
    creatorId: 'user-123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateRepository, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    repository = module.get<TemplateRepository>(TemplateRepository);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    const createData: Prisma.TemplateCreateInput = {
      title: 'New Template',
      content: 'New content',
      creator: { connect: { id: 'user-123' } },
    };

    it('템플릿을 정상적으로 생성해야 한다', async () => {
      prisma.template.create.mockResolvedValue(mockTemplate);

      const result = await repository.create(createData);

      expect(prisma.template.create).toHaveBeenCalledWith({ data: createData });
      expect(result).toEqual(mockTemplate);
    });

    it('중복 데이터(P2002) 시 ConflictError를 던져야 한다', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: { target: ['title'] },
      });

      prisma.template.create.mockRejectedValue(prismaError);

      await expect(repository.create(createData)).rejects.toThrow(ConflictError);
      await expect(repository.create(createData)).rejects.toThrow(
        'Template already exists with this title',
      );
    });

    it('기타 Prisma 에러 시 SystemError를 던져야 한다', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Database error', {
        code: 'P1001',
        clientVersion: '5.0.0',
      });

      prisma.template.create.mockRejectedValue(prismaError);

      await expect(repository.create(createData)).rejects.toThrow(SystemError);
      await expect(repository.create(createData)).rejects.toThrow('Failed to process Template');
    });

    it('일반 에러 시 SystemError를 던져야 한다', async () => {
      prisma.template.create.mockRejectedValue(new Error('Unknown error'));

      await expect(repository.create(createData)).rejects.toThrow(SystemError);
    });
  });

  describe('findAllByUserId', () => {
    it('사용자의 템플릿 목록을 생성일 역순으로 반환해야 한다', async () => {
      const templates = [
        { ...mockTemplate, id: 'template-1', createdAt: new Date('2024-01-02') },
        { ...mockTemplate, id: 'template-2', createdAt: new Date('2024-01-01') },
      ];

      prisma.template.findMany.mockResolvedValue(templates);

      const result = await repository.findAllByUserId('user-123');

      expect(prisma.template.findMany).toHaveBeenCalledWith({
        where: { creatorId: 'user-123' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(templates);
      expect(result).toHaveLength(2);
    });

    it('템플릿이 없으면 빈 배열을 반환해야 한다', async () => {
      prisma.template.findMany.mockResolvedValue([]);

      const result = await repository.findAllByUserId('user-no-templates');

      expect(prisma.template.findMany).toHaveBeenCalledWith({
        where: { creatorId: 'user-no-templates' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findOneById', () => {
    it('템플릿이 존재하면 해당 템플릿을 반환해야 한다', async () => {
      prisma.template.findUnique.mockResolvedValue(mockTemplate);

      const result = await repository.findOneById('template-123');

      expect(prisma.template.findUnique).toHaveBeenCalledWith({
        where: { id: 'template-123' },
      });
      expect(result).toEqual(mockTemplate);
    });

    it('템플릿이 존재하지 않으면 null을 반환해야 한다', async () => {
      prisma.template.findUnique.mockResolvedValue(null);

      const result = await repository.findOneById('non-existent-id');

      expect(prisma.template.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateData: Prisma.TemplateUpdateInput = {
      title: 'Updated Title',
      content: 'Updated content',
    };

    it('템플릿을 정상적으로 업데이트해야 한다', async () => {
      const updatedTemplate = { ...mockTemplate, ...updateData };
      prisma.template.update.mockResolvedValue(updatedTemplate);

      const result = await repository.update('template-123', updateData);

      expect(prisma.template.update).toHaveBeenCalledWith({
        where: { id: 'template-123' },
        data: updateData,
      });
      expect(result).toEqual(updatedTemplate);
    });

    it('중복 데이터(P2002) 시 ConflictError를 던져야 한다', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: { target: ['title'] },
      });

      prisma.template.update.mockRejectedValue(prismaError);

      await expect(repository.update('template-123', updateData)).rejects.toThrow(ConflictError);
    });

    it('기타 Prisma 에러 시 SystemError를 던져야 한다', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });

      prisma.template.update.mockRejectedValue(prismaError);

      await expect(repository.update('non-existent', updateData)).rejects.toThrow(SystemError);
    });
  });

  describe('delete', () => {
    it('템플릿을 정상적으로 삭제해야 한다', async () => {
      prisma.template.delete.mockResolvedValue(mockTemplate);

      await repository.delete('template-123');

      expect(prisma.template.delete).toHaveBeenCalledWith({
        where: { id: 'template-123' },
      });
    });

    it('존재하지 않는 템플릿 삭제 시 SystemError를 던져야 한다', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });

      prisma.template.delete.mockRejectedValue(prismaError);

      await expect(repository.delete('non-existent')).rejects.toThrow(SystemError);
    });

    it('일반 에러 시 SystemError를 던져야 한다', async () => {
      prisma.template.delete.mockRejectedValue(new Error('Database error'));

      await expect(repository.delete('template-123')).rejects.toThrow(SystemError);
    });
  });
});
