import { refreshTokens } from '../auth/auth-client.js';
import { TokenStore } from '../auth/token-store.js';
import { BASE_URL } from '../config.js';
import { unwrapApiResponse, type ApiSuccessResponse } from '../types/api-response.types.js';
import type { Template } from '../types/template.types.js';
import { isTokenExpiringSoon } from '../utils/jwt.util.js';

export async function apiRequest(path: string, init: RequestInit = {}) {
  let tokens = await TokenStore.load();
  if (!tokens) {
    throw new Error('토큰이 없습니다. 먼저 propt_auth_login을 실행하세요.');
  }

  // Proactive Refresh: Access token이 30분 이하로 남았으면 미리 갱신
  if (isTokenExpiringSoon(tokens.accessToken, 1800)) {
    try {
      await refreshTokens();
      const newTokens = await TokenStore.load();
      if (!newTokens) {
        throw new Error('토큰 갱신 후 토큰을 찾을 수 없습니다. 다시 로그인해주세요.');
      }
      tokens = newTokens;
    } catch (error) {
      console.error('Proactive refresh 실패:', error);
    }
  }

  const requestUrl = `${BASE_URL}${path}`;

  const firstResponse = await fetch(requestUrl, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${tokens.accessToken}`,
    },
  });

  // 401 에러 발생 시 한 번 더 refresh 시도 (Proactive refresh가 실패했을 경우 대비)
  if (firstResponse.status !== 401) return firstResponse;

  await refreshTokens();

  const refreshedTokens = await TokenStore.load();
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

export async function getTemplate(id: string): Promise<Template> {
  const response = await apiRequest(`/templates/${id}`);

  if (!response.ok) {
    throw new Error(`템플릿 조회 실패: ${response.status}`);
  }

  const payload = (await response.json()) as ApiSuccessResponse<Template>;

  return unwrapApiResponse(payload);
}
