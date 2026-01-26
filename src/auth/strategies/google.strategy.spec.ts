import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Profile, VerifyCallback } from 'passport-google-oauth20';
import { GoogleConfigService } from 'src/config/google.config';
import { GoogleStrategy } from './google.strategy';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;

  const mockGoogleConfigService = {
    getGoogleOAuthConfig: jest.fn().mockReturnValue({
      clientID: 'test-client-id',
      clientSecret: 'test-client-secret',
      callbackURL: 'http://localhost:3000/auth/google/callback',
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        { provide: GoogleConfigService, useValue: mockGoogleConfigService },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
  });

  describe('validate', () => {
    const createMockProfile = (overrides: Partial<Profile> = {}): Profile =>
      ({
        id: 'google-user-123',
        displayName: 'Test User',
        emails: [{ value: 'test@example.com', verified: true }],
        photos: [],
        provider: 'google',
        _raw: '',
        _json: {
          iss: 'https://accounts.google.com',
          aud: 'test-client-id',
          iat: 1234567890,
          exp: 1234567890,
          sub: 'google-user-123',
          name: 'Test User',
          email: 'test@example.com',
          email_verified: true,
          picture: '',
        },
        ...overrides,
      }) as Profile;

    it('유효한 Google 프로필을 OAuthProfileDto로 변환해야 한다', async () => {
      const mockProfile = createMockProfile();
      const doneFn: VerifyCallback = jest.fn();

      await strategy.validate('access-token', 'refresh-token', mockProfile, doneFn);

      expect(doneFn).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          provider: 'google',
          providerUserId: 'google-user-123',
          email: 'test@example.com',
          name: 'Test User',
        }),
      );
    });

    it('이메일이 없는 프로필도 처리해야 한다', async () => {
      const mockProfile = createMockProfile({
        emails: undefined,
      });
      const doneFn: VerifyCallback = jest.fn();

      await strategy.validate('access-token', 'refresh-token', mockProfile, doneFn);

      expect(doneFn).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          provider: 'google',
          providerUserId: 'google-user-123',
          email: undefined,
          name: 'Test User',
        }),
      );
    });

    it('displayName이 없는 프로필도 처리해야 한다', async () => {
      const mockProfile = createMockProfile({
        displayName: '',
      });
      const doneFn: VerifyCallback = jest.fn();

      await strategy.validate('access-token', 'refresh-token', mockProfile, doneFn);

      expect(doneFn).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          provider: 'google',
          providerUserId: 'google-user-123',
          name: '',
        }),
      );
    });

    it('providerUserId가 없으면 UnauthorizedException을 반환해야 한다', async () => {
      const mockProfile = createMockProfile({
        id: '',
      });
      const doneFn: VerifyCallback = jest.fn();

      await strategy.validate('access-token', 'refresh-token', mockProfile, doneFn);

      expect(doneFn).toHaveBeenCalledWith(expect.any(UnauthorizedException), false);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const errorArg = (doneFn as jest.Mock).mock.calls[0][0] as {
        response: { errorCode: string; message: string };
      };
      expect(errorArg.response).toMatchObject({
        errorCode: 'OAUTH_PROFILE_INVALID',
        message: 'Invalid OAuth profile data',
      });
    });

    it('검증 실패 시 에러 details를 포함해야 한다', async () => {
      const mockProfile = createMockProfile({
        id: '',
      });
      const doneFn: VerifyCallback = jest.fn();

      await strategy.validate('access-token', 'refresh-token', mockProfile, doneFn);

      expect(doneFn).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          response: expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            details: expect.anything(),
          }),
        }),
        false,
      );
    });
  });
});
