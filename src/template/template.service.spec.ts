import { Test, TestingModule } from '@nestjs/testing';
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
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
    prisma = module.get<PrismaService>(PrismaService);
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
});
