# API 명세

## 목차

- [공통 응답 형식](#공통-응답-형식)
- [인증 (`/auth`)](#인증-auth)
- [템플릿 (`/templates`)](#템플릿-templates)
- [MCP (`/mcp`)](#mcp-mcp)
- [MCP 도구](#mcp-도구)

---

## 공통 응답 형식

**성공:**
```json
{
  "ok": true,
  "data": { ... }
}
```

**에러:**
```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지"
  }
}
```

---

## 인증 (`/auth`)

### `GET /auth/google` — Google OAuth 로그인 시작

- **인증:** 불필요
- **쿼리:** `state` (선택, `"mcp"`이면 MCP 디바이스 코드 플로우)
- **응답:** Google 동의 화면으로 리다이렉트

### `GET /auth/google/callback` — Google OAuth 콜백

- **인증:** GoogleOAuthGuard
- **동작:** 사용자 생성/조회 → JWT 발급 → 쿠키 설정
- **응답:**
  - 일반: `{FRONTEND_URL}/templates`로 리다이렉트
  - MCP: `{FRONTEND_URL}/mcp/code?code={6자리}`로 리다이렉트
- **Set-Cookie:** `accessToken` (HttpOnly, 15분), `refreshToken` (HttpOnly, 7일)

### `POST /auth/guest` — 게스트 로그인

- **요청:**
  ```json
  { "state": "mcp" }  // 선택
  ```
- **응답:** `{ "ok": true, "data": { "code": "ABC123" } }` (MCP인 경우)
- **Set-Cookie:** accessToken, refreshToken

### `GET /auth/me` — 현재 사용자 정보

- **인증:** 쿠키 자동 검증
- **응답:**
  ```json
  {
    "ok": true,
    "data": {
      "isAuthenticated": true,
      "user": {
        "id": "cuid...",
        "email": "user@example.com",
        "name": "User Name",
        "hasCompletedOnboarding": false
      }
    }
  }
  ```

### `PATCH /auth/onboarding` — 온보딩 상태 업데이트

- **인증:** JwtAuthGuard
- **요청:** `{ "completed": true }`
- **응답:** `{ "ok": true, "data": null }`

### `POST /auth/refresh` — 토큰 갱신

- **요청:** `{ "refreshToken": "eyJhbGc..." }`
- **응답:**
  ```json
  {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": "15m"
  }
  ```

### `POST /auth/logout` — 로그아웃

- **응답:** `{ "ok": true, "data": null }`
- **Clear-Cookie:** accessToken, refreshToken

### `DELETE /auth/withdraw` — 회원 탈퇴

- **인증:** JwtAuthGuard
- **동작:** 사용자 + 모든 템플릿 + 디바이스 코드 삭제
- **응답:** `{ "ok": true, "data": null }`

### `POST /auth/code/generate` — MCP 디바이스 코드 발급

- **인증:** JwtAuthGuard
- **응답:** `{ "ok": true, "data": { "code": "ABC123" } }`
- **TTL:** 3분

---

## 템플릿 (`/templates`)

> 모든 엔드포인트에 **JwtAuthGuard** 필수

### `POST /templates` — 템플릿 생성

- **요청:**
  ```json
  {
    "title": "블로그 제목 생성기",
    "content": "{keyword}에 대한 블로그 제목을 {language}로 작성해줘",
    "variables": [
      { "name": "keyword", "description": "검색 키워드" },
      { "name": "language", "description": "대상 언어" }
    ],
    "outputType": "markdown"
  }
  ```
- **응답:** 201 Created + TemplateResponseDto
- **에러:** 409 (중복 제목)

### `GET /templates` — 템플릿 목록 조회

- **응답:** 현재 사용자의 모든 템플릿 (최신순)

### `GET /templates/:id` — 템플릿 상세 조회

- **에러:** 404 (없음), 403 (권한 없음)

### `PATCH /templates/:id` — 템플릿 수정

- **요청:** title, content, variables, outputType 중 선택적 수정
- **에러:** 404, 403, 409 (중복 제목)

### `DELETE /templates/:id` — 템플릿 삭제

- **에러:** 404

---

## MCP (`/mcp`)

### `POST /mcp/exchange` — 디바이스 코드 → 토큰 교환

- **요청:** `{ "code": "ABC123" }`
- **응답:**
  ```json
  {
    "ok": true,
    "data": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": "15m",
      "userType": "social"
    }
  }
  ```
- **에러:** 401 (유효하지 않거나 만료된 코드)

### `GET /mcp/code/status` — 디바이스 코드 상태 확인

- **쿼리:** `code=ABC123`
- **응답:** `{ "ok": true, "data": { "used": false } }`

### `GET /mcp/sse` — SSE 연결 (Claude Web / Desktop / Code 공통)

- **프로토콜:** Server-Sent Events

### `POST /mcp/messages` — MCP 메시지 처리

- **쿼리:** `sessionId` (SSE 세션 ID)
- **요청:** MCP 프로토콜 메시지

---

## MCP 도구

| 도구 | 설명 | 파라미터 |
|------|------|----------|
| `propt_auth_login` | Claude에서 로그인 | `code?` (6자리) |
| `propt_auth_logout` | Claude에서 로그아웃 | 없음 |
| `propt_auth_status` | 로그인 상태 확인 | 없음 |
| `propt_template_list` | 템플릿 목록 조회 | 없음 |
| `propt_get_template` | 템플릿 상세 조회 | `templateId` |
| `propt_prepare_batch` | 배치 실행 준비 | `templateId`, `variableSets[]` |
