import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { OAuthProfileDto } from 'src/auth/dto/oauth-profile.dto';
import { GoogleOAuthGuard } from 'src/auth/guards/google-oauth.guard';
import { ExchangeCodeDto } from './dto/exchange-code.dto';
import { McpAuthService } from './mcp-auth.service';

@ApiTags('MCP Authentication')
@Controller('mcp')
export class McpAuthController {
  constructor(
    private readonly mcpAuthService: McpAuthService,
    private readonly authService: AuthService,
  ) {}

  @Get('login')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'MCP 로그인 시작' })
  @ApiResponse({
    status: 302,
    description: 'Google OAuth 로그인 페이지로 리다이렉트',
  })
  async login() {}

  @Get('callback')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'OAuth 콜백 (디바이스 코드 발급)' })
  @ApiResponse({
    status: 302,
    description: '프론트엔드로 리다이렉트 (디바이스 코드 포함)',
  })
  async callback(@Req() req: Request, @Res() res: Response) {
    const oauthProfile = req.user as OAuthProfileDto;
    const user = await this.authService.validateOAuthUser(oauthProfile);

    const code = await this.mcpAuthService.saveDeviceCode(user.id);

    res.redirect(`${process.env.FRONTEND_URL}/mcp/code?code=${code}`);
  }

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
    schema: {
      example: {
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '유효하지 않거나 만료된 코드입니다.',
        },
      },
    },
  })
  async exchange(@Body() dto: ExchangeCodeDto) {
    const tokens = await this.mcpAuthService.exchangeCode(dto.code);

    return {
      ok: true,
      data: tokens,
    };
  }
}
