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
    it('should return a single template', () => {
      const result = controller.findOne('test-user-id', { id: 'test-id' });

      expect(result).toHaveProperty('id', 'test-id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('variables');
    });
  });
});
