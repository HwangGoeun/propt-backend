import { Injectable } from '@nestjs/common';
import { UserType } from 'src/auth/dto/token-response.dto';
import { TokenService } from 'src/auth/token.service';
import { UnauthorizedError } from 'src/common/errors/app.error';
import { UserRepository } from 'src/user/user.repository';
import { McpDeviceCodeRepository } from './mcp-device-code.repository';

const CODE_LENGTH = 6;
const CODE_EXPIRY_MINUTES = 3;

@Injectable()
export class McpAuthService {
  constructor(
    private readonly mcpDeviceCodeRepository: McpDeviceCodeRepository,
    private readonly tokenService: TokenService,
    private readonly userRepository: UserRepository,
  ) {}

  private generateRandomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';

    for (let i = 0; i < CODE_LENGTH; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
  }

  async generateAndSaveDeviceCode(userId: string): Promise<string> {
    const code = this.generateRandomCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await this.mcpDeviceCodeRepository.create(userId, code, expiresAt);

    return code;
  }

  async exchangeDeviceCodeForTokens(code: string) {
    const deviceCode = await this.mcpDeviceCodeRepository.findValidCode(code.toUpperCase());

    if (!deviceCode) {
      throw new UnauthorizedError('유효하지 않거나 만료된 코드입니다.');
    }

    const tokens = this.tokenService.generateTokens(
      deviceCode.user.oauthId,
      deviceCode.user.oauthProvider,
    );

    await this.userRepository.updateRefreshToken(deviceCode.userId, tokens.refreshToken);
    await this.mcpDeviceCodeRepository.delete(deviceCode.id);

    const userType: UserType = deviceCode.user.oauthProvider === 'guest' ? 'guest' : 'social';

    return { ...tokens, userType };
  }
}
