# towercrane-for-uiux

UI/UX 시스템과 내부 관리자형 패턴 카탈로그를 정리하기 위한 저장소입니다.

## Projects

- `towercrane-for-uiux-front`
  - 왼쪽 사이드바에 카테고리를 추가할 수 있는 패턴 허브
  - 본문 영역에서 선택한 카테고리의 GitHub 프로토타입 링크를 관리
  - 프로토타입별 문서 페이지 (섹션/문서 2단 + 6종 블록 + Lexical 에디터 + Mermaid)
  - Vite + React + TypeScript
  - Tailwind CSS + Radix UI
  - Zustand + react-hook-form + zod
  - React Query + TanStack Table
- `towercrane-for-uiux-server`
  - NestJS + Drizzle + SQLite
  - 카테고리 / 프로토타입 / 문서 / 블록 저장 API
  - S3 Presigned URL 발급 (Lexical 이미지 업로드용)
  - DB 파일 교체형 운영 구조

## Getting Started

### 1. 프런트 실행

```bash
cd towercrane-for-uiux-front
cp .env.example .env
pnpm install
pnpm dev
```

기본적으로 `http://localhost:5174` 에서 실행되고, 백엔드는 `http://127.0.0.1:3000/api` 를 바라봅니다.

### 2. 서버 실행

```bash
cd towercrane-for-uiux-server
cp .env.example .env
# .env 파일 열어서 AWS / AI 키 값 채우기 (아래 가이드 참고)
pnpm install
pnpm start:dev
```

## 환경변수 (.env) 가이드

> `.env` 파일은 **커밋되지 않습니다** (루트·프런트·서버 모두 `.gitignore` 처리됨).
> `.env.example`을 복사해서 실제 값을 채워 사용하세요.

### `towercrane-for-uiux-server/.env`

```env
# 서버 포트 및 DB 경로
PORT=3000
DATABASE_FILE=./data/towercrane-catalog.sqlite

# AWS S3 (Lexical 에디터 이미지 업로드용 - 필수)
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_S3_REGION=ap-northeast-2

# AI API 키 (선택)
GEMINI_API_KEY=
OPENAI_API_KEY=
```

| 키 | 필수 여부 | 설명 |
|---|---|---|
| `PORT` | 선택 | NestJS 서버 포트. 기본 `3000` |
| `DATABASE_FILE` | 선택 | SQLite 파일 경로. 기본 `./data/towercrane-catalog.sqlite` |
| `AWS_ACCESS_KEY_ID` | **필수** | S3 이미지 업로드용 IAM 액세스 키 (PutObject 권한 필요) |
| `AWS_SECRET_ACCESS_KEY` | **필수** | 위 키의 시크릿 |
| `AWS_S3_BUCKET_NAME` | **필수** | 이미지 업로드 대상 버킷명 |
| `AWS_S3_REGION` | **필수** | 버킷 리전 (예: `ap-northeast-2`) |
| `GEMINI_API_KEY` | 선택 | 추후 AI 기능 연동용 |
| `OPENAI_API_KEY` | 선택 | 추후 AI 기능 연동용 |

#### S3 버킷 준비사항

이미지 업로드를 정상 동작시키려면 버킷에 **CORS 설정**이 필요합니다 (브라우저에서 Presigned PUT을 직접 호출하기 때문):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["http://localhost:5174", "https://your-production-domain.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

IAM 사용자는 최소 `s3:PutObject` + `s3:GetObject` 권한을 대상 버킷에 대해 가지고 있어야 합니다.

### `towercrane-for-uiux-front/.env`

```env
VITE_API_BASE_URL=http://127.0.0.1:3000/api
```

| 키 | 필수 여부 | 설명 |
|---|---|---|
| `VITE_API_BASE_URL` | 선택 | 백엔드 API 베이스 URL. 기본 `http://127.0.0.1:3000/api` |

## 보안 주의

- 실제 AWS / OpenAI / Gemini 키는 **절대 커밋하지 마세요**. `.gitignore`로 차단되어 있지만 실수로 힘을 주어 `git add -f` 하지 않도록 주의합니다.
- 공개 저장소에 실수로 키가 노출된 경우 **즉시 키를 회전**하세요 (AWS IAM / OpenAI 대시보드).
- 팀원 간 키 공유는 1Password 등 Secret Manager 를 사용하고 `.env.example` 만 레포에 두세요.

## Scripts

프런트:

```bash
pnpm dev         # Vite 개발 서버
pnpm typecheck   # tsc --noEmit
pnpm build       # 프로덕션 빌드
pnpm lint        # ESLint
```

서버:

```bash
pnpm start:dev   # NestJS watch 모드
pnpm build       # 프로덕션 빌드
pnpm test        # 단위 테스트
```
