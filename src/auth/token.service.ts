import { Injectable } from '@nestjs/common';
import { JsonWebTokenError, sign, SignOptions, TokenExpiredError, verify } from 'jsonwebtoken';
import { ERROR_CODE } from 'src/common/constants/error-code';
import { SystemError, UnauthorizedError } from 'src/common/errors/app.error';
import { JwtConfigService } from 'src/config/jwt.config';
import { TokenResponseDto } from './dto/token-response.dto';
import { Payload } from './strategies/jwt.strategy';

@Injectable()
export class TokenService {
  constructor(private readonly jwtConfigService: JwtConfigService) {}

  generateTokens(oauthId: string, oauthProvider: string): TokenResponseDto {
    if (!oauthId || !oauthProvider) {
      throw new SystemError('Invalid token payload: oauthId and oauthProvider are required', {
        errorCode: ERROR_CODE.TOKEN_ISSUE_FAILED,
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
      throw new SystemError('Failed to generate tokens', {
        errorCode: ERROR_CODE.TOKEN_ISSUE_FAILED,
        details: error,
      });
    }
  }

  refreshTokens(refreshToken: string): TokenResponseDto {
    const config = this.jwtConfigService.getJwtConfig();

    try {
      const payload = verify(refreshToken, config.refreshSecret) as Payload;

      return this.generateTokens(payload.oauthId, payload.oauthProvider);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedError('Refresh token has expired', ERROR_CODE.TOKEN_EXPIRED);
      }

      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedError('Invalid refresh token', ERROR_CODE.TOKEN_INVALID);
      }

      throw new UnauthorizedError('Token verification failed', ERROR_CODE.TOKEN_INVALID, error);
    }
  }

  verifyToken(accessToken: string): Payload {
    const config = this.jwtConfigService.getJwtConfig();

    try {
      const payload = verify(accessToken, config.accessSecret) as Payload;
      return payload;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedError('Access token has expired', ERROR_CODE.TOKEN_EXPIRED);
      }

      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedError('Invalid access token', ERROR_CODE.TOKEN_INVALID);
      }

      throw new UnauthorizedError('Token verification failed', ERROR_CODE.TOKEN_INVALID, error);
    }
  }
}
