import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { TokenService } from 'src/auth/token.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { McpAuthService } from './mcp-auth.service';
import { McpServerService } from './mcp-server.service';

interface McpToolResult {
  isError?: boolean;
  content: Array<{ text: string }>;
}

type ToolHandler = (args: Record<string, unknown>) => Promise<McpToolResult>;

// Mock MCP SDK modules
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    registerTool: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/server/sse.js', () => ({
  SSEServerTransport: jest.fn().mockImplementation(() => ({
    sessionId: 'mock-session-123',
    handlePostMessage: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('McpServerService', () => {
  let service: McpServerService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    template: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockMcpAuthService = {
    exchangeDeviceCodeForTokens: jest.fn(),
  };

  const mockTokenService = {
    verifyToken: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('https://www.propt.site'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpServerService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: McpAuthService, useValue: mockMcpAuthService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<McpServerService>(McpServerService);
  });

  describe('handleSseConnection', () => {
    it('SSE 연결을 설정하고 세션을 생성해야 한다', async () => {
      const mockResponse = {
        on: jest.fn(),
      } as unknown as Response;

      await service.handleSseConnection(mockResponse);

      expect(mockResponse.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('연결 종료 시 세션을 정리해야 한다', async () => {
      let closeCallback: () => void;
      const mockResponse = {
        on: jest.fn((event, cb) => {
          if (event === 'close') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            closeCallback = cb;
          }
        }),
      } as unknown as Response;

      await service.handleSseConnection(mockResponse);

      // Trigger close callback
      closeCallback!();

      // Session should be cleaned up (no error thrown)
      expect(mockResponse.on).toHaveBeenCalled();
    });
  });

  describe('handleMessage', () => {
    it('sessionId가 없으면 BadRequestException을 던져야 한다', async () => {
      const mockReq = {} as Request;
      const mockRes = {} as Response;

      await expect(service.handleMessage('', mockReq, mockRes)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.handleMessage('', mockReq, mockRes)).rejects.toThrow(
        'Missing sessionId',
      );
    });

    it('세션이 존재하지 않으면 NotFoundException을 던져야 한다', async () => {
      const mockReq = {} as Request;
      const mockRes = {} as Response;

      await expect(service.handleMessage('non-existent-session', mockReq, mockRes)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.handleMessage('non-existent-session', mockReq, mockRes)).rejects.toThrow(
        'Session not found',
      );
    });
  });

  describe('MCP 도구 동작 테스트 (통합)', () => {
    let registeredTools: Map<string, { config: Record<string, unknown>; handler: ToolHandler }>;

    beforeEach(async () => {
      registeredTools = new Map();

      // Mock McpServer to capture registered tools
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { McpServer } = jest.requireMock('@modelcontextprotocol/sdk/server/mcp.js');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      McpServer.mockImplementation(() => ({
        registerTool: jest.fn(
          (name: string, config: Record<string, unknown>, handler: ToolHandler) => {
            registeredTools.set(name, { config, handler });
          },
        ),
        connect: jest.fn().mockResolvedValue(undefined),
      }));

      // Create a new service instance with mocked McpServer
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          McpServerService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: McpAuthService, useValue: mockMcpAuthService },
          { provide: TokenService, useValue: mockTokenService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<McpServerService>(McpServerService);

      // Trigger tool registration by creating SSE connection
      const mockResponse = {
        on: jest.fn(),
      } as unknown as Response;
      await service.handleSseConnection(mockResponse);
    });

    describe('propt_auth_login', () => {
      it('코드 없이 호출 시 로그인 URL을 안내해야 한다', async () => {
        const tool = registeredTools.get('propt_auth_login');
        expect(tool).toBeDefined();

        const result = await tool!.handler({});

        expect(result.content[0].text).toContain('로그인이 필요합니다');
        expect(result.content[0].text).toContain('https://www.propt.site/login?state=mcp');
      });

      it('유효한 코드로 호출 시 로그인을 완료해야 한다', async () => {
        const tool = registeredTools.get('propt_auth_login');

        mockMcpAuthService.exchangeDeviceCodeForTokens.mockResolvedValue({
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
        });

        mockTokenService.verifyToken.mockReturnValue({
          oauthId: 'user-123',
          oauthProvider: 'google',
        });

        mockPrismaService.user.findFirst.mockResolvedValue({
          id: 'user-db-id',
          name: 'Test User',
        });

        const result = await tool!.handler({ code: 'ABC123' });

        expect(mockMcpAuthService.exchangeDeviceCodeForTokens).toHaveBeenCalledWith('ABC123');
        expect(result.content[0].text).toContain('로그인 성공');
      });

      it('잘못된 코드로 호출 시 에러를 반환해야 한다', async () => {
        const tool = registeredTools.get('propt_auth_login');

        mockMcpAuthService.exchangeDeviceCodeForTokens.mockRejectedValue(new Error('Invalid code'));

        const result = await tool!.handler({ code: 'INVALID' });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('로그인 실패');
      });
    });

    describe('propt_auth_logout', () => {
      it('로그아웃 시 세션을 삭제해야 한다', async () => {
        const tool = registeredTools.get('propt_auth_logout');
        expect(tool).toBeDefined();

        const result = await tool!.handler({});

        expect(result.content[0].text).toContain('로그아웃되었습니다');
      });
    });

    describe('propt_auth_status', () => {
      it('로그인되지 않은 경우 로그인 필요 메시지를 반환해야 한다', async () => {
        const tool = registeredTools.get('propt_auth_status');
        expect(tool).toBeDefined();

        const result = await tool!.handler({});

        expect(result.content[0].text).toContain('로그인되어 있지 않습니다');
      });
    });

    describe('propt_template_list', () => {
      it('로그인되지 않은 경우 에러를 반환해야 한다', async () => {
        const tool = registeredTools.get('propt_template_list');
        expect(tool).toBeDefined();

        const result = await tool!.handler({});

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('로그인이 필요합니다');
      });

      it('템플릿이 없으면 빈 목록 메시지를 반환해야 한다', async () => {
        // First login
        const loginTool = registeredTools.get('propt_auth_login');
        mockMcpAuthService.exchangeDeviceCodeForTokens.mockResolvedValue({
          accessToken: 'test-token',
        });
        mockTokenService.verifyToken.mockReturnValue({
          oauthId: 'user-123',
          oauthProvider: 'google',
        });
        mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-db-id' });
        await loginTool!.handler({ code: 'ABC123' });

        // Then list templates
        const tool = registeredTools.get('propt_template_list');
        mockPrismaService.template.findMany.mockResolvedValue([]);

        const result = await tool!.handler({});

        expect(result.content[0].text).toContain('저장된 템플릿이 없습니다');
      });

      it('템플릿이 있으면 목록을 반환해야 한다', async () => {
        // First login
        const loginTool = registeredTools.get('propt_auth_login');
        mockMcpAuthService.exchangeDeviceCodeForTokens.mockResolvedValue({
          accessToken: 'test-token',
        });
        mockTokenService.verifyToken.mockReturnValue({
          oauthId: 'user-123',
          oauthProvider: 'google',
        });
        mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-db-id' });
        await loginTool!.handler({ code: 'ABC123' });

        // Then list templates
        const tool = registeredTools.get('propt_template_list');
        mockPrismaService.template.findMany.mockResolvedValue([
          { id: 'tpl-1', title: 'Template 1', createdAt: new Date(), updatedAt: new Date() },
          { id: 'tpl-2', title: 'Template 2', createdAt: new Date(), updatedAt: new Date() },
        ]);

        const result = await tool!.handler({});

        expect(result.content[0].text).toContain('템플릿 목록');
        expect(result.content[0].text).toContain('Template 1');
        expect(result.content[0].text).toContain('Template 2');
      });
    });

    describe('propt_get_template', () => {
      it('로그인되지 않은 경우 에러를 반환해야 한다', async () => {
        const tool = registeredTools.get('propt_get_template');
        expect(tool).toBeDefined();

        const result = await tool!.handler({ templateId: 'tpl-1' });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('로그인이 필요합니다');
      });

      it('템플릿이 존재하지 않으면 에러를 반환해야 한다', async () => {
        // First login
        const loginTool = registeredTools.get('propt_auth_login');
        mockMcpAuthService.exchangeDeviceCodeForTokens.mockResolvedValue({
          accessToken: 'test-token',
        });
        mockTokenService.verifyToken.mockReturnValue({
          oauthId: 'user-123',
          oauthProvider: 'google',
        });
        mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-db-id' });
        await loginTool!.handler({ code: 'ABC123' });

        // Then get template
        const tool = registeredTools.get('propt_get_template');
        mockPrismaService.template.findFirst.mockResolvedValue(null);

        const result = await tool!.handler({ templateId: 'non-existent' });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('템플릿을 찾을 수 없거나 접근 권한이 없습니다');
      });

      it('템플릿이 존재하면 상세 정보를 반환해야 한다', async () => {
        // First login
        const loginTool = registeredTools.get('propt_auth_login');
        mockMcpAuthService.exchangeDeviceCodeForTokens.mockResolvedValue({
          accessToken: 'test-token',
        });
        mockTokenService.verifyToken.mockReturnValue({
          oauthId: 'user-123',
          oauthProvider: 'google',
        });
        mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-db-id' });
        await loginTool!.handler({ code: 'ABC123' });

        // Then get template
        const tool = registeredTools.get('propt_get_template');
        mockPrismaService.template.findFirst.mockResolvedValue({
          id: 'tpl-1',
          title: 'My Template',
          content: 'Hello {{name}}!',
        });

        const result = await tool!.handler({ templateId: 'tpl-1' });

        expect(result.content[0].text).toContain('템플릿 상세');
        expect(result.content[0].text).toContain('My Template');
      });
    });

    describe('propt_prepare_batch', () => {
      it('로그인되지 않은 경우 에러를 반환해야 한다', async () => {
        const tool = registeredTools.get('propt_prepare_batch');
        expect(tool).toBeDefined();

        const result = await tool!.handler({
          templateId: 'tpl-1',
          variableSets: [{ name: 'Alice' }],
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('로그인이 필요합니다');
      });

      it('템플릿이 존재하지 않으면 에러를 반환해야 한다', async () => {
        // First login
        const loginTool = registeredTools.get('propt_auth_login');
        mockMcpAuthService.exchangeDeviceCodeForTokens.mockResolvedValue({
          accessToken: 'test-token',
        });
        mockTokenService.verifyToken.mockReturnValue({
          oauthId: 'user-123',
          oauthProvider: 'google',
        });
        mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-db-id' });
        await loginTool!.handler({ code: 'ABC123' });

        // Then prepare batch
        const tool = registeredTools.get('propt_prepare_batch');
        mockPrismaService.template.findFirst.mockResolvedValue(null);

        const result = await tool!.handler({
          templateId: 'non-existent',
          variableSets: [{ name: 'Alice' }],
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('템플릿을 찾을 수 없거나 접근 권한이 없습니다');
      });

      it('배치 준비가 성공하면 프롬프트 목록을 반환해야 한다', async () => {
        // First login
        const loginTool = registeredTools.get('propt_auth_login');
        mockMcpAuthService.exchangeDeviceCodeForTokens.mockResolvedValue({
          accessToken: 'test-token',
        });
        mockTokenService.verifyToken.mockReturnValue({
          oauthId: 'user-123',
          oauthProvider: 'google',
        });
        mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-db-id' });
        await loginTool!.handler({ code: 'ABC123' });

        // Then prepare batch
        const tool = registeredTools.get('propt_prepare_batch');
        mockPrismaService.template.findFirst.mockResolvedValue({
          id: 'tpl-1',
          title: 'Greeting Template',
          content: 'Hello {{name}}! Welcome to {{place}}.',
        });

        const result = await tool!.handler({
          templateId: 'tpl-1',
          variableSets: [
            { name: 'Alice', place: 'Paris' },
            { name: 'Bob', place: 'London' },
          ],
        });

        expect(result.content[0].text).toContain('배치 준비 완료');
        expect(result.content[0].text).toContain('Greeting Template');
        expect(result.content[0].text).toContain('2개');
        expect(result.content[0].text).toContain('Hello Alice! Welcome to Paris.');
        expect(result.content[0].text).toContain('Hello Bob! Welcome to London.');
      });
    });
  });
});
