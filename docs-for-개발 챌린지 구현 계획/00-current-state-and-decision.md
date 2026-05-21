# 00. 현재 상태와 결정 사항

## 현재 상태

`Study Diary`는 현재 프론트에서 `/challenge` 라우트로 연결되어 있다.

주요 파일:

- `towercrane-for-uiux-front/src/app/router.tsx`
  - `challengeRoute`가 `path: '/challenge'`를 사용한다.
  - `/chatbot`은 `/challenge`로 리다이렉트한다.
- `towercrane-for-uiux-front/src/widgets/app-header/ui/app-header.tsx`
  - `sectionIdToPath`에서 `challenge: '/challenge'`로 이동한다.
  - `getSectionIdFromPath`에서 `/challenge`를 `challenge`로 인식한다.
- `towercrane-for-uiux-front/src/pages/challenge/ui/challenge-page.tsx`
  - 화면 제목은 이미 `Study Diary`다.
  - 1차 주제, 2차 주제, 노트 본문 구조로 동작한다.
- `towercrane-for-uiux-front/src/features/challenge/**`
  - 이름은 `challenge`지만 현재 화면에서는 Study Diary의 노트 기능으로 쓰인다.
- `towercrane-for-uiux-server/src/challenge/**`
  - 카테고리, 섹션, 토픽, 제출, GPT, 노트 API가 한 모듈에 섞여 있다.
- `towercrane-for-uiux-server/src/database/schema.ts`
  - `challenge_categories`, `challenge_sections`, `challenge_topics`, `challenge_submissions`, `challenge_user_notes` 등이 있다.
- `towercrane-for-uiux-server/src/database/database.service.ts`
  - `Challenge with GPT` 메뉴 시드가 `sectionId: 'challenge'`로 들어간다.

## 문제

현재 이름과 역할이 어긋나 있다.

| 항목 | 현재 | 실제 의미 |
|---|---|---|
| URL | `/challenge` | Study Diary |
| 메뉴 키 | `challenge` | Study Diary |
| 프론트 폴더 | `features/challenge` | Study Diary + 챌린지 잔재 |
| 서버 모듈 | `src/challenge` | Study Diary + 챌린지 잔재 |

이 상태에서 `Dev Challenge`를 추가하면 같은 `challenge` 이름에 두 기능이 섞인다.

## 결정

1. `Study Diary`는 먼저 URL과 메뉴 키를 정리한다.
2. `Dev Challenge`는 별도 URL, 별도 메뉴, 별도 API, 별도 DB 테이블로 구현한다.
3. 1차/2차 패널 UI는 공통 컴포넌트로 승격해 재사용한다.
4. 기존 `challenge_topics`, `challenge_submissions`는 `Study Diary`의 핵심에서 제외한다.
5. 기존 `/challenge` URL은 당장 삭제하지 않고 `/study-diary`로 리다이렉트한다.

## 권장 명명

| 대상 | Study Diary | Dev Challenge |
|---|---|---|
| URL | `/study-diary` | `/dev-challenge` |
| 메뉴 sectionId | `study_diary` | `dev_challenge` |
| 프론트 페이지 | `pages/study-diary` | `pages/dev-challenge` |
| 프론트 feature | `features/study-diary` | `features/dev-challenge` |
| 서버 모듈 | `study-diary` 또는 기존 `challenge` 임시 유지 | `dev-challenge` |
| API | `/api/study-diary/*` | `/api/dev-challenge/*` |
| DB | `study_diary_*` 또는 기존 `challenge_*` 임시 유지 | `dev_challenge_*` |

## 현실적인 1차 범위

한 번에 모든 테이블과 API를 `study_diary_*`로 마이그레이션하면 리스크가 커진다. 1차에서는 다음 범위를 권장한다.

- 프론트 URL, 메뉴, 폴더명은 `study-diary`로 정리한다.
- 서버 API와 DB는 기존 `/api/challenge/*`, `challenge_*`를 임시 유지할 수 있다.
- 단, 새 `Dev Challenge`는 처음부터 `/api/dev-challenge/*`, `dev_challenge_*`로 만든다.

이렇게 하면 기존 Study Diary 데이터 손실 없이 새 챌린지를 분리할 수 있다.

