import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ExchangeCodeDto {
  @ApiProperty({
    description: '6자리 디바이스 코드',
    example: 'ABC123',
  })
  @IsString()
  @Length(6, 6)
  code!: string;
}
