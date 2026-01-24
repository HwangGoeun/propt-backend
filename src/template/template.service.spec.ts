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

    it('should create template successfully', async () => {
      const date = new Date();

      const mockTemplate = {
        id: 'tpl_new',
        creatorId: 'user-db-id-123',
        title: createDto.title,
        content: createDto.content,
        variables: createDto.variables,
        createdAt: date,
        updatedAt: date,
      };

      jest.spyOn(authService, 'getUserByOAuthId').mockResolvedValue(mockUser);
      jest.spyOn(templateRepository, 'create').mockResolvedValue(mockTemplate);

      const result = await service.create('google-user-1', createDto);

      expect(result.id).toBe('tpl_new');
      expect(result.title).toBe('New Template');
      expect(templateRepository.create).toHaveBeenCalledWith({
        creatorId: 'user-db-id-123',
        title: createDto.title,
        content: createDto.content,
        variables: createDto.variables,
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
          createdAt: date,
          updatedAt: date,
        },
        {
          id: 'template_2',
          title: 'template_2',
          creatorId: 'user-db-id-123',
          content: 'Content 2',
          variables: [],
          createdAt: date,
          updatedAt: date,
        },
      ];

      jest.spyOn(authService, 'getUserByOAuthId').mockResolvedValue(mockUser);
      jest.spyOn(templateRepository, 'findAllByUserId').mockResolvedValue(mockTemplates);

      const result = await service.findAllByUserId('google-user-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('template_1');
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
      expect(templateRepository.update).toHaveBeenCalledWith('tpl_1', {
        title: 'Updated Title',
        content: 'Updated Content',
        variables: updateDto.variables,
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
