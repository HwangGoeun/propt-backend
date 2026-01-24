import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { TokenService } from 'src/auth/token.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Readable } from 'stream';
import { z } from 'zod';
import { McpAuthService } from './mcp-auth.service';

interface SessionAuth {
  oderId?: string;
  accessToken?: string;
}

interface GlobalAuth {
  accessToken: string;
  expiresAt: Date;
}

@Injectable()
export class McpServerService {
  private readonly logger = new Logger(McpServerService.name);
  private readonly transports = new Map<string, SSEServerTransport>();
  private readonly sessions = new Map<string, SessionAuth>();
  // 전역 인증 토큰 저장소 (userId -> token) - 세션 간 유지
  private readonly globalAuthTokens = new Map<string, GlobalAuth>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mcpAuthService: McpAuthService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 세션에 대한 인증된 사용자 ID 조회
   * 1. 먼저 현재 세션에서 토큰 확인
   * 2. 없으면 전역 토큰 저장소에서 최근 로그인 확인
   */
  private async getAuthenticatedUserId(sessionId: string): Promise<string | null> {
    // 1. 현재 세션에서 확인
    const session = this.sessions.get(sessionId);
    if (session?.accessToken) {
      try {
        const payload = this.tokenService.verifyToken(session.accessToken);
        const user = await this.prisma.user.findFirst({
          where: {
            oauthId: payload.oauthId,
            oauthProvider: payload.oauthProvider,
          },
        });
        if (user) return user.id;
      } catch {
        this.sessions.delete(sessionId);
      }
    }

    // 2. 전역 토큰 저장소에서 유효한 토큰 찾기
    const now = new Date();
    for (const [userId, auth] of this.globalAuthTokens.entries()) {
      if (auth.expiresAt > now) {
        try {
          this.tokenService.verifyToken(auth.accessToken);
          this.logger.log(`Found valid global auth for user: ${userId}`);
          return userId;
        } catch {
          this.globalAuthTokens.delete(userId);
        }
      } else {
        this.globalAuthTokens.delete(userId);
      }
    }

    return null;
  }

  /**
   * 전역 토큰 저장소에 토큰 저장
   */
  private async saveGlobalAuth(accessToken: string): Promise<string | null> {
    try {
      const payload = this.tokenService.verifyToken(accessToken);
      const user = await this.prisma.user.findFirst({
        where: {
          oauthId: payload.oauthId,
          oauthProvider: payload.oauthProvider,
        },
      });

      if (user) {
        // 30분 후 만료
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        this.globalAuthTokens.set(user.id, { accessToken, expiresAt });
        this.logger.log(
          `Saved global auth for user: ${user.id}, expires: ${expiresAt.toISOString()}`,
        );
        return user.id;
      }
    } catch (error) {
      this.logger.error('Failed to save global auth', error);
    }
    return null;
  }

  /**
   * 등록된 도구들로 새로운 MCP 서버 인스턴스 생성
   */
  private createMcpServer(sessionId: string): McpServer {
    const server = new McpServer({
      name: 'propt-mcp',
      version: '0.1.0',
    });

    this.registerTools(server, sessionId);

    return server;
  }

