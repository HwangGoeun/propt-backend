import { randomUUID } from 'crypto';

/**
 * UUID v4를 사용하여 고유한 난수 사용자 이름을 생성합니다.
 *
 * @returns 사용자 이름 (형식: user_{8자리 16진수})
 * @example user_a3f2b8c1
 */
export function generateRandomUsername(): string {
  const uniqueId = randomUUID().split('-')[0];

  return `user_${uniqueId}`;
}
