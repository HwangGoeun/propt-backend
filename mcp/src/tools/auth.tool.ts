import { setTokens } from '../auth/manual-auth.js';
import { TokenStore } from '../auth/token-store.js';
import { Tokens } from '../types/tokens.types.js';

export function authSetTokens(tokens: Tokens) {
  const accessToken = tokens.accessToken?.trim();
  const refreshToken = tokens.refreshToken?.trim();

  if (!accessToken || !refreshToken) {
    throw new Error('액세스 토큰 혹은 리프레시 토큰이 존재하지 않습니다.');
  }

  setTokens(tokens);

  return { ok: true };
}

export function authLogout() {
  TokenStore.clear();

  return { ok: true };
}
