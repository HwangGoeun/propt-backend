#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { authLogin, authLogout } from './tools/auth.tool.js';
import { getTemplateById } from './tools/get-template.tool.js';
import { getOutputTypeInstruction } from './tools/messages/batch-messages.js';
import { prepareBatch } from './tools/prepare-batch.tool.js';
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

// 템플릿 조회
server.registerTool(
  'propt_get_template',
  {
    title: 'Get Template',
    description: '특정 템플릿의 상세 정보를 조회합니다.',
    inputSchema: {
      templateId: z.string().describe('템플릿 ID'),
    },
  },
  async (input) => {
    try {
      const template = await getTemplateById(input.templateId);
      const outputInstruction = getOutputTypeInstruction(template.outputType);

      let responseText = JSON.stringify(template, null, 2);
      if (outputInstruction) {
        responseText += `\n\n<output_instruction>\n${outputInstruction}\n</output_instruction>`;
      }

      return {
        content: [
          {
            type: 'text',
            text: responseText,
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
    description: `배치 실행을 준비합니다. 
    
- 템플릿을 조회하고 변수를 검증합니다
- 토큰 효율적인 실행 가이드를 제공합니다
- Claude가 자동으로 각 프롬프트에 컨텍스트 리셋 지시를 붙여 실행합니다

이 도구를 호출하면 Claude가 자동으로 배치 실행을 시작합니다.`,
    inputSchema: {
      templateId: z.string().describe('템플릿 ID'),
      variableSets: z
        .array(z.record(z.string(), z.string()))
        .describe('변수 세트 배열. 예: [{ name: "사과", aspect: "장점" }, ...]'),
    },
  },
  async (input) => {
    try {
      const result = await prepareBatch(input.templateId, input.variableSets);

      return {
        content: [
          {
            type: 'text',
            text: result.executionGuide,
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

console.error('Propt MCP Server is running!');
const transport = new StdioServerTransport();
await server.connect(transport);
