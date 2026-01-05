import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { VariableType } from 'src/common/types/template.types';

export class TemplateVariableDto {
  @ApiProperty({ example: 'keyword' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: ['text', 'file'], example: 'text' })
  @IsIn(['text', 'file'])
  type!: VariableType;

  @ApiProperty({ required: false, example: 'Please enter your search keyword' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, example: ['pdf', 'docx'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedExtensions?: string[];
}
