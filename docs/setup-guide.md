# 실행 가이드

## 목차

- [사전 요구사항](#사전-요구사항)
- [백엔드 실행](#백엔드-실행)
- [프론트엔드 실행](#프론트엔드-실행)
- [Docker 실행 (백엔드)](#docker-실행-백엔드)
- [MCP 설정](#mcp-설정)
- [전체 개발 환경](#전체-개발-환경)
- [환경 변수](#환경-변수)

---

## 사전 요구사항

- Node.js 18.0.0 이상
- npm (최신 버전)
- PostgreSQL
- Google OAuth 자격증명

---

## 백엔드 실행

```bash
cd propt-backend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일에 필수 값 입력 (하단 환경 변수 참고)

# DB 마이그레이션
npx prisma migrate dev

# (선택) 시드 데이터
npm run seed

# 개발 모드
npm run start:dev

# 프로덕션
npm run build && npm run start:prod
```

| 스크립트 | 설명 |
|---------|------|
| `npm run start:dev` | 파일 감시 + 자동 재시작 (개발) |
| `npm run start:debug` | 디버그 모드 + 파일 감시 |
| `npm run start:prod` | 프로덕션 환경 실행 |
| `npm run build` | NestJS 프로젝트 빌드 |
| `npm run lint` | ESLint 실행 |
| `npm test` | Jest 테스트 |
| `npm run test:cov` | 커버리지 리포트 |
| `npm run test:e2e` | E2E 테스트 |

**백엔드 포트:** `3000`

---

## 프론트엔드 실행

```bash
cd propt-frontend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.exmaple .env
# VITE_SERVER_URL=http://localhost:3000

# 개발 모드
npm run dev

# 프로덕션
npm run build && npm run preview
```

| 스크립트 | 설명 |
|---------|------|
| `npm run dev` | Vite 개발 서버 (HMR) |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm test` | Vitest 실행 |
| `npm run test:coverage` | 커버리지 리포트 |

**프론트엔드 포트:** `5173`

---

## Docker 실행 (백엔드)

```bash
cd propt-backend
docker build -t propt-backend .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/propt" \
  -e GOOGLE_CLIENT_ID="..." \
  -e GOOGLE_CLIENT_SECRET="..." \
  -e JWT_SECRET="..." \
  -e FRONTEND_URL="http://localhost:5173" \
  propt-backend
```

---

## MCP 설정

### Claude Web (claude.ai)

> Pro, Max, Team, Enterprise 플랜 전용

1. [Claude Web](https://claude.ai)에 접속한 뒤, 프로필 아이콘 클릭 → **설정**을 클릭합니다.
2. **커넥터** 탭을 선택합니다.
3. 페이지 하단의 **커스텀 커넥터 추가**를 클릭합니다.
4. **이름**에는 `프로프트`, **원격 MCP 서버 URL**에는 `https://api.propt.site/mcp/sse`를 입력하고 **추가**를 클릭합니다.
5. 채팅 화면에서 커넥터를 활성화합니다. (채팅창 입력 영역의 **+** 버튼 → **커넥터** → 프로프트 토글 켜기)
6. **프로프트 로그인** 입력하면 사용 준비 완료!

### Claude Code / Claude Desktop

설정 파일에 다음 JSON을 추가합니다:

```json
{
  "mcpServers": {
    "propt": {
      "url": "https://api.propt.site/mcp/sse"
    }
  }
}
```

**설정 파일 위치:**
- Claude Code: `~/.claude/settings.json`
- Claude Desktop (macOS): `~/Library/Application Support/Claude/claude_desktop_config.json`

**애플리케이션 재시작:**
- Claude Code: `claude /restart`
- Claude Desktop: `Cmd + Q` 후 재실행

**프로프트 로그인** 입력하면 사용 준비 완료!

---

## 전체 개발 환경 (2개 터미널)

```bash
# 터미널 1: 백엔드
cd propt-backend && npm run start:dev

# 터미널 2: 프론트엔드
cd propt-frontend && npm run dev
```

**접속 주소:**

- 프론트엔드: `http://localhost:5173`
- 백엔드 API: `http://localhost:3000`
- Swagger 문서: `http://localhost:3000/api`

---

## 환경 변수

### 백엔드 (`propt-backend/.env`)

#### 데이터베이스

| 변수명 | 설명 | 필수 | 예시 |
|--------|------|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | O | `postgresql://user:pw@localhost:5432/propt` |

#### Google OAuth

| 변수명 | 설명 | 필수 | 예시 |
|--------|------|------|------|
| `GOOGLE_CLIENT_ID` | OAuth 클라이언트 ID | O | `123456789012-xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth 클라이언트 시크릿 | O | `GOCSPX-xxx` |
| `GOOGLE_CALLBACK_URL` | OAuth 콜백 URL | O | `http://localhost:3000/auth/google/callback` |

#### JWT 토큰

| 변수명 | 설명 | 필수 | 예시 |
|--------|------|------|------|
| `JWT_SECRET` | 액세스 토큰 서명 시크릿 | O | (임의 문자열) |
| `JWT_EXPIRES_IN` | 액세스 토큰 만료 시간 | O | `30m` |
| `JWT_REFRESH_SECRET` | 리프레시 토큰 서명 시크릿 | O | (임의 문자열) |
| `JWT_REFRESH_EXPIRES_IN` | 리프레시 토큰 만료 시간 | O | `7d` |

#### 서버 / CORS

| 변수명 | 설명 | 필수 | 예시 |
|--------|------|------|------|
| `FRONTEND_URL` | 프론트엔드 URL (CORS, 리다이렉트) | O | `http://localhost:5173` |
| `BACKEND_URL` | 백엔드 서버 URL | X | `http://localhost:3000` |
| `NODE_ENV` | 실행 환경 | O | `development` / `production` |
| `PORT` | 서버 포트 (기본: 3000) | X | `3000` |

#### Swagger

| 변수명 | 설명 | 필수 | 예시 |
|--------|------|------|------|
| `SWAGGER_USER` | Swagger Basic Auth 사용자명 | X | (임의 문자열) |
| `SWAGGER_PASSWORD` | Swagger Basic Auth 비밀번호 | X | (임의 문자열) |

> Swagger 활성화 조건: `NODE_ENV !== 'production'` && `SWAGGER_USER` && `SWAGGER_PASSWORD`

#### Docker

| 변수명 | 설명 | 필수 | 예시 |
|--------|------|------|------|
| `DOCKER_ACCESS` | Docker 레지스트리 액세스 키 | X | (AWS IAM 키) |
| `DOCKER_SECRET` | Docker 레지스트리 시크릿 키 | X | (AWS IAM 시크릿) |

### 프론트엔드 (`propt-frontend/.env`)

| 변수명 | 설명 | 필수 | 예시 |
|--------|------|------|------|
| `VITE_SERVER_URL` | 백엔드 API 서버 URL | O | `http://localhost:3000` |
