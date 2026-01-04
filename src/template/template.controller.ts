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
  findOne(
    @CurrentUser('userId') userId: string,
    @Param() Param: GetTemplateParamDto,
  ): TemplateResponseDto {
    console.log('User ID:', userId);

    return {
      id: Param.id,
      title: `Mock Template ${Param.id}`,
      description: `This is a mock response ${Param.id}`,
      content: 'Mock content: {keyword}',
      variables: [
        {
          name: 'keyword',
          type: 'text',
          description: '검색 키워드',
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
