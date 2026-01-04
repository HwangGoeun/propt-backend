import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GetTemplateParamDto } from './dto/get-template-param.dto';
import { TemplateResponseDto } from './dto/template-response.dto';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplateController {
  @Get()
  findAll(@CurrentUser('userId') userId: string): TemplateResponseDto[] {
    console.log('User ID:', userId);

    return [
      {
        id: 'mock-1',
        title: 'Mock Template 1',
        description: 'This is a mock template 1',
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
      },
      {
        id: 'mock-2',
        title: 'Mock Template 2',
        description: 'This is a mock template 2',
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
      },
      {
        id: 'mock-3',
        title: 'Mock Template 3',
        description: 'This is a mock template 3',
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
      },
    ];
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
