import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TemplateVariableDto {
  @ApiProperty({ example: 'keyword' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ required: false, example: 'Please enter your search keyword' })
  @IsOptional()
  @IsString()
  description?: string;
}
