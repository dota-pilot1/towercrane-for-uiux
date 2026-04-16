# towercrane-for-uiux

UI/UX 시스템과 내부 관리자형 패턴 카탈로그를 정리하기 위한 저장소입니다.

## Projects

- `towercrane-for-uiux-front`
  - 왼쪽 사이드바에 카테고리를 추가할 수 있는 패턴 허브
  - 본문 영역에서 선택한 카테고리의 GitHub 프로토타입 링크를 관리
  - Vite + React + TypeScript
  - Tailwind CSS + Radix UI
  - Zustand + react-hook-form + zod
  - React Query + TanStack Table
- `towercrane-for-uiux-server`
  - NestJS + Drizzle + SQLite
  - 카테고리 / 프로토타입 저장 API
  - DB 파일 교체형 운영 구조

## Getting Started

```bash
cd towercrane-for-uiux-front
pnpm install
pnpm dev
```

```bash
cd towercrane-for-uiux-server
pnpm install
pnpm start:dev
```
