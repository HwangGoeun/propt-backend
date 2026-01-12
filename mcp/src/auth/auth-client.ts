import { BASE_URL } from '../config.js';
import { ApiResponse } from '../types/api-response.types.js';
import { Tokens } from '../types/tokens.types.js';
import { TokenStore } from './token-store.js';

export async function refreshTokens(): Promise<Tokens> {
  const currentTokens = TokenStore.load();
  if (!currentTokens) {
    throw new Error('토큰이 없습니다. 먼저 auth.setTokens를 실행하세요.');
  }

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken: currentTokens.refreshToken }),
  });

  const responseBody = (await res.json()) as ApiResponse<Tokens>;

  if (!res.ok) {
    TokenStore.clear();
    throw new Error(`토큰 갱신 실패(${res.status}). 다시 로그인(토큰 재설정)이 필요합니다.`);
  }

  if (!responseBody.ok) {
    TokenStore.clear();
    throw new Error(`${responseBody.error.code}: ${responseBody.error.message}`);
  }

  const tokenPayload = responseBody.data;

  TokenStore.save({
    accessToken: tokenPayload.accessToken,
    refreshToken: tokenPayload.refreshToken,
  });

  return {
    accessToken: tokenPayload.accessToken,
    refreshToken: tokenPayload.refreshToken,
  };
}
