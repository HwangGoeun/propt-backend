/**
 * JWT 토큰의 payload를 디코딩합니다.
 */
export function decodeJwt(token: string): { exp?: number; iat?: number } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf8');

    return JSON.parse(decoded) as { exp?: number; iat?: number };
  } catch (error) {
    throw new Error(`JWT 디코딩 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * JWT 토큰의 남은 시간(초)을 반환합니다.
 * 만료되었으면 음수를 반환합니다.
 */
export function getTokenRemainingTime(token: string): number {
  const payload = decodeJwt(token);

  if (!payload.exp) {
    throw new Error('Token does not have expiration time');
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp - now;
}

/**
 * JWT 토큰이 곧 만료되는지 확인합니다.
 * @param token JWT 토큰
 * @param thresholdSeconds 임계값 (초 단위, 기본값: 1800 = 30분)
 */
export function isTokenExpiringSoon(token: string, thresholdSeconds: number = 1800): boolean {
  try {
    const remainingTime = getTokenRemainingTime(token);
    return remainingTime < thresholdSeconds;
  } catch {
    // 디코딩 실패 시 갱신이 필요하다고 판단
    return true;
  }
}
