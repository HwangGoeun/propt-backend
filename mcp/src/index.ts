import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { authLogout, authSetTokens } from './tools/auth.tool.js';
import { listTemplates } from './tools/templates.tool.js';

const server = new McpServer({
  name: 'propt-mcp',
  version: '0.0.1',
});

// TODO: 임시 툴. MCP 로그인 기능 구현 시 삭제 예정
server.registerTool(
  'propt_auth_set_tokens',
  {
    title: 'Auth: Set Tokens',
    description: 'Access/Refresh 토큰을 저장합니다 (개발 / 1단계용)',
    inputSchema: {
      accessToken: z.string().min(1),
      refreshToken: z.string().min(1),
    },
  },
  (input) => {
    try {
      authSetTokens(input);

      return {
        content: [
          {
            type: 'text',
            text: '토큰이 저장되었습니다. Propt를 자유롭게 이용해보세요!',
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

server.registerTool(
  'propt_auth_logout',
  {
    title: 'Propt: Logout',
    description: '프로프트 서비스에서 로그아웃 합니다.',
    inputSchema: {},
  },
  () => {
    try {
      authLogout();

      return {
        content: [{ type: 'text', text: '로그아웃이 완료되었습니다. 다음에 다시 만나요!' }],
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

server.registerTool(
  'propt_template_list',
  {
    title: 'List Templates',
    description: '프로프트를 통해 저장한 템플릿 목록을 조회합니다.',
    inputSchema: {},
  },
  async () => {
    try {
      const templates = await listTemplates();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(templates, null, 2),
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

console.error('Propt MCP Server is running!');
const transport = new StdioServerTransport();
await server.connect(transport);
