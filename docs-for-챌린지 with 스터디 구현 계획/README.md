# Challenge with GPT + 스터디 노트 구현 계획

> 메뉴의 `Chatbot` 을 `Challenge with GPT` 로 교체하고, 셀프 챌린지 기록 + 유저별 노트 공유 기능을 도입하는 작업의 단계별 설계 문서.
> 마포-팔란티어(`/Users/terecal/mapo-palantier-project`) 의 챌린지 모듈을 청사진으로 가져오되, 타워크레인 스택(NestJS + Drizzle + FSD React)에 맞춰 재설계.

---

## 📚 문서 인덱스

| # | 파일 | 핵심 내용 |
|---|---|---|
| 00 | [00-overview.md](./00-overview.md) | 전체 그림, 두 프로젝트 차이, 마일스톤, 의사결정 항목 |
| 01 | [01-database-schema.md](./01-database-schema.md) | Drizzle 스키마 7개 테이블 + 시드 + 마이그레이션 |
| 02 | [02-backend-module.md](./02-backend-module.md) | NestJS challenge 모듈 (CRUD/권한/Zod/GPT/Notes 컨트롤러) |
| 03 | [03-frontend-foundation.md](./03-frontend-foundation.md) | 메뉴/라우트 교체, FSD 폴더 골격, placeholder 페이지 |
| 04 | [04-frontend-ui-3panel.md](./04-frontend-ui-3panel.md) | 카테고리/섹션 사이드바 + 메인 탭 영역 골격 |
| 05 | [05-block-editor.md](./05-block-editor.md) | 주제 블록 에디터 (NOTE/MMD/CHECKLIST/...) |
| 06 | [06-submission-feature.md](./06-submission-feature.md) | 풀이 제출 + 자동 채점 + 어드민 평점 |
| 07 | [07-gpt-integration.md](./07-gpt-integration.md) | Challenge with GPT (학습 대화 로그, 시스템 프롬프트, 공유) |
| 08 | [08-user-notes-sharing.md](./08-user-notes-sharing.md) | 유저별 개인 노트 + 공개/공유 토글 |
| 09 | [09-rollout-checklist.md](./09-rollout-checklist.md) | 시드/회귀/마이그레이션/배포 최종 점검 |

---

## 🛠 권장 진행 순서 (마일스톤)

```
M1 (03)        ─ 메뉴/라우트 교체, 빈 페이지 진입
M2 (01)        ─ DB 스키마 + 마이그레이션 + 시드
M3 (02)        ─ 백엔드 CRUD + 권한
M4 (04)        ─ 프론트 3패널 골격
M5 (05)        ─ 블록 에디터 (가장 큰 작업)
M6 (06)        ─ 풀이 제출 + 자동 채점
M7 (07)        ─ Challenge with GPT 연동
M8 (08)        ─ 유저 노트 + 공유
M9 (09)        ─ 마무리 / 배포 / 회귀
```

각 마일스톤은 독립 PR 가능. M5~M8 은 어느 정도 병렬 가능.

---

## ⚠ 시작 전에 확정해야 할 항목

- OPENAI_API_KEY 보관 위치 (서버 env only)
- 기본 모델 (gpt-4o-mini 권장)
- 노트 공유 기본값 (private 권장)
- 권한 정책 (어드민만 카테고리/섹션 작성, 일반 유저는 풀이/GPT/노트만)
- 기존 `/chatbot` 처리 (제거 / 리다이렉트)

자세한 건 [00-overview.md](./00-overview.md) 의 "의사결정 항목" 섹션 참고.

---

## 🔗 참고 코드 베이스

- **마포-팔란티어 (Spring Boot + React)**
  - `parantier-api/.../challenge/` — 도메인/서비스/매퍼
  - `parantier-front/src/pages/challenge/ChallengePage.tsx` — UI 청사진
- **타워크레인 (현 프로젝트)**
  - `towercrane-for-uiux-server/src/api-doc/` — Postman 유사 모듈 패턴 참고
  - `towercrane-for-uiux-server/src/meeting/` — WebSocket / 메시지 패턴 참고
  - `towercrane-for-uiux-front/src/widgets/app-header/` — 메뉴 라우팅
  - `towercrane-for-uiux-front/src/pages/menu-admin/` — DnD 패턴

---

## 📌 컨벤션 리마인더

- **CSS**: `text-white`, `bg-slate-*` 같은 raw 팔레트 금지. semantic token (`text-text-primary`, `bg-surface-muted`, `text-brand-primary`) 또는 `ui-*` 유틸 사용. (`CLAUDE.md` 참고)
- **API 클라이언트**: `apiRequest<T>(...)` 사용 (`shared/api/http.ts`). `/api` prefix 자동.
- **Zustand**: 세션은 `useSessionStore`, UI 테마는 `useUiStore`.
- **TanStack Query**: 새 도메인은 항상 새 query key prefix 부여 (`['challenge', ...]`).
- **DnD**: 메뉴 관리에서 정착한 패턴 (`closestCenter` + `activationConstraint: { distance: 8 }`) 그대로 재사용.
