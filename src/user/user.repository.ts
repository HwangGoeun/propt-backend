import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  async findByOAuthCredentials(oauthProvider: string, oauthId: string) {
    return this.prisma.user.findUnique({
      where: {
        oauthProvider_oauthId: {
          oauthProvider,
          oauthId,
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

  async updateRefreshToken(id: string, token: string | null) {
    await this.prisma.user.update({
      where: { id },
      data: { refreshToken: token },
    });
  }
}
