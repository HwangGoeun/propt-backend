import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';

const server = new McpServer({
  name: 'propt-mcp',
  version: '0.0.1',
});

server.registerTool(
  'hello',
  {
    title: 'hello',
    description: 'Return a hello world greeting',
    inputSchema: {
      name: z.string().optional(),
    },
  },
  ({ name }) => {
    const who = (name ?? 'world').toString();
    return {
      content: [
        {
          type: 'text',
          text: `Hello, ${who}!`,
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
