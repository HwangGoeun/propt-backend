import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ExchangeCodeDto } from './dto/exchange-code.dto';
import { McpAuthService } from './mcp-auth.service';

@ApiTags('MCP Authentication')
@Controller('mcp')
export class McpAuthController {
  constructor(private readonly mcpAuthService: McpAuthService) {}

  @Post('exchange')
  @ApiOperation({ summary: '디바이스 코드를 토큰으로 교환' })
  @ApiResponse({
    status: 200,
    description: '토큰 교환 성공',
    schema: {
      example: {
        ok: true,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '유효하지 않거나 만료된 코드',
  })
  async exchange(@Body() dto: ExchangeCodeDto) {
    return this.mcpAuthService.exchangeDeviceCodeForTokens(dto.code);
  }
}
