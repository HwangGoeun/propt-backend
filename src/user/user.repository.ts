import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  async createUser(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  async findByOAuthCredentials(provider: string, oauthId: string) {
    return this.prisma.user.findUnique({
      where: {
        oauthProvider_oauthId: {
          oauthProvider: provider,
          oauthId: oauthId,
        },
      },
    });
  }

  async findByOAuthId(oauthId: string) {
    return this.prisma.user.findFirst({
      where: { oauthId },
    });
  }

  async findById(id: string, select?: Prisma.UserSelect) {
    return this.prisma.user.findUnique({
      where: { id },
      select,
    });
  }

  async updateRefreshToken(oauthProvider: string, oauthId: string, refreshToken: string | null) {
    return this.prisma.user.update({
      where: {
        oauthProvider_oauthId: {
          oauthProvider,
          oauthId,
        },
      },
      data: {
        refreshToken,
      },
    });
  }
}
