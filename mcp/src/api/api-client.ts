import { refreshTokens } from '../auth/auth-client.js';
import { TokenStore } from '../auth/token-store.js';
import { BASE_URL } from '../config.js';

export async function apiRequest(path: string, init: RequestInit = {}) {
  const tokens = TokenStore.load();
  if (!tokens) {
    throw new Error('토큰이 없습니다. 먼저 propt_auth_login을 실행하세요.');
  }

  const requestUrl = `${BASE_URL}${path}`;

  const firstResponse = await fetch(requestUrl, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${tokens.accessToken}`,
    },
  });

  if (firstResponse.status !== 401) return firstResponse;

  await refreshTokens();

  const refreshedTokens = TokenStore.load();
  if (!refreshedTokens) {
    throw new Error('토큰 갱신 후 토큰을 찾을 수 없습니다. 다시 로그인해주세요.');
  }

  const retryResponse = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${refreshedTokens.accessToken}`,
    },
  });

  return retryResponse;
}
