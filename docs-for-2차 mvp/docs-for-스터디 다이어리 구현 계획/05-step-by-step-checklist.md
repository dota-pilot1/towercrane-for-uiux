# 05. 단계별 실행 체크리스트

## 1단계: DB 스키마 추가

- [ ] `towercrane-for-uiux-server/src/database/schema.ts`에 `studyDiariesTable` 추가
- [ ] `challengeCategoriesTable`에 `diaryId` 추가
- [ ] `databaseSchema` export 목록에 `studyDiariesTable` 추가
- [ ] `StudyDiaryRow`, `StudyDiaryInsert` 타입 export 추가
- [ ] `DatabaseService` 초기화 DDL에 `study_diaries` 생성 추가
- [ ] `challenge_categories`에 `diary_id` 추가하는 migration helper 추가
- [ ] `idx_study_diaries_user`, `idx_challenge_categories_diary` index 추가

완료 기준:

- 서버 시작 시 새 테이블과 index가 생성된다.
- 기존 DB에서도 서버가 깨지지 않고 뜬다.

## 2단계: 기존 데이터 backfill

- [ ] 모든 user에 대해 diary가 없으면 생성
- [ ] 기존 `challenge_categories.diary_id`를 `created_by` user의 diary로 채움
- [ ] `diary_id IS NULL` category가 남지 않는지 확인
- [ ] 새 user 최초 진입 시 diary 자동 생성 helper 작성

완료 기준:

- 기존 `Spring Boot3`, `websocket` 같은 category가 특정 user diary에 귀속된다.
- 새 user는 빈 개인 다이어리로 시작한다.

## 3단계: 백엔드 StudyDiary 모듈 추가

- [ ] `StudyDiaryModule` 생성
- [ ] `StudyDiaryController` 생성
- [ ] `StudyDiaryService` 생성
- [ ] `study-diary.schema.ts` zod schema 작성
- [ ] `GET /study-diary/me` 구현
- [ ] `PATCH /study-diary/me` 구현
- [ ] category CRUD/reorder 구현
- [ ] section CRUD/reorder 구현
- [ ] note mine/create/update/delete 구현
- [ ] ownership helper 구현

완료 기준:

- 모든 `/study-diary/*` API가 `SessionGuard` 아래에서 동작한다.
- 다른 user의 id를 직접 호출해도 접근이 차단된다.

## 4단계: 프론트 API와 hook 분리

- [ ] `entities/study-diary/model/types.ts` 추가
- [ ] `entities/study-diary/api/study-diary-api.ts` 추가
- [ ] `features/study-diary/lib/hooks.ts` 추가
- [ ] React Query key를 `study-diary` namespace로 분리
- [ ] create/update/delete 성공 시 해당 query만 invalidate
- [ ] 세션 변경 또는 로그아웃 시 `study-diary` cache가 남지 않게 확인

완료 기준:

- `/study-diary` 화면이 `/challenge/*` API를 호출하지 않는다.
- 유저 전환 시 이전 유저 데이터가 보이지 않는다.

## 5단계: StudyDiaryPage 전용화

- [ ] `StudyDiaryPage`에서 `ChallengePage` import 제거
- [ ] 헤더 title을 `GET /study-diary/me` 응답으로 표시
- [ ] 1차 주제 패널을 `study-diary` hook으로 연결
- [ ] 2차 주제 패널을 `study-diary` hook으로 연결
- [ ] 본문 노트 패널을 `study-diary` note API로 연결
- [ ] 빈 상태 UI 정리
- [ ] 기존 theme token 규칙 준수

완료 기준:

- 화면 상단에 `{사용자명}의 스터디 다이어리`가 나온다.
- 1차/2차 주제 생성, 수정, 삭제, 정렬이 로그인 유저 범위에서만 동작한다.
- 노트 생성, 수정, 삭제가 로그인 유저 범위에서만 동작한다.

## 6단계: 검증

- [ ] A 유저로 1차 주제 생성
- [ ] B 유저로 로그인 후 A 유저 주제가 안 보이는지 확인
- [ ] B 유저가 A 유저 category id로 sections API 호출 시 차단되는지 확인
- [ ] A 유저가 노트 생성 후 B 유저에게 보이지 않는지 확인
- [ ] `/challenge` legacy redirect가 `/study-diary`로 이동하는지 확인
- [ ] raw Tailwind 팔레트 색상 사용 여부 검색

검색 예:

```bash
rg "text-white|text-slate-|text-emerald-|text-amber-|text-sky-|bg-white/|bg-slate-|bg-emerald-500/|border-white/|border-slate-|border-emerald-" towercrane-for-uiux-front/src/pages/study-diary towercrane-for-uiux-front/src/features/study-diary
```

## 7단계: 정리

- [ ] 기존 `features/challenge`와 새 `features/study-diary` 중복 제거 범위 결정
- [ ] `ChallengePage`를 계속 유지할지 제거할지 결정
- [ ] `/challenge/*` API deprecation 여부 결정
- [ ] 템플릿 복사 기능을 다음 MVP로 분리할지 결정
