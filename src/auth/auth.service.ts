import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import { ERROR_CODE } from 'src/common/constants/error-code';
import { generateRandomUsername } from 'src/common/utils/user-name.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { OAuthProfileDto } from './dto/oauth-profile.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async validateOAuthUser(oauthProfile: OAuthProfileDto): Promise<User> {
    const { provider, providerUserId, email } = oauthProfile;

    if (!providerUserId) {
      throw new UnauthorizedException({
        errorCode: ERROR_CODE.OAUTH_PROFILE_INVALID,
        message: 'Provider user ID is required',
      });
    }

    const existingUser = await this.prisma.user.findUnique({
      where: {
        oauthProvider_oauthId: {
          oauthProvider: provider,
          oauthId: providerUserId,
        },
      },
    });

    if (existingUser) {
      return existingUser;
    }

    // TODO: OAuth로부터 받은 사용자 이름 + UUID 사용하여 unique한 userName으로 저장할 수 있도록 구현 (UX 고려)
    let userName = generateRandomUsername();
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const newUser = await this.prisma.user.create({
          data: {
            oauthProvider: provider,
            oauthId: providerUserId,
            email: email || null,
            name: userName,
          },
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

    const user = await this.prisma.user.findUnique({
      where: {
        oauthProvider_oauthId: {
          oauthProvider: payload.oauthProvider,
          oauthId: payload.oauthId,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        errorCode: ERROR_CODE.USER_NOT_FOUND,
        message: '사용자를 찾을 수 없습니다',
      });
    }

    return user;
  }

  /**
   * OAuth ID로 사용자 조회
   */
  async getUserByOAuthId(oauthId: string) {
    const user = await this.prisma.user.findFirst({
      where: { oauthId },
    });

    if (!user) {
      throw new UnauthorizedException({
        errorCode: ERROR_CODE.USER_NOT_FOUND,
        message: '사용자를 찾을 수 없습니다',
      });
    }

    return user;
  }
}
