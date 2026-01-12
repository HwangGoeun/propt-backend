import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Template } from '@prisma/client';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateResponseDto } from './dto/template-response.dto';
import { TemplateVariableDto } from './dto/template-variable.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplateService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async create(userId: string, dto: CreateTemplateDto): Promise<TemplateResponseDto> {
    const user = await this.authService.getUserByOAuthId(userId);

    try {
      const template = await this.prisma.template.create({
        data: {
          creatorId: user.id,
          title: dto.title,
          content: dto.content,
          variables: (dto.variables as unknown as Prisma.InputJsonValue[]) ?? [],
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
    const user = await this.authService.getUserByOAuthId(userId);

    const templates = await this.prisma.template.findMany({
      where: { creatorId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return templates.map((template) => this.toResponseDto(template));
  }

  async findOneById(id: string, userId: string): Promise<TemplateResponseDto> {
    const user = await this.authService.getUserByOAuthId(userId);

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
    const user = await this.authService.getUserByOAuthId(userId);

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
          ...(dto.content !== undefined && { content: dto.content }),
          ...(dto.variables !== undefined && {
            variables: dto.variables as unknown as Prisma.InputJsonValue[],
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
   * Prisma Entity -> DTO 변환
   */
  private toResponseDto(template: Template): TemplateResponseDto {
    return {
      id: template.id,
      title: template.title,
      content: template.content,
      variables: template.variables as unknown as TemplateVariableDto[],
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}
