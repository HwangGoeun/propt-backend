import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';

@Module({
  imports: [PrismaModule],
  controllers: [TemplateController],
  providers: [TemplateService],
})
export class TemplateModule {}
