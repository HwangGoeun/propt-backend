import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { TemplateVariableDto } from './template-variable.dto';

export class CreateTemplateDto {
  @ApiProperty({
    description: 'Template title',
    example: 'Blog title generator',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    description: 'Template description',
    example: 'Generate creative blog titles based on keywords',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Template content with variables in {variableName} format',
    example: 'Please create a blog title for {keyword}',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({
    description: 'Template variables',
    type: [TemplateVariableDto],
    required: false,
    example: [{ name: 'keyword', type: 'text', description: 'Search keyword' }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableDto)
  variables?: TemplateVariableDto[];
}
