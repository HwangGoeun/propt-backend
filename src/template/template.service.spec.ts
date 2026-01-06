import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TemplateService } from './template.service';

describe('TemplateService', () => {
  let service: TemplateService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn(),
            },
            template: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    const date = new Date();

    const mockUser = {
      id: 'user-db-id-123',
      oauthId: 'google-user-1',
      oauthProvider: 'google',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: date,
      updatedAt: date,
    };

    const createDto = {
      title: 'New Template',
      description: 'Description',
      content: 'Content with {variable}',
      variables: [{ name: 'variable', type: 'text' as const }],
    };

    it('should create template successfully', async () => {
      const date = new Date();

      const mockTemplate = {
        id: 'tpl_new',
        creatorId: 'user-db-id-123',
        title: createDto.title,
        description: createDto.description,
        content: createDto.content,
        variable: createDto.variables,
        createdAt: date,
        updatedAt: date,
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);
      jest.spyOn(prisma.template, 'create').mockResolvedValue(mockTemplate);

      const result = await service.create('google-user-1', createDto);

      expect(result.id).toBe('tpl_new');
      expect(result.title).toBe('New Template');
      expect(prisma.template.create).toHaveBeenCalledWith({
        data: {
          creatorId: 'user-db-id-123',
          title: createDto.title,
          description: createDto.description,
          content: createDto.content,
          variable: createDto.variables,
        },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);

      await expect(service.create('non-existent', createDto)).rejects.toThrow(NotFoundException);

      expect(prisma.template.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate title', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);
      jest.spyOn(prisma.template, 'create').mockRejectedValue(prismaError);

      await expect(service.create('google-user-1', createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllByUserId', () => {
    it('should return all templates for a user', async () => {
      const date = new Date();

      const mockUser = {
        id: 'user-db-id-123',
        oauthId: 'google-user-1',
        oauthProvider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: date,
        updatedAt: date,
      };

      const mockTemplates = [
        {
          id: 'template_1',
          title: 'template_1',
          creatorId: 'user-db-id-123',
          description: 'Description 1',
          content: 'Content 1',
          variable: [
            {
              name: 'keyword',
              type: 'test',
            },
          ],
          createdAt: date,
          updatedAt: date,
        },
        {
          id: 'template_2',
          title: 'template_2',
          creatorId: 'user-db-id-123',
          description: null,
          content: 'Content 2',
          variable: [],
          createdAt: date,
          updatedAt: date,
        },
      ];

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);
      jest.spyOn(prisma.template, 'findMany').mockResolvedValue(mockTemplates);

      const result = await service.findAllByUserId('google-user-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('template_1');
      expect(result[0].description).toBe('Description 1');
      expect(result[0]).toHaveProperty('variables');
      expect(Array.isArray(result[0].variables)).toBe(true);
      expect(result[1].id).toBe('template_2');
      expect(result[1].description).toBeUndefined();

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { oauthId: 'google-user-1' },
      });
      expect(prisma.template.findMany).toHaveBeenCalledWith({
        where: { creatorId: 'user-db-id-123' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if user has no templates', async () => {
      const date = new Date();

      const mockUser = {
        id: 'user-db-id-123',
        oauthId: 'google-user-1',
        oauthProvider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: date,
        updatedAt: date,
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);
      jest.spyOn(prisma.template, 'findMany').mockResolvedValue([]);

      const result = await service.findAllByUserId('google-user-1');

      expect(result).toHaveLength(0);
    });

    it('should return empty array if user not found', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);

      const result = await service.findAllByUserId('non-existent-user');

      expect(result).toHaveLength(0);
      expect(prisma.template.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findOneById', () => {
    it('should return a template if user is owner', async () => {
      const date = new Date();

      const mockUser = {
        id: 'user-db-id-123',
        oauthId: 'google-user-1',
        oauthProvider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: date,
        updatedAt: date,
      };

      const mockTemplate = {
        id: 'tpl_1',
        creatorId: 'user-db-id-123',
        title: 'Test Template',
        description: 'Description',
        content: 'Content',
        variable: [],
        createdAt: date,
        updatedAt: date,
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);
      jest.spyOn(prisma.template, 'findUnique').mockResolvedValue(mockTemplate);

      const result = await service.findOneById('tpl_1', 'google-user-1');

      expect(result.id).toBe('tpl_1');
      expect(result.title).toBe('Test Template');
      expect(result).toHaveProperty('variables');
      expect(Array.isArray(result.variables)).toBe(true);
    });

    it('should throw NotFoundException if template does not exist', async () => {
      const date = new Date();

      const mockUser = {
        id: 'user-db-id-123',
        oauthId: 'google-user-1',
        oauthProvider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: date,
        updatedAt: date,
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);
      jest.spyOn(prisma.template, 'findUnique').mockResolvedValue(null);

      await expect(service.findOneById('tpl_999', 'google-user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      const date = new Date();

      const mockUser = {
        id: 'user-db-id-123',
        oauthId: 'google-user-1',
        oauthProvider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: date,
        updatedAt: date,
      };

      const mockTemplate = {
        id: 'tpl_1',
        creatorId: 'user-db-id-456',
        title: 'Test Template',
        description: 'Description',
        content: 'Content',
        variable: [],
        createdAt: date,
        updatedAt: date,
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);
      jest.spyOn(prisma.template, 'findUnique').mockResolvedValue(mockTemplate);

      await expect(service.findOneById('tpl_1', 'google-user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    const date = new Date();

    const mockUser = {
      id: 'user-db-id-123',
      oauthId: 'google-user-1',
      oauthProvider: 'google',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: date,
      updatedAt: date,
    };

    const mockTemplate = {
      id: 'tpl_1',
      creatorId: 'user-db-id-123',
      title: 'Original Title',
      description: 'Original Description',
      content: 'Original Content',
      variable: [{ name: 'var1', type: 'text' }],
      createdAt: date,
      updatedAt: date,
    };

    it('should update template successfully', async () => {
      const updateDto = {
        title: 'Updated Title',
        description: 'Updated Description',
        content: 'Updated Content',
        variables: [{ name: 'var2', type: 'text' as const }],
      };

      const updatedTemplate = {
        ...mockTemplate,
        title: updateDto.title,
        description: updateDto.description,
        content: updateDto.content,
        variable: updateDto.variables,
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);
      jest.spyOn(prisma.template, 'findUnique').mockResolvedValue(mockTemplate);
      jest.spyOn(prisma.template, 'update').mockResolvedValue(updatedTemplate);

      const result = await service.update('tpl_1', 'google-user-1', updateDto);

      expect(result.id).toBe('tpl_1');
      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('Updated Description');
      expect(result.content).toBe('Updated Content');
      expect(prisma.template.update).toHaveBeenCalledWith({
        where: { id: 'tpl_1' },
        data: {
          title: 'Updated Title',
          description: 'Updated Description',
          content: 'Updated Content',
          variable: updateDto.variables,
        },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);

      await expect(service.update('tpl_1', 'non-existent', { title: 'New Title' })).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.template.findUnique).not.toHaveBeenCalled();
      expect(prisma.template.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if template not found', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);
      jest.spyOn(prisma.template, 'findUnique').mockResolvedValue(null);

      await expect(
        service.update('tpl_999', 'google-user-1', { title: 'New Title' }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.template.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      const otherUserTemplate = {
        ...mockTemplate,
        creatorId: 'other-user-id',
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);
      jest.spyOn(prisma.template, 'findUnique').mockResolvedValue(otherUserTemplate);

      await expect(
        service.update('tpl_1', 'google-user-1', { title: 'New Title' }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.template.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate title (P2002)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);
      jest.spyOn(prisma.template, 'findUnique').mockResolvedValue(mockTemplate);
      jest.spyOn(prisma.template, 'update').mockRejectedValue(prismaError);

      await expect(
        service.update('tpl_1', 'google-user-1', { title: 'Duplicate Title' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should update only title when partial update', async () => {
      const partialUpdateDto = { title: 'Only Title Updated' };

      const partiallyUpdatedTemplate = {
        ...mockTemplate,
        title: partialUpdateDto.title,
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);
      jest.spyOn(prisma.template, 'findUnique').mockResolvedValue(mockTemplate);
      jest.spyOn(prisma.template, 'update').mockResolvedValue(partiallyUpdatedTemplate);

      const result = await service.update('tpl_1', 'google-user-1', partialUpdateDto);

      expect(result.title).toBe('Only Title Updated');
      expect(result.description).toBe('Original Description');
      expect(prisma.template.update).toHaveBeenCalledWith({
        where: { id: 'tpl_1' },
        data: {
          title: 'Only Title Updated',
        },
      });
    });
  });

  describe('remove', () => {
    it('should delete the template successfully', async () => {
      const date = new Date();

      const mockTemplateResponse = {
        id: 'tpl_1',
        title: 'Test Template',
        description: 'Description',
        content: 'Content',
        variables: [],
        createdAt: date,
        updatedAt: date,
      };

      const mockTemplate = {
        id: 'tpl_1',
        creatorId: 'user-db-id-123',
        title: 'Test Template',
        description: 'Description',
        content: 'Content',
        variable: [],
        createdAt: date,
        updatedAt: date,
      };

      jest.spyOn(service, 'findOneById').mockResolvedValue(mockTemplateResponse);
      jest.spyOn(prisma.template, 'delete').mockResolvedValue(mockTemplate);

      await service.remove('tpl_1', 'google-user-1');

      expect(service.findOneById).toHaveBeenCalledWith('tpl_1', 'google-user-1');
      expect(prisma.template.delete).toHaveBeenCalledWith({
        where: { id: 'tpl_1' },
      });
    });
  });
});
