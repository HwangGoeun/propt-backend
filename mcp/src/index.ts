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
    description: `저장된 프롬프트 템플릿 목록을 조회합니다.

⚠️ 중요: 템플릿 목록은 사용자가 언제든 추가/삭제/수정할 수 있습니다.
템플릿을 사용하기 전에 반드시 이 도구를 호출하여 최신 목록을 확인하세요.
이전에 조회한 결과를 재사용하지 마세요.`,
    inputSchema: {},
  },
  async () => {
    try {
      const templates = await listTemplates();

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

// 템플릿 조회
server.registerTool(
  'propt_get_template',
  {
    title: 'Get Template',
    description: `특정 템플릿의 상세 정보를 조회합니다.

⚠️ 중요: 템플릿 내용은 사용자가 언제든 수정할 수 있습니다.
템플릿을 실행할 때마다 반드시 이 도구를 호출하여 최신 데이터를 가져오세요.
이전에 조회한 결과를 절대 재사용하지 마세요.
같은 템플릿이라도 매번 새로 조회해야 합니다.`,
    inputSchema: {
      templateId: z.string().describe('템플릿 ID'),
    },
  },
  async (input) => {
    try {
      const template = await getTemplateById(input.templateId);
      const outputInstruction = getOutputTypeInstruction(template.outputType);

      let responseText = `📄 템플릿 상세 (조회 시점: ${new Date().toISOString()})\n\n${JSON.stringify(template, null, 2)}`;
      if (outputInstruction) {
        responseText += `\n\n<output_instruction>\n${outputInstruction}\n</output_instruction>`;
      }
      responseText += `\n\n---\n⚠️ 이 데이터는 조회 시점의 내용입니다.\n같은 템플릿이라도 다음 실행 시 반드시 다시 조회하세요.\n사용자가 웹에서 내용을 수정했을 수 있습니다.`;

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

⚠️ 중요: 이 도구는 실행할 때마다 최신 템플릿 데이터를 조회합니다.
이전에 준비한 배치 결과를 재사용하지 마세요.

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
            text: `📦 배치 준비 완료 (조회 시점: ${new Date().toISOString()})\n\n${result.executionGuide}\n\n---\n⚠️ 이 배치 데이터는 조회 시점의 템플릿 내용 기준입니다.\n다음 배치 실행 시 반드시 다시 이 도구를 호출하세요.`,
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
