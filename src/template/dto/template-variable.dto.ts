import { ApiProperty } from '@nestjs/swagger';
import type { VariableType } from 'src/common/types/template.types';

export class TemplateVariableDto {
  @ApiProperty({ example: 'keyword' })
  name!: string;

  @ApiProperty({ enum: ['text', 'file'], example: 'text' })
  type!: VariableType;

  @ApiProperty({ required: false, example: 'Please enter your search keyword' })
  description?: string;

  @ApiProperty({ required: false, example: ['pdf', 'docx'] })
  allowedExtensions?: string[];
}
