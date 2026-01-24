import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { McpAuthController } from './mcp-auth.controller';
import { McpAuthService } from './mcp-auth.service';
import { McpDeviceCodeRepository } from './mcp-device-code.repository';
import { McpServerService } from './mcp-server.service';
import { McpSseController } from './mcp-sse.controller';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule), UserModule],
  controllers: [McpAuthController, McpSseController],
  providers: [McpAuthService, McpDeviceCodeRepository, McpServerService],
  exports: [McpAuthService],
})
export class McpModule {}
