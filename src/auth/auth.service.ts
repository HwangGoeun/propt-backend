import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import { ERROR_CODE } from 'src/common/constants/error-code';
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

  async guestLogin() {
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

    return tokens;
  }

  async validateOAuthUser(oauthProfile: OAuthProfileDto): Promise<User> {
    const { provider, providerUserId, email } = oauthProfile;

    if (!providerUserId) {
      throw new UnauthorizedException({
        errorCode: ERROR_CODE.OAUTH_PROFILE_INVALID,
        message: 'Provider user ID is required',
      });
    }

    const existingUser = await this.userRepository.findByOAuthCredentials(provider, providerUserId);

    if (existingUser) {
      return existingUser;
    }

    // TODO: OAuth로부터 받은 사용자 이름 + UUID 사용하여 unique한 userName으로 저장할 수 있도록 구현 (UX 고려)
    let userName = generateRandomUsername();
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const newUser = await this.userRepository.create({
          oauthProvider: provider,
          oauthId: providerUserId,
          email: email || null,
          name: userName,
        });

        return newUser;
      } catch (error) {
        // Prisma unique constraint error (P2002)
        if (error instanceof Error && 'code' in error && error.code === 'P2002') {
          retryCount++;
          userName = generateRandomUsername();
        } else {
          throw new InternalServerErrorException({
            errorCode: ERROR_CODE.USER_CONFLICT,
            message: 'Failed to create user',
            details: error,
          });
        }
      }
    }

    throw new InternalServerErrorException({
      errorCode: ERROR_CODE.USER_CONFLICT,
      message: 'Failed to create user after multiple attempts',
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
      throw new UnauthorizedException({
        errorCode: ERROR_CODE.USER_NOT_FOUND,
        message: '사용자를 찾을 수 없습니다',
      });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  /**
   * OAuth ID로 사용자 조회
   */
  async getUserByOAuthId(oauthId: string) {
    const user = await this.userRepository.findByOAuthId(oauthId);

    if (!user) {
      throw new UnauthorizedException({
        errorCode: ERROR_CODE.USER_NOT_FOUND,
        message: '사용자를 찾을 수 없습니다',
      });
    }

    return user;
  }
}
