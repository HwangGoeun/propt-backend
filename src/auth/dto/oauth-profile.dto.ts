import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { OAuthProvider } from 'src/common/types/auth.types';

export class OAuthProfileDto {
  @IsIn(['google'])
  provider!: OAuthProvider;

  @IsString()
  @IsNotEmpty()
  providerUserId!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsBoolean()
  @IsOptional()
  emailVerified?: boolean;

  @IsString()
  @IsOptional()
  name?: string;
}
