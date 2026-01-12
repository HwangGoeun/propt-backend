import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { GoogleConfigService } from 'src/config/google.config';
import { JwtConfigService } from 'src/config/jwt.config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserRepository } from 'src/user/user.repository';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';

@Module({
  imports: [ConfigModule, PrismaModule, PassportModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    UserRepository,
    GoogleStrategy,
    JwtStrategy,
    GoogleOAuthGuard,
    JwtAuthGuard,
    GoogleConfigService,
    JwtConfigService,
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
