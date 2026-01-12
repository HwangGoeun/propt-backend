import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class McpDeviceCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, code: string, expiresAt: Date) {
    return this.prisma.mcpDeviceCode.create({
      data: {
        userId,
        code,
        expiresAt,
      },
    });
  }

  async findValidCode(code: string) {
    return this.prisma.mcpDeviceCode.findFirst({
      where: {
        code,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  async delete(id: string) {
    return this.prisma.mcpDeviceCode.delete({
      where: { id },
    });
  }

  async deleteExpired() {
    return this.prisma.mcpDeviceCode.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}
