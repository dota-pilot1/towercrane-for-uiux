# towercrane-for-uiux-server

카테고리와 GitHub 프로토타입 레지스트리를 저장하기 위한 NestJS + Drizzle + SQLite 서버입니다.

## Stack

- NestJS
- Drizzle ORM
- SQLite
- zod

## 역할

- 사이드바 카테고리 저장
- 카테고리별 GitHub 프로토타입 링크 저장
- SQLite 파일 교체를 통한 데이터셋 전환
- 프런트 카탈로그 UI가 붙을 최소 API 제공

## API

- `GET /api`
  - 서버 상태와 SQLite 연결 정보 반환
- `GET /api/catalog/categories`
  - 전체 카테고리와 프로토타입 반환
- `GET /api/catalog/categories/:categoryId`
  - 단일 카테고리 상세 반환
- `POST /api/catalog/categories`
  - 카테고리 추가
- `POST /api/catalog/categories/:categoryId/prototypes`
  - 프로토타입 추가

## Database

- 기본 DB 경로: `./data/towercrane-catalog.sqlite`
- 환경변수 `DATABASE_FILE`로 다른 SQLite 파일을 지정할 수 있습니다.
- 앱 시작 시 테이블이 없으면 자동 생성하고, 비어 있으면 기본 시드 데이터를 넣습니다.

## Run

```bash
pnpm install
pnpm start:dev
```

## Env

```bash
cp .env.example .env
```

## Notes

- SQLite 파일만 교체하면 다른 프로젝트용 카테고리 세트를 빠르게 복제할 수 있습니다.
- 이후 권한, 활동 로그, SSE, WebSocket을 추가해도 카테고리-프로토타입 모델을 유지하도록 설계했습니다.
