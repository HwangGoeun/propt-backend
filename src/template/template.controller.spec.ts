import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';

describe('TemplateController', () => {
  let controller: TemplateController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplateController],
      providers: [TemplateService],
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
  });

  describe('findAll', () => {
    it('should return an arrya of templates', () => {
      const result = controller.findAll('test-user-id');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('variables');
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
