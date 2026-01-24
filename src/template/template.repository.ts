import { Injectable } from '@nestjs/common';
import { Prisma, Template } from '@prisma/client';
import { handlePrismaError } from 'src/common/utils/prisma-error.util';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.TemplateCreateInput): Promise<Template> {
    try {
      return await this.prisma.template.create({ data });
    } catch (error) {
      handlePrismaError(error, 'Template');
    }
  }

  async findAllByUserId(userId: string): Promise<Template[]> {
    return this.prisma.template.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneById(id: string): Promise<Template | null> {
    return this.prisma.template.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: Prisma.TemplateUpdateInput): Promise<Template> {
    try {
      return await this.prisma.template.update({
        where: { id },
        data,
      });
    } catch (error) {
      handlePrismaError(error, 'Template');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.template.delete({
        where: { id },
      });
    } catch (error) {
      handlePrismaError(error, 'Template');
    }
  }
}
