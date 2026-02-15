import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { ERROR_CODE } from 'src/common/constants/error-code';
import { NotFoundError, SystemError, UnauthorizedError } from 'src/common/errors/app.error';
import { generateRandomUsername } from 'src/common/utils/user-name.util';
import { UserRepository } from 'src/user/user.repository';
import { OAuthProfileDto } from './dto/oauth-profile.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
  ) {}

  async loginAsGuest() {
    const name = generateRandomUsername();
    const oauthProvider = 'guest';
    const oauthId = `guest_${Date.now()}_${name}`;

    const user = await this.userRepository.create({
      oauthProvider,
      oauthId,
      name,
    });

    const tokens = this.tokenService.generateTokens(oauthId, oauthProvider);

    await this.userRepository.updateRefreshToken(user.id, tokens.refreshToken);

    return { user, tokens };
  }

  async findOrCreateOAuthUser(oauthProfile: OAuthProfileDto): Promise<User> {
    const { provider, providerUserId, email } = oauthProfile;

    if (!providerUserId) {
      throw new UnauthorizedError('Provider user ID is required', ERROR_CODE.OAUTH_PROFILE_INVALID);
    }

    const existingUser = await this.userRepository.findByOAuthCredentials(provider, providerUserId);

    if (existingUser) {
      return existingUser;
    }

    return this.createUserWithRetry(provider, providerUserId, email);
  }

  private async createUserWithRetry(
    provider: string,
    providerUserId: string,
    email?: string,
  ): Promise<User> {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const userName = generateRandomUsername();
        return await this.userRepository.create({
          oauthProvider: provider,
          oauthId: providerUserId,
          email: email || null,
          name: userName,
        });
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'P2002') {
          retryCount++;
          continue;
        }

        throw new SystemError('Failed to create user', error);
      }
    }

    throw new SystemError('Failed to create user after multiple attempts', {
      errorCode: ERROR_CODE.USER_CONFLICT,
    });
  }

  generateTokens(oauthId: string, oauthProvider: string): TokenResponseDto {
    return this.tokenService.generateTokens(oauthId, oauthProvider);
  }

  refreshTokens(refreshToken: string): TokenResponseDto {
    return this.tokenService.refreshTokens(refreshToken);
  }

  async validateToken(accessToken: string) {
    const payload = this.tokenService.verifyToken(accessToken);

    const user = await this.userRepository.findByOAuthCredentials(
      payload.oauthProvider,
      payload.oauthId,
    );

    if (!user) {
      throw new UnauthorizedError('사용자를 찾을 수 없습니다', ERROR_CODE.USER_NOT_FOUND);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    };
  }

  async getUserByOAuthId(oauthId: string) {
    const user = await this.userRepository.findByOAuthId(oauthId);

    if (!user) {
      throw new UnauthorizedError('사용자를 찾을 수 없습니다', ERROR_CODE.USER_NOT_FOUND);
    }

    return user;
  }

  async withdraw(oauthProvider: string, oauthId: string) {
    const user = await this.userRepository.findByOAuthCredentials(oauthProvider, oauthId);

    if (!user) {
      throw new NotFoundError('사용자를 찾을 수 없습니다');
    }

    await this.userRepository.deleteUser(user.id);
  }
}
