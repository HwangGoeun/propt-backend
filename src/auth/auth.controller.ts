import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { OAuthProfileDto } from './dto/oauth-profile.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  async googleLogin() {}

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleCallback(@Req() req: Request): Promise<TokenResponseDto> {
    const oauthProfile = req.user as OAuthProfileDto;
    const user = await this.authService.validateOAuthUser(oauthProfile);

    return this.authService.generateTokens(user.oauthId, user.oauthProvider);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto): TokenResponseDto {
    return this.authService.refreshTokens(dto.refreshToken);
  }
}
