# 00. 전체 개요 — Challenge with GPT + 스터디 노트 공유

> **목표**: 기존 `Chatbot` 메뉴를 `Challenge with GPT`로 교체하고, 자기주도 학습(셀프 챌린지) 기록 + 유저별 노트 공유 기능을 도입한다.
> **참고**: `/Users/terecal/mapo-palantier-project` 의 `challenge` 모듈을 청사진으로 사용하되, 스택 차이를 흡수해서 재구현한다.

---

## 1. 한눈에 보는 비교

| 항목 | 마포-팔란티어 (참고) | 타워크레인 (현 프로젝트) |
|---|---|---|
| 백엔드 | Spring Boot 4 + MyBatis | **NestJS 11 + Drizzle ORM** |
| DB | SQLite / PostgreSQL | **SQLite (better-sqlite3)** |
| 인증 | JWT (jjwt) | **세션 토큰 (DB 저장)** |
| 프론트 | React 19 + Vite + TanStack | React 19 + Vite + TanStack (거의 동일) |
| 폼 검증 | Zod | Zod (동일) |
| 드래그 | dnd-kit | dnd-kit (동일) |
| 에디터 | Lexical | Lexical (동일) |
| 다이어그램 | Mermaid | Mermaid (동일) |
| 폴더 구조 | features 중심 평탄화 | **FSD (entities/features/widgets/pages/shared)** |
| 권한 | `ADMIN` / `USER` | `admin` / `user` (소문자) |

**핵심 차이**: 백엔드 ORM/DB가 다르고(Drizzle), 프론트가 FSD라서 동일 코드 복붙이 불가능. **데이터 모델/의도는 그대로 가져오되, 구현은 현 프로젝트 컨벤션에 맞춰 다시 짠다.**

---

## 2. 새 기능의 정체성

기존 마포 챌린지는 **카테고리 → 섹션(회차) → 주제 블록 + 풀이 제출** 3단 구조다.
타워크레인 버전은 여기에 **두 가지를 더 얹는다**:

1. **Challenge with GPT** — 각 섹션/주제에 GPT와의 학습 대화 로그를 남길 수 있다.
   - 단순 챗봇이 아니라 "이 챌린지를 풀면서 GPT에게 물어본 흔적"이 곧 학습 자산이 되도록.
2. **유저별 노트 공유** — 풀이 제출과 별도로, 각 유저가 자기만의 노트를 남기고 그걸 **선택적으로 공개**할 수 있다.
   - 처음엔 비공개(default), 나중에 "공유" 토글로 다른 사람들에게 노출.

---

## 3. URL / 메뉴 구조

| 항목 | 값 |
|---|---|
| 메뉴 표시명 | `Challenge with GPT` (헤더) / 좌측 사이드바도 동일 |
| 라우트 경로 | `/challenge` (마포는 `:5173/challenge`, 타워크레인도 동일하게 정렬) |
| sectionId | `challenge` (메뉴 DB → 라우터 매핑 키) |
| Lucide 아이콘 | `Trophy` 또는 `Sparkles` (헤더용) — 추후 협의 |
| 권한 | 비로그인은 진입 차단 (요구되면 게스트 읽기 가능 옵션화) |

> ⚠️ 기존 `Chatbot` 메뉴는 **이름/sectionId/icon** 모두 교체된다. 라우트도 `/chatbot` → `/challenge` 로 갈아끼운다. 기존 `chatbot-page` placeholder는 제거하고, 동일 자리에 새 페이지를 둔다.

---

## 4. 단계별 문서 구성 (이 폴더)

```
docs-for-챌린지 with 스터디 구현 계획/
├── 00-overview.md                  ← (이 파일) 전체 그림과 의사결정
├── 01-database-schema.md           ← Drizzle 스키마 + 마이그레이션 전략
├── 02-backend-module.md            ← NestJS challenge 모듈 (CRUD + 권한)
├── 03-frontend-foundation.md       ← FSD 폴더, 라우터, 메뉴 교체, 헤더 매핑
├── 04-frontend-ui-3panel.md        ← 카테고리/섹션/콘텐츠 3패널 UI
├── 05-block-editor.md              ← 주제 블록(NOTE/MMD/CHECKLIST/...) 에디터
├── 06-submission-feature.md        ← 풀이 제출 + 자동 채점 + 어드민 평점
├── 07-gpt-integration.md           ← Challenge with GPT (AI 대화 로그)
├── 08-user-notes-sharing.md        ← 유저별 개인 노트 + 공개/공유 토글
└── 09-rollout-checklist.md         ← 시드 변경 / DB 리셋 / 회귀 체크 / 배포
```

각 문서는 **독립적으로 PR 단위로 진행 가능**하도록 쪼갰다. 위에서 아래로 순서대로 진행하는 것이 안전하지만, 04~08은 어느 정도 병렬 가능하다.

---

## 5. 마일스톤 (권장 진행 순서)

| 단계 | 산출물 | 의존 | 예상 PR 수 |
|---|---|---|---|
| **M1. 기반 작업** | 메뉴/라우트 교체, 빈 challenge 페이지 진입 가능 | — | 1 |
| **M2. 데이터 계층** | Drizzle 스키마, 마이그레이션, 시드 카테고리 1개 | M1 | 1 |
| **M3. 백엔드 CRUD** | NestJS challenge 모듈 (categories/sections/topics/submissions) | M2 | 1~2 |
| **M4. 프론트 3패널 골격** | 카테고리/섹션 사이드바 + 가운데 빈 콘텐츠 영역 | M3 | 1 |
| **M5. 블록 에디터** | 주제 블록(NOTE/MMD/CHECKLIST 등) 작성/저장 | M4 | 1~2 |
| **M6. 풀이 제출** | GitHub URL + 체크리스트 + 자동 채점 + 어드민 평점 | M5 | 1 |
| **M7. GPT 연동** | 섹션별 GPT 대화창, 대화 로그 저장 | M5 | 1 |
| **M8. 노트 + 공유** | 개인 노트 CRUD, 공개 토글, 공유 피드 | M6 | 1~2 |
| **M9. 마무리** | 시드 데이터 정리, 권한/게스트 처리, 회귀 테스트 | 전부 | 1 |

---

## 6. 의사결정이 필요한 항목 (구현 시작 전 확정)

- [ ] **GPT API 키** 어디에 둘지 (서버 환경변수 `OPENAI_API_KEY`만 허용, 프론트 노출 금지)
- [ ] **모델 선택** (gpt-4o-mini 기본? 사용자 선택? 비용 캡?)
- [ ] **노트 공유의 기본값** (private 시작이 맞는지, "스터디 그룹" 단위 공유가 필요한지)
- [ ] **권한 정책** — 어드민만 카테고리/섹션 추가? 일반 사용자도 자기 카테고리 만들 수 있는지?
  - 마포는 어드민 전용. 타워크레인도 같은 정책으로 시작 후, 요구되면 "내 챌린지" 별도 도입.
- [ ] **기존 chatbot 라우트** 완전 제거? `/chatbot` → `/challenge` 301 리다이렉트만 두기?

---

## 7. 비범위 (이번엔 안 하는 것)

- 코드 실행 샌드박스 (런너) — 추후 별도 검토
- GPT 대화의 분기/공유 (Continue / Fork 같은 기능) — v2
- 풀이 코드 리뷰 자동화 — v2
- 외부 LLM (Claude/Gemini) 다중 백엔드 — v2

---

## 8. 다음 액션

1. 본 문서 검토/승인
2. `01-database-schema.md` 의 스키마 컨펌
3. M1 PR 시작 (메뉴/라우트 교체) — 가장 가벼운 변경부터.
