import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { McpServerService } from './mcp-server.service';
import { McpSseController } from './mcp-sse.controller';

const mockMcpServerService = {
  handleSseConnection: jest.fn(),
  handleMessage: jest.fn(),
};

describe('McpSseController', () => {
  let controller: McpSseController;
  let mcpServerService: typeof mockMcpServerService;

  const createMockResponse = () =>
    ({
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
    }) as unknown as Response;

  const createMockRequest = () =>
    ({
      body: {},
      headers: {},
    }) as unknown as Request;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [McpSseController],
      providers: [{ provide: McpServerService, useValue: mockMcpServerService }],
    }).compile();

    controller = module.get<McpSseController>(McpSseController);
    mcpServerService = module.get(McpServerService);
  });

  describe('handleSse', () => {
    it('mcpServerService.handleSseConnection을 호출해야 한다', async () => {
      const mockResponse = createMockResponse();

      mockMcpServerService.handleSseConnection.mockResolvedValue(undefined);

      await controller.handleSse(mockResponse);

      expect(mcpServerService.handleSseConnection).toHaveBeenCalledWith(mockResponse);
      expect(mcpServerService.handleSseConnection).toHaveBeenCalledTimes(1);
    });

    it('서비스 에러를 전파해야 한다', async () => {
      const mockResponse = createMockResponse();
      const error = new Error('SSE connection failed');

      mockMcpServerService.handleSseConnection.mockRejectedValue(error);

      await expect(controller.handleSse(mockResponse)).rejects.toThrow('SSE connection failed');
    });
  });

  describe('handleMessages', () => {
    it('mcpServerService.handleMessage를 sessionId, req, res와 함께 호출해야 한다', async () => {
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();
      const sessionId = 'session-123';

      mockMcpServerService.handleMessage.mockResolvedValue(undefined);

      await controller.handleMessages(sessionId, mockRequest, mockResponse);

      expect(mcpServerService.handleMessage).toHaveBeenCalledWith(
        sessionId,
        mockRequest,
        mockResponse,
      );
      expect(mcpServerService.handleMessage).toHaveBeenCalledTimes(1);
    });

    it('서비스 에러를 전파해야 한다', async () => {
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();
      const error = new Error('Message handling failed');

      mockMcpServerService.handleMessage.mockRejectedValue(error);

      await expect(
        controller.handleMessages('session-123', mockRequest, mockResponse),
      ).rejects.toThrow('Message handling failed');
    });

    it('빈 sessionId도 처리해야 한다', async () => {
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      mockMcpServerService.handleMessage.mockResolvedValue(undefined);

      await controller.handleMessages('', mockRequest, mockResponse);

      expect(mcpServerService.handleMessage).toHaveBeenCalledWith('', mockRequest, mockResponse);
    });
  });
});
