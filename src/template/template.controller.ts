import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GetTemplateParamDto } from './dto/get-template-param.dto';
import { TemplateResponseDto } from './dto/template-response.dto';
import { TemplateService } from './template.service';

@ApiTags('Templates')
@ApiBearerAuth()
@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

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
}
