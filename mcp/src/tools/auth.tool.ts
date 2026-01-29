import { exchangeDeviceCode, getLoginUrl } from '../auth/browser-login.js';
import { TokenStore } from '../auth/token-store.js';

/**
 * 통합 로그인 툴
 * - 코드 없이 실행 → 로그인 URL 안내
 * - 코드와 함께 실행 → 토큰 교환
 */
export async function authLogin(code?: string) {
  if (code && code.trim().length > 0) {
    if (code.trim().length !== 6) {
      throw new Error('코드는 6자리여야 합니다.');
    }

    await exchangeDeviceCode(code);

    return {
      step: 'complete',
      message: '✅ 로그인 완료! Propt를 자유롭게 이용하세요.',
    };
  }

  // 코드가 없으면 URL 안내
  const url = getLoginUrl();

  return {
    step: 'url',
    url,
    message: `🔐 로그인이 필요합니다.

1. 아래 URL을 브라우저에서 여세요:
   ${url}

2. 로그인 완료 후 표시되는 6자리 코드를 복사하세요.

3. 이 툴을 다시 실행하고 code 파라미터에 코드를 입력하세요.
   예: propt_auth_login(code: "ABC123")`,
  };
}

/**
 * 로그아웃
 */
export async function authLogout() {
  await TokenStore.clear();

  return { ok: true, message: '로그아웃 완료!' };
}
