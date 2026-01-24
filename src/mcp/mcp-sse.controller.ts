import { Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { McpServerService } from './mcp-server.service';

@ApiExcludeController()
@Controller('mcp')
export class McpSseController {
  constructor(private readonly mcpServerService: McpServerService) {}

  /**
   * SSE endpoint for MCP connection
   * Claude web will connect to this endpoint
   */
  @Get('sse')
  async handleSse(@Res() res: Response) {
    await this.mcpServerService.handleSseConnection(res);
  }

  /**
   * Message endpoint for receiving client messages
   */
  @Post('messages')
  async handleMessages(
    @Query('sessionId') sessionId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.mcpServerService.handleMessage(sessionId, req, res);
  }
}
