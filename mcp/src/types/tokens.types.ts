export type UserType = 'social' | 'guest';

export type Tokens = {
  accessToken: string;
  refreshToken: string;
  userType?: UserType;
};
