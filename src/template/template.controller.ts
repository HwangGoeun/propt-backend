import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateTemplateDto } from './dto/create-template.dto';
import { GetTemplateParamDto } from './dto/get-template-param.dto';
import { TemplateResponseDto } from './dto/template-response.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateService } from './template.service';

@ApiTags('Templates')
@ApiBearerAuth()
@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  @ApiOperation({ summary: 'Create template' })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Duplicate title' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateTemplateDto,
  ): Promise<TemplateResponseDto> {
    return this.templateService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List templates' })
  @ApiResponse({
    status: 200,
    description: 'Template list retrieved successfully',
    type: [TemplateResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  async findAll(@CurrentUser('userId') userId: string): Promise<TemplateResponseDto[]> {
    return this.templateService.findAllByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Template details retrieved' })
  @ApiResponse({
    status: 200,
    description: 'Template retrieved successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  @ApiResponse({ status: 403, description: 'No permission' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async findOne(
    @CurrentUser('userId') userId: string,
    @Param() param: GetTemplateParamDto,
  ): Promise<TemplateResponseDto> {
    return this.templateService.findOneById(param.id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update template' })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  @ApiResponse({ status: 403, description: 'No permission' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 409, description: 'Duplicate title' })
  async update(
    @CurrentUser('userId') userId: string,
    @Param() param: GetTemplateParamDto,
    @Body() dto: UpdateTemplateDto,
  ): Promise<TemplateResponseDto> {
    return this.templateService.update(param.id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete Template' })
  @ApiResponse({ status: 200, description: 'Delete successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async remove(
    @CurrentUser('userId') userId: string,
    @Param() param: GetTemplateParamDto,
  ): Promise<void> {
    await this.templateService.remove(param.id, userId);
  }
}
