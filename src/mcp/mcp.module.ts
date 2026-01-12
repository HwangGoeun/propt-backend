import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { McpAuthController } from './mcp-auth.controller';
import { McpAuthService } from './mcp-auth.service';
import { McpDeviceCodeRepository } from './mcp-device-code.repository';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [McpAuthController],
  providers: [McpAuthService, McpDeviceCodeRepository],
})
export class McpModule {}
