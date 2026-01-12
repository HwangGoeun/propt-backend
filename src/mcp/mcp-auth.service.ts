import { Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenService } from 'src/auth/token.service';
import { McpDeviceCodeRepository } from './mcp-device-code.repository';

const CODE_LENGTH = 6;
const CODE_EXPIRY_MINUTES = 3;

@Injectable()
export class McpAuthService {
  constructor(
    private readonly mcpDeviceCodeRepository: McpDeviceCodeRepository,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * 6자리 랜덤 코드 생성 (헷갈리는 문자 제외: 0,O,1,I)
   */
  private generateRandomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';

    for (let i = 0; i < CODE_LENGTH; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
  }

  /**
   * 디바이스 코드 생성 및 저장
   */
  async saveDeviceCode(userId: string): Promise<string> {
    const code = this.generateRandomCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await this.mcpDeviceCodeRepository.create(userId, code, expiresAt);

    return code;
  }

  /**
   * 코드 전송 → 토큰 발급
   */
  async exchangeCode(code: string) {
    const deviceCode = await this.mcpDeviceCodeRepository.findValidCode(code.toUpperCase());

    if (!deviceCode) {
      throw new UnauthorizedException('유효하지 않거나 만료된 코드입니다.');
    }

    const tokens = this.tokenService.generateTokens(
      deviceCode.user.oauthId,
      deviceCode.user.oauthProvider,
    );

    await this.mcpDeviceCodeRepository.delete(deviceCode.id);

    return tokens;
  }
}
