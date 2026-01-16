import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ERROR_CODE } from 'src/common/constants/error-code';
import { GoogleConfigService } from 'src/config/google.config';
import { OAuthProfileDto } from '../dto/oauth-profile.dto';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly googleConfigService: GoogleConfigService) {
    const { clientID, clientSecret, callbackURL } = googleConfigService.getGoogleOAuthConfig();

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const { id, emails, displayName } = profile;

      const oauthProfilePlain = {
        provider: 'google' as const,
        providerUserId: id,
        email: emails?.[0]?.value,
        emailVerified: emails?.[0]?.verified,
        name: displayName,
      };

      const oauthProfile = plainToInstance(OAuthProfileDto, oauthProfilePlain);

      await validateOrReject(oauthProfile);

      done(null, oauthProfile);
    } catch (error: unknown) {
      done(
        new UnauthorizedException({
          errorCode: ERROR_CODE.OAUTH_PROFILE_INVALID,
          message: 'Invalid OAuth profile data',
          details: error,
        }),
        false,
      );
    }
  }
}
