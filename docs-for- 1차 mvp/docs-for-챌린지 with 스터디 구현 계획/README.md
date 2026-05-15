# Study Diary (스터디 다이어리) 구현 계획

> 메뉴의 `Chatbot` 을 `Study Diary` 로 교체하고, 계층형 학습 기록(1차 주제 → 2차 주제 → 3차 노트) + 노트 공개 기능을 도입하는 작업의 단계별 설계 문서.

---

## 📚 문서 인덱스

| # | 파일 | 핵심 내용 |
|---|---|---|
| 00 | [00-overview.md](./00-overview.md) | Study Diary 전체 그림, 3단계 구조, 마일스톤 |
| 01 | [01-database-schema.md](./01-database-schema.md) | Drizzle 스키마: categories, sections, user_notes |
| 02 | [02-backend-module.md](./02-backend-module.md) | NestJS challenge 모듈 (CRUD API + 권한) |
| 03 | [03-frontend-foundation.md](./03-frontend-foundation.md) | 메뉴/라우트 교체, FSD 폴더 구조 |
| 04 | [04-frontend-ui-3panel.md](./04-frontend-ui-3panel.md) | 3패널 UI: 1차/2차/3차 + "+" 버튼 모달 |
| 05 | [05-block-editor.md](./05-block-editor.md) | 노트 에디터 (마크다운/텍스트) |
| 06 | [06-submission-feature.md](./06-submission-feature.md) | (선택) 풀이 제출 |
| 07 | [07-gpt-integration.md](./07-gpt-integration.md) | (선택) GPT 대화 로그 |
| 08 | [08-user-notes-sharing.md](./08-user-notes-sharing.md) | 노트 공개/공유 토글 |
| 09 | [09-rollout-checklist.md](./09-rollout-checklist.md) | 최종 점검 + 배포 |

---

## 🎯 현재 상태 (2026-05-11)

✅ **완료 (M4)**:
- 메뉴 교체: Chatbot → Study Diary
- DB 스키마 & 시드 데이터
- 백엔드 API (categories, sections, user_notes CRUD)
- **3패널 UI + "+" 버튼 동작 완성**
  - 1차 주제 추가 기능
  - 2차 주제 추가 기능
  - 2차 주제 선택 후 노트 패널 활성화

🔄 **진행 중 (M5)**:
- 노트 작성/수정/삭제 UI
- 노트 에디터 (마크다운)

⏳ **차후**:
- M6~M8: 공유, 풀이, GPT (선택사항)

---

## 🛠 권장 진행 순서

```
M1 (03)        ─ ✅ 완료: 메뉴/라우트 교체
M2 (01)        ─ ✅ 완료: DB 스키마 + 마이그레이션 + 시드
M3 (02)        ─ ✅ 완료: 백엔드 CRUD API
M4 (04)        ─ ✅ 완료: 3패널 UI + "+" 버튼
M5 (05)        ─ 🔄 진행: 노트 에디터 (CRUD UI)
M6 (08)        ─ ⏳ 차후: 노트 공개/공유
M7 (06)        ─ ⏳ 차후: (선택) 풀이 제출
M8 (07)        ─ ⏳ 차후: (선택) GPT 대화 로그
M9 (09)        ─ ⏳ 최종: 점검 + 배포
```

각 마일스톤은 독립 PR 가능.

---

## 🏗 3단계 계층 구조

```
1차 주제 (Categories)
├─ Spring Boot
│  ├─ 1회차 (2차 주제 / Sections)
│  ├─ 2회차
│  └─ 3회차
│     └─ 사용자 노트들... (3차 본문 / UserNotes)
│        ├─ "Spring 첫 시작" (private)
│        ├─ "데이터베이스 연동" (shared)
│        └─ ...
└─ React
   ├─ 1회차
   └─ ...
```

---

## ⚙️ 기술 스택

| 계층 | 기술 |
|---|---|
| 백엔드 | NestJS 11 + Drizzle ORM + SQLite |
| 프론트 | React 19 + Vite + TanStack Query + FSD |
| 스타일 | Tailwind + semantic tokens (`text-text-primary`, `bg-surface-muted`, etc.) |
| 폼 | Zod 검증 |
| 인증 | 세션 토큰 (DB 저장) |

---

## 📋 마일스톤별 산출물

| M | 타이틀 | PR 수 | 예상 시간 |
|---|---|---|---|
| M1 | 메뉴/라우트 교체 | 1 | 30min |
| M2 | DB + 시드 | 1 | 1h |
| M3 | 백엔드 CRUD | 1~2 | 2~3h |
| M4 | 3패널 UI | 1 | 2h |
| M5 | 노트 에디터 | 1~2 | 3h |
| M6 | 공개/공유 | 1 | 1h |
| M7 | (선택) 풀이 | 1 | 2h |
| M8 | (선택) GPT | 1 | 2h |
| M9 | 마무리 | 1 | 1h |

---

## 🔑 주요 결정사항

- **권한**: 어드민만 1차/2차 주제 생성. 일반 사용자는 3차 노트만 작성.
- **노트 공개**: 기본값 `private`, 사용자가 선택해 `shared` 로 변경 가능.
- **GPT (선택사항)**: 필요시 별도 모듈로 추가. 현재는 노트 공유 후 2차 마일스톤.
- **기존 Chatbot**: 완전 제거 (리다이렉트 불필요).

---

## 📌 컨벤션 리마인더

### CSS 색상
✅ **사용할 것**:
- `text-text-primary`, `text-text-secondary`, `text-text-muted`
- `bg-surface-muted`, `bg-surface-raised`, `bg-brand-glass`
- `border-surface-border`, `border-brand-border`
- `ui-text-primary`, `ui-panel`, `ui-panel-soft`, `ui-input`

❌ **금지**:
- `text-white`, `text-slate-*`, `text-emerald-*`
- `bg-white`, `bg-slate-*`, `bg-emerald-500`
- raw 팔레트 색상

### API 클라이언트
```ts
import { apiRequest } from '@shared/api/http'
const data = await apiRequest<MyType>('/challenge/categories')
```

### TanStack Query Keys
```ts
const CHALLENGE_KEYS = {
  all: ['challenge'] as const,
  categories: () => [...CHALLENGE_KEYS.all, 'categories'] as const,
  sections: (categoryId) => [...CHALLENGE_KEYS.all, 'sections', categoryId] as const,
  userNotes: (sectionId) => [...CHALLENGE_KEYS.all, 'userNotes', sectionId] as const,
}
```

---

## 🔗 참고 코드

**타워크레인 내부**:
- `towercrane-for-uiux-server/src/api-doc/` — 컨트롤러/서비스 패턴
- `towercrane-for-uiux-front/src/features/` — FSD 폴더 구조
- `towercrane-for-uiux-front/src/shared/ui/` — 공유 컴포넌트 라이브러리

---

## 👉 다음 액션

1. ✅ 00-overview.md 검토 완료
2. ✅ 01-database-schema.md 검토 완료
3. ✅ 04-frontend-ui-3panel.md 검토 완료
4. **→ M5 시작**: 05-block-editor.md 검토 후 노트 CRUD UI 구현
