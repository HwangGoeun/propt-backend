import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { McpAuthController } from './mcp-auth.controller';
import { McpAuthService } from './mcp-auth.service';
import { McpDeviceCodeRepository } from './mcp-device-code.repository';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule), UserModule],
  controllers: [McpAuthController],
  providers: [McpAuthService, McpDeviceCodeRepository],
  exports: [McpAuthService],
})
export class McpModule {}
