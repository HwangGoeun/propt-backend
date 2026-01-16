import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';

describe('TemplateController', () => {
  let controller: TemplateController;
  let service: TemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplateController],
      providers: [
        {
          provide: TemplateService,
          useValue: {
            findAllByUserId: jest.fn(),
            findOneById: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest<{ user: JwtUser }>();
          request.user = { userId: 'test-user-id', provider: 'google' };

          return true;
        },
      })
      .compile();

    controller = module.get<TemplateController>(TemplateController);
    service = module.get<TemplateService>(TemplateService);
  });

  describe('findAll', () => {
    it('should return an arrya of templates', async () => {
      const date = new Date();

      const mockTemplates = [
        {
          id: 'template-1',
          title: 'Test Template',
          description: 'Test Description',
          content: 'Test Content',
          variables: [],
          createdAt: date,
          updatedAt: date,
        },
      ];

      jest.spyOn(service, 'findAllByUserId').mockResolvedValue(mockTemplates);

      const result = await controller.findAll('test-user-id');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('variables');
      expect(service.findAllByUserId).toHaveBeenCalledWith('test-user-id');
    });
  });

  describe('findOne', () => {
    it('should return a single template', async () => {
      const date = new Date();

      const mockTemplate = {
        id: 'test-id',
        title: 'Test Template',
        description: 'Test Description',
        content: 'Test Content',
        variables: [],
        createdAt: date,
        updatedAt: date,
      };

      jest.spyOn(service, 'findOneById').mockResolvedValue(mockTemplate);

      const result = await controller.findOne('test-user-id', { id: 'test-id' });

      expect(result).toEqual(mockTemplate);
      expect(service.findOneById).toHaveBeenCalledWith('test-id', 'test-user-id');
    });
  });

  describe('update', () => {
    it('should call service.update with correct parameters', async () => {
      const date = new Date();

      const updateDto = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      const mockResponse = {
        id: 'test-id',
        title: 'Updated Title',
        description: 'Updated Description',
        content: 'Original Content',
        variables: [],
        createdAt: date,
        updatedAt: date,
      };

      jest.spyOn(service, 'update').mockResolvedValue(mockResponse);

      const result = await controller.update('test-user-id', { id: 'test-id' }, updateDto);

      expect(result).toEqual(mockResponse);
      expect(service.update).toHaveBeenCalledWith('test-id', 'test-user-id', updateDto);
    });
  });

  describe('remove', () => {
    it('should call service.remove with correct parameters', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue();

      const result = await controller.remove('test-user-id', { id: 'test-id' });

      expect(service.remove).toHaveBeenCalledWith('test-id', 'test-user-id');
      expect(result).toBe(undefined);
    });
  });
});
