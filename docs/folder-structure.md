# 폴더 구조

## 목차

- [백엔드 (`propt-backend/`)](#백엔드-propt-backend)
- [프론트엔드 (`propt-frontend/`)](#프론트엔드-propt-frontend)

---

## 백엔드 (`propt-backend/`)

```
propt-backend/
├── src/
│   ├── main.ts                        # 진입점 (CORS, Swagger 설정)
│   ├── app.module.ts                  # 루트 모듈
│   │
│   ├── config/                        # 설정
│   │   ├── google.config.ts           # Google OAuth 설정
│   │   └── jwt.config.ts              # JWT 설정
│   │
│   ├── auth/                          # 인증 모듈
│   │   ├── auth.controller.ts         # 인증 엔드포인트
│   │   ├── auth.service.ts            # 인증 비즈니스 로직
│   │   ├── token.service.ts           # JWT 토큰 생성/검증
│   │   ├── strategies/                # Passport 전략
│   │   │   ├── google.strategy.ts
│   │   │   └── jwt.strategy.ts
│   │   ├── guards/                    # 인증 가드
│   │   │   ├── google-oauth.guard.ts
│   │   │   └── jwt-auth.guard.ts
│   │   └── dto/                       # 데이터 전송 객체
│   │
│   ├── template/                      # 템플릿 모듈
│   │   ├── template.controller.ts     # CRUD 엔드포인트
│   │   ├── template.service.ts        # 비즈니스 로직
│   │   ├── template.repository.ts     # 데이터 접근
│   │   └── dto/                       # DTO
│   │
│   ├── mcp/                           # MCP 모듈 (Claude 연동)
│   │   ├── mcp-server.service.ts      # MCP 서버 (SSE)
│   │   ├── mcp-auth.service.ts        # 디바이스 코드 인증
│   │   ├── mcp-auth.controller.ts     # MCP 인증 엔드포인트
│   │   ├── mcp-sse.controller.ts      # SSE 컨트롤러
│   │   └── mcp-device-code.repository.ts
│   │
│   ├── user/                          # 사용자 모듈
│   │   └── user.repository.ts
│   │
│   ├── prisma/                        # Prisma ORM
│   │   └── prisma.service.ts
│   │
│   └── common/                        # 공용
│       ├── filters/                   # 예외 필터
│       ├── interceptors/              # 응답 인터셉터
│       ├── decorators/                # 커스텀 데코레이터
│       ├── guards/                    # 공용 가드
│       ├── constants/                 # 상수
│       └── types/                     # 타입 정의
│
├── prisma/
│   ├── schema.prisma                  # DB 스키마
│   ├── seed.ts                        # 시드 데이터
│   └── migrations/                    # 마이그레이션
│
├── test/                              # E2E 테스트
├── Dockerfile                         # Docker 빌드
└── package.json
```

---

## 프론트엔드 (`propt-frontend/`)

```
propt-frontend/
├── src/
│   ├── main.tsx                       # React 진입점
│   ├── App.tsx                        # 루트 컴포넌트
│   │
│   ├── components/                    # 컴포넌트 (기능별 그룹)
│   │   ├── auth/                      # 인증 (Google 로그인 버튼)
│   │   ├── common/                    # 공용 (header, footer, layout)
│   │   ├── template/                  # 템플릿 (편집기, 목록, 미리보기)
│   │   ├── preview/                   # 실행 결과 미리보기
│   │   ├── onboarding/                # 온보딩 위저드
│   │   ├── sidebar/                   # 사이드바
│   │   ├── site-header/               # 헤더
│   │   └── ui/                        # shadcn/ui (26개 기본 컴포넌트)
│   │
│   ├── pages/                         # 페이지
│   │   ├── login.tsx                  # 로그인
│   │   ├── mcp-code.tsx               # MCP 코드 입력
│   │   └── templates.tsx              # 템플릿 관리
│   │
│   ├── stores/                        # Zustand 상태 관리
│   │   ├── auth-store.ts
│   │   ├── template-store.ts
│   │   └── onboarding-store.ts
│   │
│   ├── hooks/                         # 커스텀 훅
│   │   ├── use-templates.ts
│   │   ├── use-auto-save.ts
│   │   ├── use-mobile.ts
│   │   └── use-before-unload.ts
│   │
│   ├── lib/                           # 유틸리티
│   │   ├── api/                       # API 클라이언트 (Axios)
│   │   │   ├── client.ts
│   │   │   ├── templates.ts
│   │   │   ├── auth.ts
│   │   │   ├── batch.ts
│   │   │   └── mcp.ts
│   │   └── utils.ts
│   │
│   ├── constants/                     # 상수
│   │   ├── api-endpoints.ts
│   │   └── output-formats.ts
│   │
│   └── types/                         # TypeScript 타입
│       ├── template.ts
│       ├── user.ts
│       └── api.ts
│
├── index.html
├── vite.config.ts
├── vitest.config.ts
└── package.json
```
