import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TemplateController],
  providers: [TemplateService],
})
export class TemplateModule {}
