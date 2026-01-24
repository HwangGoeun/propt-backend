import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../common/errors/app.error';
import { TemplateRepository } from './template.repository';
import { TemplateService } from './template.service';

describe('TemplateService', () => {
  let service: TemplateService;
  let templateRepository: TemplateRepository;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        {
          provide: AuthService,
          useValue: {
            getUserByOAuthId: jest.fn(),
          },
        },
        {
          provide: TemplateRepository,
          useValue: {
            create: jest.fn(),
            findAllByUserId: jest.fn(),
            findOneById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
    templateRepository = module.get<TemplateRepository>(TemplateRepository);
    authService = module.get<AuthService>(AuthService);
  });

  describe('create', () => {
    const date = new Date();

    const mockUser = {
      id: 'user-db-id-123',
      oauthId: 'google-user-1',
      oauthProvider: 'google',
      email: 'test@example.com',
      name: 'Test User',
      refreshToken: null,
      createdAt: date,
      updatedAt: date,
    };

    const createDto = {
      title: 'New Template',
      content: 'Content with {variable}',
      variables: [{ name: 'variable', type: 'text' as const }],
    };

    const createDtoWithOutputType = {
      title: 'New Template with Output Type',
      content: 'Content with {variable}',
      variables: [{ name: 'variable', type: 'text' as const }],
      outputType: 'markdown',
    };

    it('outputType 없이 템플릿을 성공적으로 생성해야 한다', async () => {
      const date = new Date();

      const mockTemplate = {
        id: 'tpl_new',
        creatorId: 'user-db-id-123',
        title: createDto.title,
        content: createDto.content,
        variables: createDto.variables,
        outputType: null,
        createdAt: date,
        updatedAt: date,
      };

      jest.spyOn(authService, 'getUserByOAuthId').mockResolvedValue(mockUser);
      jest.spyOn(templateRepository, 'create').mockResolvedValue(mockTemplate);

      const result = await service.create('google-user-1', createDto);

      expect(result.id).toBe('tpl_new');
      expect(result.title).toBe('New Template');
      expect(result.outputType).toBeNull();
      expect(templateRepository.create).toHaveBeenCalledWith({
        creatorId: 'user-db-id-123',
        title: createDto.title,
        content: createDto.content,
        variables: createDto.variables,
        outputType: null,
      });
    });

    it('outputType과 함께 템플릿을 성공적으로 생성해야 한다', async () => {
      const date = new Date();

      const mockTemplate = {
        id: 'tpl_new',
        creatorId: 'user-db-id-123',
        title: createDtoWithOutputType.title,
        content: createDtoWithOutputType.content,
        variables: createDtoWithOutputType.variables,
        outputType: 'markdown',
        createdAt: date,
        updatedAt: date,
      };

      jest.spyOn(authService, 'getUserByOAuthId').mockResolvedValue(mockUser);
      jest.spyOn(templateRepository, 'create').mockResolvedValue(mockTemplate);

      const result = await service.create('google-user-1', createDtoWithOutputType);

      expect(result.id).toBe('tpl_new');
      expect(result.outputType).toBe('markdown');
      expect(templateRepository.create).toHaveBeenCalledWith({
        creatorId: 'user-db-id-123',
        title: createDtoWithOutputType.title,
        content: createDtoWithOutputType.content,
        variables: createDtoWithOutputType.variables,
        outputType: 'markdown',
      });
    });

    it('should throw UnauthorizedError when user not found', async () => {
      jest.spyOn(authService, 'getUserByOAuthId').mockRejectedValue(new UnauthorizedError(''));

      await expect(service.create('non-existent', createDto)).rejects.toThrow(UnauthorizedError);

      expect(templateRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictError on duplicate title', async () => {
      jest.spyOn(authService, 'getUserByOAuthId').mockResolvedValue(mockUser);
      jest.spyOn(templateRepository, 'create').mockRejectedValue(new ConflictError(''));

      await expect(service.create('google-user-1', createDto)).rejects.toThrow(ConflictError);
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
        refreshToken: null,
        createdAt: date,
        updatedAt: date,
      };

      const mockTemplates = [
        {
          id: 'template_1',
          title: 'template_1',
          creatorId: 'user-db-id-123',
          content: 'Content 1',
          variables: [
            {
              name: 'keyword',
              type: 'test',
            },
          ] as Prisma.JsonValue[],
          outputType: null,
          createdAt: date,
          updatedAt: date,
        },
        {
          id: 'template_2',
          title: 'template_2',
          creatorId: 'user-db-id-123',
          content: 'Content 2',
          variables: [],
          outputType: 'json',
          createdAt: date,
          updatedAt: date,
        },
      ];

      jest.spyOn(authService, 'getUserByOAuthId').mockResolvedValue(mockUser);
      jest.spyOn(templateRepository, 'findAllByUserId').mockResolvedValue(mockTemplates);

      const result = await service.findAllByUserId('google-user-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('template_1');
      expect(result[0]).toHaveProperty('variables');
      expect(Array.isArray(result[0].variables)).toBe(true);
      expect(result[0].outputType).toBeNull();
      expect(result[1].id).toBe('template_2');
      expect(result[1].outputType).toBe('json');
      expect(templateRepository.findAllByUserId).toHaveBeenCalledWith('user-db-id-123');
    });

    it('should return empty array if user has no templates', async () => {
      const date = new Date();

      const mockUser = {
        id: 'user-db-id-123',
        oauthId: 'google-user-1',
        oauthProvider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        refreshToken: null,
        createdAt: date,
        updatedAt: date,
      };

      jest.spyOn(authService, 'getUserByOAuthId').mockResolvedValue(mockUser);
      jest.spyOn(templateRepository, 'findAllByUserId').mockResolvedValue([]);

      const result = await service.findAllByUserId('google-user-1');

      expect(result).toHaveLength(0);
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
        refreshToken: null,
        createdAt: date,
        updatedAt: date,
      };

      const mockTemplate = {
        id: 'tpl_1',
        creatorId: 'user-db-id-123',
        title: 'Test Template',
        content: 'Content',
        variables: [],
        outputType: null,
        createdAt: date,
        updatedAt: date,
      };

      jest.spyOn(authService, 'getUserByOAuthId').mockResolvedValue(mockUser);
      jest.spyOn(templateRepository, 'findOneById').mockResolvedValue(mockTemplate);

      const result = await service.findOneById('tpl_1', 'google-user-1');

      expect(result.id).toBe('tpl_1');
    });

    it('should throw NotFoundError if template does not exist', async () => {
      const date = new Date();
      const mockUser = {
        id: 'user-db-id-123',
        oauthId: 'google-user-1',
        oauthProvider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        refreshToken: null,
        createdAt: date,
        updatedAt: date,
      };

      jest.spyOn(authService, 'getUserByOAuthId').mockResolvedValue(mockUser);
      jest.spyOn(templateRepository, 'findOneById').mockResolvedValue(null);

      await expect(service.findOneById('tpl_999', 'google-user-1')).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user is not owner', async () => {
      const date = new Date();
      const mockUser = {
        id: 'user-db-id-123',
        oauthId: 'google-user-1',
        oauthProvider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        refreshToken: null,
        createdAt: date,
        updatedAt: date,
      };

      const mockTemplate = {
        id: 'tpl_1',
        creatorId: 'user-db-id-456',
        title: 'Test Template',
        content: 'Content',
        variables: [],
        outputType: null,
        createdAt: date,
        updatedAt: date,
      };

      jest.spyOn(authService, 'getUserByOAuthId').mockResolvedValue(mockUser);
      jest.spyOn(templateRepository, 'findOneById').mockResolvedValue(mockTemplate);

      await expect(service.findOneById('tpl_1', 'google-user-1')).rejects.toThrow(ForbiddenError);
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
      refreshToken: null,
      createdAt: date,
      updatedAt: date,
    };

    const mockTemplate = {
      id: 'tpl_1',
      creatorId: 'user-db-id-123',
      title: 'Original Title',
      content: 'Original Content',
      variables: [{ name: 'var1', type: 'text' }],
      outputType: null,
      createdAt: date,
      updatedAt: date,
    };

    it('should update template successfully', async () => {
      const updateDto = {
        title: 'Updated Title',
        content: 'Updated Content',
        variables: [{ name: 'var2', type: 'text' as const }],
      };

      const updatedTemplate = {
        ...mockTemplate,
        title: updateDto.title,
        content: updateDto.content,
        variables: updateDto.variables,
        updatedAt: new Date(),
      };

      jest.spyOn(authService, 'getUserByOAuthId').mockResolvedValue(mockUser);
      jest.spyOn(templateRepository, 'findOneById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateRepository, 'update').mockResolvedValue(updatedTemplate);

      const result = await service.update('tpl_1', 'google-user-1', updateDto);

      expect(result.id).toBe('tpl_1');
      expect(result.title).toBe('Updated Title');
      expect(result.content).toBe('Updated Content');
      expect(templateRepository.update).toHaveBeenCalledWith('tpl_1', {
        title: 'Updated Title',
        content: 'Updated Content',
        variables: updateDto.variables,
      });
    });

    it('outputType을 정상적으로 업데이트해야 한다', async () => {
      // 1. 문자열 값으로 업데이트
      const updateDtoWithValue = { outputType: 'table' };
      const updatedTemplateWithValue = {
        ...mockTemplate,
        outputType: 'table',
        updatedAt: new Date(),
      };

      jest.spyOn(authService, 'getUserByOAuthId').mockResolvedValue(mockUser);
      jest.spyOn(templateRepository, 'findOneById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateRepository, 'update').mockResolvedValue(updatedTemplateWithValue);

      const result1 = await service.update('tpl_1', 'google-user-1', updateDtoWithValue);

      expect(result1.outputType).toBe('table');
      expect(templateRepository.update).toHaveBeenCalledWith('tpl_1', {
        outputType: 'table',
      });

      // 2. null로 업데이트
      const mockTemplateWithOutputType = { ...mockTemplate, outputType: 'markdown' };
      const updatedTemplateWithNull = {
        ...mockTemplateWithOutputType,
        outputType: null,
        updatedAt: new Date(),
      };

      jest.spyOn(templateRepository, 'findOneById').mockResolvedValue(mockTemplateWithOutputType);
      jest.spyOn(templateRepository, 'update').mockResolvedValue(updatedTemplateWithNull);

      const result2 = await service.update('tpl_1', 'google-user-1', { outputType: null });

      expect(result2.outputType).toBeNull();
      expect(templateRepository.update).toHaveBeenCalledWith('tpl_1', {
        outputType: null,
      });
    });

    it('should throw UnauthorizedError if user not found', async () => {
      jest.spyOn(authService, 'getUserByOAuthId').mockRejectedValue(new UnauthorizedError(''));

      await expect(service.update('tpl_1', 'non-existent', { title: 'New Title' })).rejects.toThrow(
        UnauthorizedError,
      );

      expect(templateRepository.findOneById).not.toHaveBeenCalled();
      expect(templateRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if template not found', async () => {
      jest.spyOn(authService, 'getUserByOAuthId').mockResolvedValue(mockUser);
      jest.spyOn(templateRepository, 'findOneById').mockResolvedValue(null);

      await expect(
        service.update('tpl_999', 'google-user-1', { title: 'New Title' }),
      ).rejects.toThrow(NotFoundError);

      expect(templateRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError if user is not owner', async () => {
      const otherUserTemplate = {
        ...mockTemplate,
        creatorId: 'other-user-id',
      };

      jest.spyOn(authService, 'getUserByOAuthId').mockResolvedValue(mockUser);
      jest.spyOn(templateRepository, 'findOneById').mockResolvedValue(otherUserTemplate);

      await expect(
        service.update('tpl_1', 'google-user-1', { title: 'New Title' }),
      ).rejects.toThrow(ForbiddenError);

      expect(templateRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictError on duplicate title (P2002)', async () => {
      jest.spyOn(authService, 'getUserByOAuthId').mockResolvedValue(mockUser);
      jest.spyOn(templateRepository, 'findOneById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateRepository, 'update').mockRejectedValue(new ConflictError(''));

      await expect(
        service.update('tpl_1', 'google-user-1', { title: 'Duplicate Title' }),
      ).rejects.toThrow(ConflictError);
    });

    it('should update only title when partial update', async () => {
      const partialUpdateDto = { title: 'Only Title Updated' };

      const partiallyUpdatedTemplate = {
        ...mockTemplate,
        title: partialUpdateDto.title,
        updatedAt: new Date(),
      };

      jest.spyOn(authService, 'getUserByOAuthId').mockResolvedValue(mockUser);
      jest.spyOn(templateRepository, 'findOneById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateRepository, 'update').mockResolvedValue(partiallyUpdatedTemplate);

      const result = await service.update('tpl_1', 'google-user-1', partialUpdateDto);

      expect(result.title).toBe('Only Title Updated');
      expect(templateRepository.update).toHaveBeenCalledWith('tpl_1', {
        title: 'Only Title Updated',
      });
    });
  });

  describe('remove', () => {
    it('should delete the template successfully', async () => {
      const date = new Date();

      const mockTemplate = {
        id: 'tpl_1',
        creatorId: 'user-db-id-123',
        title: 'Test Template',
        content: 'Content',
        variables: [],
        outputType: null,
        createdAt: date,
        updatedAt: date,
      };

      const mockUser = {
        id: 'user-db-id-123',
        oauthId: 'google-user-1',
        oauthProvider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        refreshToken: null,
        createdAt: date,
        updatedAt: date,
      };

      jest.spyOn(authService, 'getUserByOAuthId').mockResolvedValue(mockUser);
      jest.spyOn(templateRepository, 'findOneById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateRepository, 'delete').mockResolvedValue(undefined);

      await service.remove('tpl_1', 'google-user-1');

      expect(templateRepository.delete).toHaveBeenCalledWith('tpl_1');
    });
  });
});
