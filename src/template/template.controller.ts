import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GetTemplateParamDto } from './dto/get-template-param.dto';
import { TemplateResponseDto } from './dto/template-response.dto';
import { TemplateService } from './template.service';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  async findAll(@CurrentUser('userId') userId: string): Promise<TemplateResponseDto[]> {
    return this.templateService.findAllByUserId(userId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser('userId') userId: string,
    @Param() param: GetTemplateParamDto,
  ): Promise<TemplateResponseDto> {
    return this.templateService.findOneById(param.id, userId);
  }
}