  /**
   * 모든 MCP 도구 등록
   */
  private registerTools(server: McpServer, sessionId: string): void {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://www.propt.site';

    // 로그인
    server.registerTool(
      'propt_auth_login',
      {
        title: 'Propt: Login',
        description:
          '프롬프트에 로그인합니다. 코드 없이 실행하면 로그인 URL을 안내하고, 코드와 함께 실행하면 로그인을 완료합니다.',
        inputSchema: {
          code: z
            .string()
            .length(6)
            .optional()
            .describe('브라우저 로그인 후 받은 6자리 코드 (선택)'),
        },
      },
      async (input) => {
        try {
          if (!input.code) {
            // Step 1: Guide user to login
            const loginUrl = `${frontendUrl}/login?state=mcp`;
            return {
              content: [
                {
                  type: 'text',
                  text: `🔐 로그인이 필요합니다.

1. 아래 URL을 브라우저에서 여세요:
   ${loginUrl}

2. Google 로그인 완료 후 표시되는 6자리 코드를 복사하세요.

3. 이 도구를 다시 실행하고 code 파라미터에 코드를 입력하세요.
   예: propt_auth_login(code: "ABC123")`,
                },
              ],
            };
          }

          // Step 2: Exchange code for token
          const tokens = await this.mcpAuthService.exchangeDeviceCodeForTokens(input.code);

          // Store auth in session
          this.sessions.set(sessionId, {
            accessToken: tokens.accessToken,
          });

          // 전역 토큰 저장소에도 저장 (세션 간 유지)
          await this.saveGlobalAuth(tokens.accessToken);

          return {
            content: [
              {
                type: 'text',
                text: '✅ 로그인 성공! 이제 템플릿을 조회할 수 있습니다.',
              },
            ],
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `로그인 실패: ${error instanceof Error ? error.message : '유효하지 않거나 만료된 코드입니다.'}`,
              },
            ],
          };
        }
      },
    );

    // 로그아웃
    server.registerTool(
      'propt_auth_logout',
      {
        title: 'Propt: Logout',
        description: '프롬프트 서비스에서 로그아웃합니다.',
        inputSchema: {},
      },
      async () => {
        // 전역 토큰 저장소에서도 삭제
        const userId = await this.getAuthenticatedUserId(sessionId);
        if (userId) {
          this.globalAuthTokens.delete(userId);
        }
        this.sessions.delete(sessionId);
        return {
          content: [
            {
              type: 'text',
              text: '로그아웃되었습니다.',
            },
          ],
        };
      },
    );

    // 로그인 상태 확인
    server.registerTool(
      'propt_auth_status',
      {
        title: 'Propt: Auth Status',
        description: '현재 로그인 상태를 확인합니다.',
        inputSchema: {},
      },
      async () => {
        const userId = await this.getAuthenticatedUserId(sessionId);
        if (userId) {
          const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
          });
          return {
            content: [
              {
                type: 'text',
                text: `✅ 로그인됨: ${user?.name || user?.email || '사용자'}`,
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: '❌ 로그인되어 있지 않습니다. propt_auth_login을 실행해주세요.',
            },
          ],
        };
      },
    );

    // 템플릿 목록 조회
    server.registerTool(
      'propt_template_list',
      {
        title: 'List Templates',
        description: `저장된 프롬프트 템플릿 목록을 조회합니다. (로그인 필요)

⚠️ 중요: 템플릿 목록은 사용자가 언제든 추가/삭제/수정할 수 있습니다.
템플릿을 사용하기 전에 반드시 이 도구를 호출하여 최신 목록을 확인하세요.
이전에 조회한 결과를 재사용하지 마세요.`,
        inputSchema: {},
      },
      async () => {
        const userId = await this.getAuthenticatedUserId(sessionId);

        if (!userId) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: '❌ 로그인이 필요합니다. propt_auth_login을 먼저 실행해주세요.',
              },
            ],
          };
        }

        try {
          const templates = await this.prisma.template.findMany({
            where: { creatorId: userId },
            select: {
              id: true,
              title: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
          });

          if (templates.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: '저장된 템플릿이 없습니다.',
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: `📋 템플릿 목록 (조회 시점: ${new Date().toISOString()})

${JSON.stringify(templates, null, 2)}

---
⚠️ 이 목록은 조회 시점의 데이터입니다.
다음 요청 시 반드시 다시 조회하세요.`,
              },
            ],
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `에러 발생: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }
      },
    );

    // 템플릿 상세 조회
    server.registerTool(
      'propt_get_template',
      {
        title: 'Get Template',
        description: `특정 템플릿의 상세 정보(내용, 변수)를 조회합니다. (로그인 필요)

⚠️ 중요: 템플릿 내용은 사용자가 언제든 수정할 수 있습니다.
템플릿을 실행할 때마다 반드시 이 도구를 호출하여 최신 데이터를 가져오세요.
이전에 조회한 결과를 절대 재사용하지 마세요.
같은 템플릿이라도 매번 새로 조회해야 합니다.`,
        inputSchema: {
          templateId: z.string().describe('템플릿 ID'),
        },
      },
      async (input) => {
        const userId = await this.getAuthenticatedUserId(sessionId);

        if (!userId) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: '❌ 로그인이 필요합니다. propt_auth_login을 먼저 실행해주세요.',
              },
            ],
          };
        }

        try {
          const template = await this.prisma.template.findFirst({
            where: {
              id: input.templateId,
              creatorId: userId,
            },
          });

          if (!template) {
            return {
              isError: true,
              content: [{ type: 'text', text: '템플릿을 찾을 수 없거나 접근 권한이 없습니다.' }],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: `📄 템플릿 상세 (조회 시점: ${new Date().toISOString()})

${JSON.stringify(template, null, 2)}

---
⚠️ 이 데이터는 조회 시점의 내용입니다.
같은 템플릿이라도 다음 실행 시 반드시 다시 조회하세요.
사용자가 웹에서 내용을 수정했을 수 있습니다.`,
              },
            ],
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `에러: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }
      },
    );

    // 배치 실행 준비
    server.registerTool(
      'propt_prepare_batch',
      {
        title: 'Prepare Batch Execution',
        description: `배치 실행을 준비합니다. 템플릿과 변수 세트를 받아 실행할 프롬프트들을 생성합니다. (로그인 필요)

⚠️ 중요: 이 도구는 실행할 때마다 최신 템플릿 데이터를 조회합니다.
이전에 준비한 배치 결과를 재사용하지 마세요.`,
        inputSchema: {
          templateId: z.string().describe('템플릿 ID'),
          variableSets: z
            .array(z.record(z.string(), z.string()))
            .describe('변수 세트 배열. 예: [{ "name": "사과", "aspect": "장점" }, ...]'),
        },
      },
      async (input) => {
        const userId = await this.getAuthenticatedUserId(sessionId);

        if (!userId) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: '❌ 로그인이 필요합니다. propt_auth_login을 먼저 실행해주세요.',
              },
            ],
          };
        }

        try {
          const template = await this.prisma.template.findFirst({
            where: {
              id: input.templateId,
              creatorId: userId,
            },
          });

          if (!template) {
            return {
              isError: true,
              content: [{ type: 'text', text: '템플릿을 찾을 수 없거나 접근 권한이 없습니다.' }],
            };
          }

          // Generate prompts from template and variable sets
          const prompts = input.variableSets.map((vars, index) => {
            let content = template.content;
            for (const [key, value] of Object.entries(vars)) {
              content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
            }
            return { index: index + 1, prompt: content };
          });

          const guide = `
## 배치 실행 준비 완료

**템플릿:** ${template.title}
**총 프롬프트 수:** ${prompts.length}개

### 실행할 프롬프트:
${prompts.map((p) => `\n---\n**[${p.index}/${prompts.length}]**\n${p.prompt}`).join('\n')}

---
위 프롬프트들을 순차적으로 실행해주세요.
`;

          return {
            content: [
              {
                type: 'text',
                text: `📦 배치 준비 완료 (조회 시점: ${new Date().toISOString()})\n${guide}\n---\n⚠️ 이 배치 데이터는 조회 시점의 템플릿 내용 기준입니다.\n다음 배치 실행 시 반드시 다시 이 도구를 호출하세요.`,
              },
            ],
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `에러: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }
      },
    );
  }

  /**
   * SSE 연결 처리
   */
  async handleSseConnection(res: Response): Promise<void> {
    this.logger.log('New SSE connection request');

    const transport = new SSEServerTransport('/mcp/messages', res);
    const server = this.createMcpServer(transport.sessionId);

    this.transports.set(transport.sessionId, transport);
    this.sessions.set(transport.sessionId, {}); // Initialize empty session
    this.logger.log(`SSE connection established: ${transport.sessionId}`);

    res.on('close', () => {
      this.logger.log(`SSE connection closed: ${transport.sessionId}`);
      this.transports.delete(transport.sessionId);
      this.sessions.delete(transport.sessionId);
    });

    await server.connect(transport);
  }

  /**
   * 수신 메시지 처리
   */
  async handleMessage(sessionId: string, req: Request, res: Response): Promise<void> {
    if (!sessionId) {
      throw new BadRequestException('Missing sessionId');
    }

    const transport = this.transports.get(sessionId);

    if (!transport) {
      throw new NotFoundException('Session not found');
    }

    // Create a new request object with readable body stream
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const rawBody = (req as any).rawBody;
    if (rawBody) {
      const readable = Readable.from([rawBody]);
      const modifiedReq = Object.assign(readable, {
        headers: req.headers,
        method: req.method,
        url: req.url,
      }) as unknown as Request;

      await transport.handlePostMessage(modifiedReq, res);
    } else {
      await transport.handlePostMessage(req, res);
    }
  }
}
