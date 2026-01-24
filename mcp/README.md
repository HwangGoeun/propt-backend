# propt-mcp

[Propt](https://www.propt.site) 서비스와 연동하여 프롬프트 템플릿을 관리하는 MCP(Model Context Protocol) 서버입니다.

## 설치

### Claude Code

`~/.claude/settings.json` 파일에 다음을 추가하세요:

```json
{
  "mcpServers": {
    "propt": {
      "command": "npx",
      "args": ["-y", "propt-mcp"]
    }
  }
}
```

### Claude Desktop

`claude_desktop_config.json` 파일에 다음을 추가하세요:

```json
{
  "mcpServers": {
    "propt": {
      "command": "npx",
      "args": ["-y", "propt-mcp"]
    }
  }
}
```

## 사용 방법

### 1. 로그인

먼저 Propt 계정으로 로그인해야 합니다:

```
propt_auth_login 도구를 사용해주세요
```

1. 코드 없이 실행하면 로그인 URL이 제공됩니다
2. 브라우저에서 로그인 후 받은 6자리 코드를 입력하면 로그인이 완료됩니다

### 2. 템플릿 조회

```
propt_template_list 도구로 저장된 템플릿 목록을 확인하세요
```

### 3. 템플릿 사용

```
propt_get_template 도구로 특정 템플릿의 상세 정보를 가져오세요
```

## 제공 도구

| 도구명 | 설명 |
|--------|------|
| `propt_auth_login` | Propt 로그인 (Device Code Flow) |
| `propt_auth_logout` | 로그아웃 |
| `propt_template_list` | 저장된 템플릿 목록 조회 |
| `propt_get_template` | 특정 템플릿 상세 조회 |
| `propt_prepare_batch` | 배치 실행 준비 |

## 요구 사항

- Node.js 18 이상
- Propt 계정

## 라이선스

MIT
