import { Injectable } from '@nestjs/common';
import { Prisma, Template } from '@prisma/client';
import { AuthService } from 'src/auth/auth.service';
import { ForbiddenError, NotFoundError } from 'src/common/errors/app.error';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateResponseDto } from './dto/template-response.dto';
import { TemplateVariableDto } from './dto/template-variable.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateRepository } from './template.repository';

@Injectable()
export class TemplateService {
  constructor(
    private readonly templateRepository: TemplateRepository,
    private readonly authService: AuthService,
  ) {}

  async create(userId: string, dto: CreateTemplateDto): Promise<TemplateResponseDto> {
    const user = await this.authService.getUserByOAuthId(userId);

    const template = await this.templateRepository.create({
      creatorId: user.id,
      title: dto.title,
      content: dto.content,
      variables: (dto.variables as unknown as Prisma.InputJsonValue[]) ?? [],
    });

    return this.toResponseDto(template);
  }

  async findAllByUserId(userId: string): Promise<TemplateResponseDto[]> {
    const user = await this.authService.getUserByOAuthId(userId);
    const templates = await this.templateRepository.findAllByUserId(user.id);

    return templates.map((template) => this.toResponseDto(template));
  }

  async findOneById(id: string, userId: string): Promise<TemplateResponseDto> {
    const template = await this.findTemplateAndAuthorize(id, userId);
    return this.toResponseDto(template);
  }

  async update(id: string, userId: string, dto: UpdateTemplateDto): Promise<TemplateResponseDto> {
    await this.findTemplateAndAuthorize(id, userId);

    const updatedTemplate = await this.templateRepository.update(id, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.content !== undefined && { content: dto.content }),
      ...(dto.variables !== undefined && {
        variables: dto.variables as unknown as Prisma.InputJsonValue[],
      }),
    });

    return this.toResponseDto(updatedTemplate);
  }

  async remove(templateId: string, userId: string): Promise<void> {
    await this.findTemplateAndAuthorize(templateId, userId);
    await this.templateRepository.delete(templateId);
  }

  private async findTemplateAndAuthorize(id: string, userId: string): Promise<Template> {
    const user = await this.authService.getUserByOAuthId(userId);
    const template = await this.templateRepository.findOneById(id);

    if (!template) {
      throw new NotFoundError(`Template with ID ${id} not found`);
    }

    if (template.creatorId !== user.id) {
      throw new ForbiddenError('You do not have access to this template');
    }

    return template;
  }

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
