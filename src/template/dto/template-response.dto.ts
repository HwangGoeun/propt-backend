import { ApiProperty } from '@nestjs/swagger';
import { TemplateVariableDto } from './template-variable.dto';

export class TemplateResponseDto {
  @ApiProperty({ example: 'clx123abc456' })
  id!: string;

  @ApiProperty({ example: 'Create a blog title' })
  title!: string;

  @ApiProperty({ example: 'Please create a blog title for {keyword}' })
  content!: string;

  @ApiProperty({ type: [TemplateVariableDto], example: [] })
  variables?: TemplateVariableDto[];

  @ApiProperty({ example: 'markdown', required: false, nullable: true })
  outputType?: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}
