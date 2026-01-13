import { BASE_URL } from '../config.js';
import { ApiResponse } from '../types/api-response.types.js';
import { Tokens } from '../types/tokens.types.js';
import { TokenStore } from './token-store.js';

/**
 * MCP 로그인 URL 반환
 */
export function getLoginUrl(): string {
  return `${BASE_URL}/auth/google?state=mcp`;
}

/**
 * 디바이스 코드를 토큰으로 교환
 */
export async function exchangeDeviceCode(code: string): Promise<Tokens> {
  const res = await fetch(`${BASE_URL}/mcp/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code: code.toUpperCase().trim() }),
  });

  const responseBody = (await res.json()) as ApiResponse<Tokens>;

  if (!res.ok || !responseBody.ok) {
    const errorMessage =
      responseBody.ok === false ? responseBody.error.message : '코드 교환에 실패했습니다.';
    throw new Error(errorMessage);
  }

  const tokens = responseBody.data;

  await TokenStore.save({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });

  return tokens;
}
