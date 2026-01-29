export type UserType = 'social' | 'guest';

export class TokenResponseDto {
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: string;
  userType?: UserType;
}
