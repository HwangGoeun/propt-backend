import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import ms from 'ms';
import { JwtConfigService } from 'src/config/jwt.config';
import { McpAuthService } from 'src/mcp/mcp-auth.service';
import { AuthService } from './auth.service';
import { OAuthProfileDto } from './dto/oauth-profile.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtConfigService: JwtConfigService,
    private readonly mcpAuthService: McpAuthService,
  ) {}

  /**
   * Google OAuth 로그인 시작
   * - 일반 웹 로그인: /auth/google
   * - MCP 로그인: /auth/google?state=mcp
   */
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async googleLogin(@Query('state') state?: string) {}

  /**
   * Google OAuth 콜백
   * - state=mcp → 디바이스 코드 발급 후 프론트엔드로 리다이렉트
   * - 그 외 → 쿠키에 토큰 저장 후 /templates로 리다이렉트
   */
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('state') state?: string,
  ): Promise<void> {
    const oauthProfile = req.user as OAuthProfileDto;
    const user = await this.authService.validateOAuthUser(oauthProfile);

    if (state === 'mcp') {
      const code = await this.mcpAuthService.saveDeviceCode(user.id);
      res.redirect(`${process.env.FRONTEND_URL}/mcp/code?code=${code}`);

      return;
    }

    const tokens = this.authService.generateTokens(user.oauthId, user.oauthProvider);
    const jwtConfig = this.jwtConfigService.getJwtConfig();

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ms(jwtConfig.accessExpiresIn as ms.StringValue),
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ms(jwtConfig.refreshExpiresIn as ms.StringValue),
    });

    res.redirect(`${process.env.FRONTEND_URL}/templates`);
  }

  @Get('me')
  async getMe(@Req() request: Request) {
    const cookies = request.cookies as Record<string, string | undefined>;
    const accessToken = cookies['accessToken'];

    if (!accessToken) {
      throw new UnauthorizedException('인증되지 않았습니다.');
    }

    const user = await this.authService.validateToken(accessToken);

    return {
      ok: true,
      data: {
        isAuthenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    };
  }

  @Post('guest')
  @ApiOperation({ summary: 'Guest login' })
  @ApiResponse({
    status: 201,
    description: '게스트 로그인 성공 (토큰은 HttpOnly Cookie로 발급됨)',
    headers: {
      'Set-Cookie': {
        description: 'accessToken, refreshToken',
        schema: { type: 'string' },
      },
    },
  })
  async guestLogin(@Body() body: { state?: string }, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.authService.guestLogin();

    // state=mcp인 경우 디바이스 코드 발급
    if (body.state === 'mcp') {
      const code = await this.mcpAuthService.saveDeviceCode(user.id);

      return {
        ok: true,
        data: {
          code,
        },
      };
    }

    res.cookie('accessToken', tokens.accessToken, { httpOnly: true, path: '/' });
    res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, path: '/' });

    return {
      ok: true,
      data: null,
    };
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto): TokenResponseDto {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return {
      ok: true,
      data: null,
    };
  }
}
