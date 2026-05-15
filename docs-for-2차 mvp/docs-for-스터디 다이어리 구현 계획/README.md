# 스터디 다이어리 개인화 구현 계획

## 결론

가능하다. 그리고 "로그인한 유저 OOO의 스터디 다이어리"처럼 보이게 하려면 DB 설계를 바꾸는 편이 맞다.

현재 `/study-diary`는 독립 도메인이 아니라 기존 `ChallengePage`를 그대로 렌더링한다. 데이터도 `challenge_categories`, `challenge_sections`, `challenge_user_notes` 등을 사용한다. 이 중 노트, 제출, GPT 스레드는 이미 `user_id`가 있어서 개인 데이터 성격이 있지만, 1차 주제와 2차 주제 트리는 조회 시 유저 기준으로 분리되지 않는다.

따라서 2차 MVP에서는 스터디 다이어리를 명시적인 개인 루트로 만들고, 카테고리/섹션/노트 조회를 로그인 유저의 다이어리 범위로 제한한다.

## 권장 방향

1. `study_diaries` 테이블을 새로 만든다.
2. `challenge_categories`에 `diary_id`를 추가한다.
3. `challenge_sections`, `challenge_topics`, `challenge_user_notes`, `challenge_submissions`, `challenge_gpt_threads`는 직접 `user_id`만 믿지 말고 상위 category/section/topic을 통해 diary ownership을 검증한다.
4. API는 기존 `/challenge/*`를 바로 갈아엎기보다 `/study-diary/*`로 새로 분리하는 것을 권장한다.
5. 프론트는 `StudyDiaryPage`가 `ChallengePage`를 import하는 구조를 끊고, 스터디 다이어리 전용 훅/컴포넌트로 이동한다.

## 문서 구성

- [00-current-state.md](./00-current-state.md): 현재 구조와 개인화 가능 여부
- [01-database-schema.md](./01-database-schema.md): DB 설계 변경안
- [02-backend-api-service-plan.md](./02-backend-api-service-plan.md): 백엔드 API/서비스 구현 계획
- [03-frontend-plan.md](./03-frontend-plan.md): 프론트 구현 계획
- [04-migration-seed-plan.md](./04-migration-seed-plan.md): 기존 데이터 마이그레이션과 seed 정책
- [05-step-by-step-checklist.md](./05-step-by-step-checklist.md): 단계별 실행 체크리스트

## MVP 완료 기준

- 로그인한 사용자는 자기 다이어리의 1차/2차 주제와 노트만 본다.
- 헤더에 `{사용자명}의 스터디 다이어리`가 표시된다.
- 새 사용자는 최초 진입 시 본인 다이어리가 자동 생성된다.
- 다른 사용자의 category/section/topic/note id를 직접 호출해도 접근이 차단된다.
- raw Tailwind 팔레트 색상은 사용하지 않는다.
