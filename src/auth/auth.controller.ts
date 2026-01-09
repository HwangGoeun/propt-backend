import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import ms from 'ms';
import { JwtConfigService } from 'src/config/jwt.config';
import { AuthService } from './auth.service';
import { OAuthProfileDto } from './dto/oauth-profile.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtConfigService: JwtConfigService,
  ) {}

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  async googleLogin() {}

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const oauthProfile = req.user as OAuthProfileDto;
    const user = await this.authService.validateOAuthUser(oauthProfile);
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
