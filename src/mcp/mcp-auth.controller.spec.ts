import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedError } from 'src/common/errors/app.error';
import { McpAuthController } from './mcp-auth.controller';
import { McpAuthService } from './mcp-auth.service';

const mockMcpAuthService = {
  exchangeDeviceCodeForTokens: jest.fn(),
};

describe('McpAuthController', () => {
  let controller: McpAuthController;
  let mcpAuthService: typeof mockMcpAuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [McpAuthController],
      providers: [{ provide: McpAuthService, useValue: mockMcpAuthService }],
    }).compile();

    controller = module.get<McpAuthController>(McpAuthController);
    mcpAuthService = module.get(McpAuthService);
  });

  describe('exchange', () => {
    it('디바이스 코드를 토큰으로 교환해야 한다', async () => {
      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresIn: '1h',
      };

      mcpAuthService.exchangeDeviceCodeForTokens.mockResolvedValue(mockTokens);

      const result = await controller.exchange({ code: 'ABC123' });

      expect(mcpAuthService.exchangeDeviceCodeForTokens).toHaveBeenCalledWith('ABC123');
      expect(result).toEqual(mockTokens);
    });

    it('유효하지 않은 코드일 때 에러를 전파해야 한다', async () => {
      mcpAuthService.exchangeDeviceCodeForTokens.mockRejectedValue(
        new UnauthorizedError('Invalid or expired device code'),
      );

      await expect(controller.exchange({ code: 'INVALID' })).rejects.toThrow(UnauthorizedError);
      await expect(controller.exchange({ code: 'INVALID' })).rejects.toThrow(
        'Invalid or expired device code',
      );
    });

    it('만료된 코드일 때 에러를 전파해야 한다', async () => {
      mcpAuthService.exchangeDeviceCodeForTokens.mockRejectedValue(
        new UnauthorizedError('Device code has expired'),
      );

      await expect(controller.exchange({ code: 'EXPIRED' })).rejects.toThrow(UnauthorizedError);
    });
  });
});
