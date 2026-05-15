# 00. 전체 개요 — Study Diary (스터디 다이어리)

> **목표**: 기존 `Chatbot` 메뉴를 `Study Diary`로 교체하고, 자기주도 학습을 기록하는 계층형 노트 시스템을 구축한다.
> **핵심**: 1차 주제(카테고리) → 2차 주제(섹션) → 3차 본문(노트) 3단계 구조로 학습 자료와 개인 노트를 관리한다.

---

## 1. 한눈에 보는 비교

| 항목 | 마포-팔란티어 (참고) | 타워크레인 (현 프로젝트) |
|---|---|---|
| 백엔드 | Spring Boot 4 + MyBatis | **NestJS 11 + Drizzle ORM** |
| DB | SQLite / PostgreSQL | **SQLite (better-sqlite3)** |
| 인증 | JWT (jjwt) | **세션 토큰 (DB 저장)** |
| 프론트 | React 19 + Vite + TanStack | React 19 + Vite + TanStack (거의 동일) |
| 폼 검증 | Zod | Zod (동일) |
| 폴더 구조 | features 중심 평탄화 | **FSD (entities/features/widgets/pages/shared)** |
| 권한 | `ADMIN` / `USER` | `admin` / `user` (소문자) |

**핵심 차이**: 백엔드 ORM/DB가 다르고(Drizzle), 프론트가 FSD라서 동일 코드 복붙이 불가능. **데이터 모델/의도는 그대로 가져오되, 구현은 현 프로젝트 컨벤션에 맞춰 다시 짠다.**

---

## 2. Study Diary의 정체성

**Study Diary**는 3단계 계층형 학습 기록 시스템이다:

### 1차 주제 (Category)
- 큰 학습 주제 (예: "Spring Boot", "React 기초")
- 카테고리별로 여러 섹션을 묶음
- 어드민이 생성/관리

### 2차 주제 (Section)  
- 카테고리 내 소주제 또는 회차 (예: "1회차", "2회차" 또는 "기본 설정")
- 해당 섹션의 노트들을 그룹화
- 어드민이 생성

### 3차 본문 (Notes)
- 사용자가 직접 작성하는 학습 기록
- 마크다운/텍스트 기반 개인 노트
- 작성한 노트를 선택적으로 다른 사용자에게 공개 가능
- 우산 개념으로 submission(풀이 제출), gpt-thread(AI 대화) 로그도 함께 저장 가능

---

## 3. URL / 메뉴 구조

| 항목 | 값 |
|---|---|
| 메뉴 표시명 | `Study Diary` (헤더) / 좌측 사이드바도 동일 |
| 라우트 경로 | `/challenge` (변경 없음) |
| sectionId | `challenge` (메뉴 DB → 라우터 매핑 키) |
| Lucide 아이콘 | `Trophy` (헤더용) |
| 권한 | 비로그인은 진입 차단 (향후 게스트 읽기 옵션화 가능) |

> **참고**: 라우트는 `/challenge` 유지하되, 내부 논리와 UI는 "Study Diary" 개념으로 재정의.

---

## 4. UI 레이아웃 — 3패널 구조

```
┌────────────────────────────────────┐
│ Header: Study Diary (Trophy icon)  │
├─────────────┬──────────────┬───────┤
│  1차 주제   │  2차 주제    │ 노트  │
│ (Category)  │ (Section)    │(Notes)│
│             │              │       │
│ + Spring    │ + 1차 (3개)  │ 작성  │
│ + React     │ + 2차        │ 수정  │
│             │              │ 삭제  │
│             │ [제목없음]    │ 공유  │
│             │ [제목없음]    │       │
│             │ [제목없음]    │       │
└─────────────┴──────────────┴───────┘
```

**흐름**:
1. 좌측에서 1차 주제 선택 → 중앙에 2차 주제 목록 표시
2. 중앙에서 2차 주제 선택 → 우측에 해당 섹션의 노트들 표시
3. 우측에서 노트 선택/작성/수정/공유 처리

