import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Template, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateResponseDto } from './dto/template-response.dto';
import { TemplateVariableDto } from './dto/template-variable.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplateService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateTemplateDto): Promise<TemplateResponseDto> {
    const user = await this.getUserOrThrow(userId);

    try {
      const template = await this.prisma.template.create({
        data: {
          creatorId: user.id,
          title: dto.title,
          description: dto.description,
          content: dto.content,
          variable: (dto.variables as unknown as Prisma.InputJsonValue[]) ?? [],
        },
      });

      return this.toResponseDto(template);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(`Template with title '${dto.title}' already exists`);
        }
      }

      throw error;
    }
  }

  async findAllByUserId(userId: string): Promise<TemplateResponseDto[]> {
    const user = await this.findUserByOauthId(userId);

    if (!user) {
      return [];
    }

    const templates = await this.prisma.template.findMany({
      where: { creatorId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return templates.map((template) => this.toResponseDto(template));
  }

  async findOneById(id: string, userId: string): Promise<TemplateResponseDto> {
    const user = await this.getUserOrThrow(userId);

    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    if (template.creatorId !== user.id) {
      throw new ForbiddenException('You do not have access to this template');
    }

    return this.toResponseDto(template);
  }

  async update(id: string, userId: string, dto: UpdateTemplateDto): Promise<TemplateResponseDto> {
    const user = await this.getUserOrThrow(userId);

    // Template lookup
    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    // Ownership verification
    if (template.creatorId !== user.id) {
      throw new ForbiddenException('You do not have access to this template');
    }

    // Perform update
    try {
      const updatedTemplate = await this.prisma.template.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.content !== undefined && { content: dto.content }),
          ...(dto.variables !== undefined && {
            variable: dto.variables as unknown as Prisma.InputJsonValue[],
          }),
        },
      });

      return this.toResponseDto(updatedTemplate);
    } catch (error) {
      // Handle title duplication error (P2002 error)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(`Template with title '${dto.title}' already exists`);
        }
      }

      throw error;
    }
  }

  async remove(templateId: string, userId: string): Promise<void> {
    await this.findOneById(templateId, userId);

    await this.prisma.template.delete({
      where: { id: templateId },
    });
  }

  /**
   * OAuth ID로 사용자 조회
   */
  private async findUserByOauthId(oauthId: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { oauthId },
    });
  }

  /**
   * OAuth ID로 사용자 조회 (없으면 에러 발생)
   */
  private async getUserOrThrow(oauthId: string): Promise<User> {
    const user = await this.findUserByOauthId(oauthId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Prisma Entity -> DTO 변환
   */
  private toResponseDto(template: Template): TemplateResponseDto {
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
