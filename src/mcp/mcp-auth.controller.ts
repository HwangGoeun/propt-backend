import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ExchangeCodeDto } from './dto/exchange-code.dto';
import { McpAuthService } from './mcp-auth.service';
import { McpDeviceCodeRepository } from './mcp-device-code.repository';

@ApiTags('MCP Authentication')
@Controller('mcp')
export class McpAuthController {
  constructor(
    private readonly mcpAuthService: McpAuthService,
    private readonly mcpDeviceCodeRepository: McpDeviceCodeRepository,
  ) {}

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

  @Get('code/status')
  @ApiOperation({ summary: '디바이스 코드 사용 여부 확인' })
  @ApiResponse({
    status: 200,
    description: '코드 상태 반환',
    schema: {
      example: {
        ok: true,
        data: {
          used: true,
        },
      },
    },
  })
  async checkCodeStatus(@Query('code') code: string) {
    const validCode = await this.mcpDeviceCodeRepository.findValidCode(code.toUpperCase());

    return {
      ok: true,
      data: {
        used: !validCode,
      },
    };
  }
}