---

## 5. 단계별 문서 구성 (이 폴더)

```
docs-for-챌린지 with 스터디 구현 계획/
├── 00-overview.md                  ← (이 파일) Study Diary 전체 그림
├── 01-database-schema.md           ← Drizzle 스키마: categories, sections, user_notes, ...
├── 02-backend-module.md            ← NestJS challenge 모듈 (CRUD + 권한)
├── 03-frontend-foundation.md       ← FSD 폴더, 라우터, 메뉴 교체
├── 04-frontend-ui-3panel.md        ← 3패널 UI (1차/2차/노트)
├── 05-block-editor.md              ← 노트 에디터 (마크다운/텍스트)
├── 06-submission-feature.md        ← 풀이 제출 (선택사항)
├── 07-gpt-integration.md           ← GPT 대화 로그 (선택사항)
├── 08-user-notes-sharing.md        ← 노트 공개/공유 토글
└── 09-rollout-checklist.md         ← 시드 변경 / DB 리셋 / 배포
```

각 문서는 **독립적으로 PR 단위로 진행 가능**하도록 쪼갰다.

---

## 6. 마일스톤 (권장 진행 순서)

| 단계 | 산출물 | 의존 | 예상 PR 수 |
|---|---|---|---|
| **M1. 기반 작업** | 메뉴/라우트 교체, 빈 Study Diary 페이지 진입 가능 | — | 1 |
| **M2. 데이터 계층** | Drizzle 스키마 (categories, sections, user_notes), 시드 데이터 | M1 | 1 |
| **M3. 백엔드 CRUD** | NestJS challenge 모듈 (categories/sections/notes API) | M2 | 1 |
| **M4. 프론트 3패널 골격** | 1차/2차 사이드바 + 노트 콘텐츠 영역 | M3 | 1 |
| **M5. 노트 작성/수정/삭제** | 노트 CRUD UI + 마크다운 에디터 | M4 | 1 |
| **M6. 노트 공개/공유** | 공개 토글, 공유 피드 | M5 | 1 |
| **M7. 풀이 제출** | (선택) GitHub URL + 체크리스트 제출 | M5 | 1 |
| **M8. GPT 대화 로그** | (선택) 섹션별 AI 대화 저장 | M5 | 1 |
| **M9. 마무리** | 시드 데이터 정리, 권한/게스트 처리, 테스트 | 전부 | 1 |

---

## 7. 핵심 데이터 구조

### challenge_categories
```
id, name, created_at
```

### challenge_sections
```
id, category_id, title, created_at
```

### challenge_user_notes
```
id, section_id, user_id, title, content, visibility (private/shared), pinned, created_at, updated_at
```

### challenge_submissions (선택사항)
```
id, topic_id (또는 section_id), user_id, content, score, created_at
```

### gpt_threads (선택사항)
```
id, section_id, user_id, title, model, created_at
```

---

## 8. 현재 구현 상태 (2026-05-11)

✅ **완료**:
- M1: 메뉴 교체 (Chatbot → Study Diary)
- M2: DB 스키마 정의 및 시드 데이터 (categories: Spring Boot, 섹션 3개)
- M3: NestJS 백엔드 CRUD API (categories, sections, notes)
- M4: 3패널 UI 골격 (1차/2차 사이드바 + 노트 영역)
- **3패널 "+" 버튼 모두 동작** (categories/sections 추가 기능)

🔄 **진행 중**:
- M5: 노트 작성/수정/삭제 UI
- 헤더 레이블 정리 (1차 주제, 2차 주제, 3차 본문)

⏳ **차후**:
- M6~M8: 공유, 풀이, GPT (선택사항)

---

## 9. 다음 액션

1. 모든 문서를 Study Diary 컨셉에 맞춰 재검토
2. 현재 구현된 상태(M4 완료)에 맞춰 문서 업데이트
3. M5 (노트 CRUD) 구현 시작
