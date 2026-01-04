import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TemplateResponseDto } from './dto/template-response.dto';
import { TemplateVariableDto } from './dto/template-variable.dto';

@Injectable()
export class TemplateService {
  constructor(private prisma: PrismaService) {}

  async findAllByUserId(userId: string): Promise<TemplateResponseDto[]> {
    const user = await this.prisma.user.findFirst({
      where: { oauthId: userId },
    });

    if (!user) {
      return [];
    }

    const templates = await this.prisma.template.findMany({
      where: { creatorId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return templates.map((template) => ({
      id: template.id,
      title: template.title,
      description: template.description ?? undefined,
      content: template.content,
      variables: template.variable as unknown as TemplateVariableDto[],
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    }));
  }

  async findOneById(id: string, userId: string): Promise<TemplateResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { oauthId: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    if (template.creatorId !== user.id) {
      throw new ForbiddenException('You do not have access to this template');
    }

    return {
      id: template.id,
      title: template.title,
      description: template.description ?? undefined,
      content: template.content,
      variables: template.variable as unknown as TemplateVariableDto[],
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}
