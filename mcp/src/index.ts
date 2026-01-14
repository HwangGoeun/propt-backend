import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { authLogin, authLogout } from './tools/auth.tool.js';
import { executeBatch } from './tools/batch.tool.js';
import { listTemplates } from './tools/templates.tool.js';

const server = new McpServer({
  name: 'propt-mcp',
  version: '0.0.1',
});

// 통합 로그인 툴
server.registerTool(
  'propt_auth_login',
  {
    title: 'Propt: Login',
    description:
      '프로프트에 로그인합니다. 코드 없이 실행하면 로그인 URL을 안내하고, 코드와 함께 실행하면 로그인을 완료합니다.',
    inputSchema: {
      code: z.string().length(6).optional().describe('브라우저 로그인 후 받은 6자리 코드 (선택)'),
    },
  },
  async (input) => {
    try {
      const result = await authLogin(input.code);

      return {
        content: [{ type: 'text', text: result.message }],
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

// 로그아웃
server.registerTool(
  'propt_auth_logout',
  {
    title: 'Propt: Logout',
    description: '프로프트 서비스에서 로그아웃 합니다.',
    inputSchema: {},
  },
  async () => {
    try {
      const result = await authLogout();

      return {
        content: [{ type: 'text', text: result.message }],
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

// 템플릿 목록 조회
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

server.registerTool(
  'propt_batch_execute',
  {
    title: 'Batch Execute Template',
    description: '하나의 템플릿에 여러 변수 세트를 적용하여 배치 프롬프트를 생성합니다.',
    inputSchema: {
      templateId: z.string().describe('실행할 템플릿의 ID'),
      variableSets: z
        .array(z.record(z.string(), z.string()))
        .describe(
          '적용할 변수 세트 배열 (예: [{ 과일: "바나나", 언어: "영어" }, { 과일: "사과", 언어: "영어" }])',
        ),
    },
  },
  async (input) => {
    try {
      const result = await executeBatch(input.templateId, input.variableSets);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
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
