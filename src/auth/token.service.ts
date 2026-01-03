import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JsonWebTokenError, sign, SignOptions, TokenExpiredError, verify } from 'jsonwebtoken';
import { ERROR_CODE } from 'src/common/constants/error-code';
import { JwtConfigService } from 'src/config/jwt.config';
import { TokenResponseDto } from './dto/token-response.dto';
import { Payload } from './strategies/jwt.strategy';

@Injectable()
export class TokenService {
  constructor(private readonly jwtConfigService: JwtConfigService) {}

  generateTokens(oauthId: string, oauthProvider: string): TokenResponseDto {
    if (!oauthId || !oauthProvider) {
      throw new InternalServerErrorException({
        errorCode: ERROR_CODE.TOKEN_ISSUE_FAILED,
        message: 'Invalid token payload: oauthId and oauthProvider are required',
      });
    }

    try {
      const payload: Payload = { oauthId, oauthProvider };
      const config = this.jwtConfigService.getJwtConfig();

      const accessToken = sign(payload, config.accessSecret, {
        expiresIn: config.accessExpiresIn,
      } as SignOptions);

      const refreshToken = sign(payload, config.refreshSecret, {
        expiresIn: config.refreshExpiresIn,
      } as SignOptions);

      return {
        accessToken,
        refreshToken,
        expiresIn: config.accessExpiresIn,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        errorCode: ERROR_CODE.TOKEN_ISSUE_FAILED,
        message: 'Failed to generate tokens',
        details: error,
      });
    }
  }

  /**
   * TODO: Refresh Token 재발급 전략 개선 필요
   *
   * Sliding Window 방식
   * - 기본적으로 Refresh Token 재사용
   * - 남은 기간이 3일 미만일 때만 Refresh Token도 갱신
   */
  refreshTokens(refreshToken: string): TokenResponseDto {
    const config = this.jwtConfigService.getJwtConfig();

    try {
      const payload = verify(refreshToken, config.refreshSecret) as Payload;

      return this.generateTokens(payload.oauthId, payload.oauthProvider);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException({
          errorCode: ERROR_CODE.TOKEN_EXPIRED,
          message: 'Refresh token has expired',
        });
      }

      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException({
          errorCode: ERROR_CODE.TOKEN_INVALID,
          message: 'Invalid refresh token',
        });
      }

      throw new UnauthorizedException({
        errorCode: ERROR_CODE.TOKEN_INVALID,
        message: 'Token verification failed',
        details: error,
      });
    }
  }
}
