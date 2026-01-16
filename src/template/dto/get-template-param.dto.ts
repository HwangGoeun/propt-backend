import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetTemplateParamDto {
  @ApiProperty({ example: 'clx123abc456' })
  @IsString()
  @IsNotEmpty()
  id!: string;
}
