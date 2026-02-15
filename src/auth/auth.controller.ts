import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
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
import { UserRepository } from 'src/user/user.repository';
import { AuthService } from './auth.service';
import { OAuthProfileDto } from './dto/oauth-profile.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtConfigService: JwtConfigService,
    private readonly mcpAuthService: McpAuthService,
    private readonly userRepository: UserRepository,
  ) {}

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async googleLogin(@Query('state') state?: string) {}

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('state') state?: string,
  ): Promise<void> {
    const oauthProfile = req.user as OAuthProfileDto;
    const user = await this.authService.findOrCreateOAuthUser(oauthProfile);

    const tokens = this.authService.generateTokens(user.oauthId, user.oauthProvider);
    const jwtConfig = this.jwtConfigService.getJwtConfig();

    // 쿠키 설정 (MCP 포함 모든 경우)
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

    if (state === 'mcp') {
      const code = await this.mcpAuthService.generateAndSaveDeviceCode(user.id);
      res.redirect(`${process.env.FRONTEND_URL}/mcp/code?code=${code}`);

      return;
    }

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
          hasCompletedOnboarding: user.hasCompletedOnboarding,
        },
      },
    };
  }

  @Patch('onboarding')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '온보딩 완료 상태 업데이트' })
  async updateOnboarding(@Req() req: Request, @Body() body: { completed: boolean }) {
    const jwtUser = req.user as { userId: string; provider: string };
    const dbUser = await this.userRepository.findByOAuthCredentials(
      jwtUser.provider,
      jwtUser.userId,
    );

    if (!dbUser) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    await this.userRepository.updateOnboardingStatus(dbUser.id, body.completed);

    return {
      ok: true,
      data: null,
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
  async loginAsGuest(
    @Body() body: { state?: string } = {},
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.loginAsGuest();

    // 쿠키 설정 (MCP 포함 모든 경우)
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });

    // state=mcp인 경우 디바이스 코드 발급
    if (body?.state === 'mcp') {
      const code = await this.mcpAuthService.generateAndSaveDeviceCode(user.id);

      return {
        ok: true,
        data: {
          code,
        },
      };
    }

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

  @Delete('withdraw')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '회원 탈퇴' })
  @ApiResponse({ status: 200, description: '회원 탈퇴 성공' })
  async withdraw(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const jwtUser = req.user as { userId: string; provider: string };

    await this.authService.withdraw(jwtUser.provider, jwtUser.userId);

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

  @Post('code/generate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'MCP 디바이스 코드 발급' })
  @ApiResponse({
    status: 201,
    description: 'MCP 연결을 위한 디바이스 코드 발급',
  })
  async generateCode(@Req() req: Request) {
    const jwtUser = req.user as { userId: string; provider: string };
    const dbUser = await this.userRepository.findByOAuthCredentials(
      jwtUser.provider,
      jwtUser.userId,
    );

    if (!dbUser) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    const code = await this.mcpAuthService.generateAndSaveDeviceCode(dbUser.id);

    return {
      ok: true,
      data: { code },
    };
  }
}
