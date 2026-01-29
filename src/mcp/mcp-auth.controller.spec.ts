import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedError } from 'src/common/errors/app.error';
import { McpAuthController } from './mcp-auth.controller';
import { McpAuthService } from './mcp-auth.service';
import { McpDeviceCodeRepository } from './mcp-device-code.repository';

const mockMcpAuthService = {
  exchangeDeviceCodeForTokens: jest.fn(),
};

const mockMcpDeviceCodeRepository = {
  findValidCode: jest.fn(),
};

describe('McpAuthController', () => {
  let controller: McpAuthController;
  let mcpAuthService: typeof mockMcpAuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [McpAuthController],
      providers: [
        { provide: McpAuthService, useValue: mockMcpAuthService },
        { provide: McpDeviceCodeRepository, useValue: mockMcpDeviceCodeRepository },
      ],
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

  describe('checkCodeStatus', () => {
    it('코드가 아직 사용되지 않았으면 used: false를 반환해야 한다', async () => {
      mockMcpDeviceCodeRepository.findValidCode.mockResolvedValue({
        id: 'code-123',
        code: 'ABC123',
      });

      const result = await controller.checkCodeStatus('ABC123');

      expect(mockMcpDeviceCodeRepository.findValidCode).toHaveBeenCalledWith('ABC123');
      expect(result).toEqual({
        ok: true,
        data: { used: false },
      });
    });

    it('코드가 사용되었거나 만료되었으면 used: true를 반환해야 한다', async () => {
      mockMcpDeviceCodeRepository.findValidCode.mockResolvedValue(null);

      const result = await controller.checkCodeStatus('ABC123');

      expect(result).toEqual({
        ok: true,
        data: { used: true },
      });
    });

    it('소문자 코드를 대문자로 변환해야 한다', async () => {
      mockMcpDeviceCodeRepository.findValidCode.mockResolvedValue(null);

      await controller.checkCodeStatus('abc123');

      expect(mockMcpDeviceCodeRepository.findValidCode).toHaveBeenCalledWith('ABC123');
    });
  });
});
