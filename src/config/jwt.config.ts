import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface JwtConfig {
  accessSecret: string;
  accessExpiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

@Injectable()
export class JwtConfigService {
  constructor(private readonly configService: ConfigService) {}

  getJwtConfig(): JwtConfig {
    const accessSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    const accessExpiresIn = this.configService.getOrThrow<string>('JWT_EXPIRES_IN');
    const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const refreshExpiresIn = this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN');

    return {
      accessSecret,
      accessExpiresIn,
      refreshSecret,
      refreshExpiresIn,
    };
  }

  get accessSecret(): string {
    return this.configService.getOrThrow<string>('JWT_SECRET');
  }

  get accessExpiresIn(): string {
    return this.configService.getOrThrow<string>('JWT_EXPIRES_IN');
  }

  get refreshSecret(): string {
    return this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  get refreshExpiresIn(): string {
    return this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN');
  }
}
