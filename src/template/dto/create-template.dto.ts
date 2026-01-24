import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
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

  @ApiProperty({
    description: 'Output type for the template',
    example: 'markdown',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  outputType?: string | null;
}
