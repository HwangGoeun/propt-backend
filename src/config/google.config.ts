import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GoogleOAuthConfig {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
}

@Injectable()
export class GoogleConfigService {
  constructor(private readonly configService: ConfigService) {}

  getGoogleOAuthConfig(): GoogleOAuthConfig {
    const clientID = this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = this.configService.getOrThrow<string>('GOOGLE_CALLBACK_URL');

    return {
      clientID,
      clientSecret,
      callbackURL,
    };
  }

  get clientID(): string {
    return this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
  }

  get clientSecret(): string {
    return this.configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET');
  }

  get callbackURL(): string {
    return this.configService.getOrThrow<string>('GOOGLE_CALLBACK_URL');
  }
}
