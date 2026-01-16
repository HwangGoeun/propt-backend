import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { JwtConfigService } from 'src/config/jwt.config';

export interface Payload {
  oauthId: string;
  oauthProvider: string;
}

interface RequestWithCookies extends Request {
  cookies: { [key: string]: unknown };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly jwtConfigService: JwtConfigService) {
    super({
      jwtFromRequest: (req: RequestWithCookies) => {
        let token: string | null = null;

        if (req && req.headers.authorization) {
          token = req.headers.authorization.split(' ')[1];
        }

        if (!token && req && req.cookies) {
          const accessToken = req.cookies['accessToken'];
          if (typeof accessToken === 'string') {
            token = accessToken;
          }
        }

        return token;
      },
      ignoreExpiration: false,
      secretOrKey: jwtConfigService.accessSecret,
    });
  }

  validate(payload: Payload) {
    return {
      userId: payload.oauthId,
      provider: payload.oauthProvider,
    };
  }
}
