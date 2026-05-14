# 06. 단계별 구현 체크리스트

## 1단계. Study Diary URL 정리

- [ ] `towercrane-for-uiux-front/src/app/router.tsx`에서 `/study-diary` 라우트 추가
- [ ] 기존 `/challenge` 라우트는 `/study-diary` 리다이렉트로 변경
- [ ] `/chatbot` 리다이렉트도 `/study-diary`로 변경
- [ ] `towercrane-for-uiux-front/src/widgets/app-header/ui/app-header.tsx`에 `study_diary` 매핑 추가
- [ ] 기존 `challenge` 매핑은 호환용으로 `/study-diary` 반환
- [ ] `towercrane-for-uiux-front/src/shared/config/navigation.ts`의 Study Diary id 정리
- [ ] `towercrane-for-uiux-server/src/database/database.service.ts` 메뉴 시드 보정
- [ ] 기존 개발 DB 메뉴 보정 SQL 또는 런타임 보정 함수 추가

검증:

- [ ] `/study-diary` 접속 가능
- [ ] `/challenge` 접속 시 `/study-diary`로 이동
- [ ] 헤더 Study Diary 메뉴 활성화 정상

## 2단계. Dev Challenge 메뉴와 빈 페이지

- [ ] `towercrane-for-uiux-front/src/pages/dev-challenge/ui/dev-challenge-page.tsx` 추가
- [ ] `towercrane-for-uiux-front/src/app/router.tsx`에 `/dev-challenge` 추가
- [ ] `towercrane-for-uiux-front/src/widgets/app-header/ui/app-header.tsx`에 `dev_challenge` 매핑 추가
- [ ] `towercrane-for-uiux-server/src/database/database.service.ts` 메뉴 시드에 `Dev Challenge` 추가

검증:

- [ ] 헤더에서 Dev Challenge 클릭 시 `/dev-challenge`로 이동
- [ ] 빈 페이지가 앱 레이아웃 안에서 정상 렌더링

## 3단계. Dev Challenge DB / 백엔드 기본 CRUD

- [ ] `towercrane-for-uiux-server/src/database/schema.ts`에 `dev_challenge_*` 테이블 타입 추가
- [ ] `towercrane-for-uiux-server/src/database/database.service.ts`에 테이블 생성 SQL 추가
- [ ] `towercrane-for-uiux-server/src/dev-challenge/dto/dev-challenge.schema.ts` 추가
- [ ] `towercrane-for-uiux-server/src/dev-challenge/dev-challenge.module.ts` 추가
- [ ] `towercrane-for-uiux-server/src/dev-challenge/dev-challenge.service.ts` 추가
- [ ] `towercrane-for-uiux-server/src/dev-challenge/dev-challenge.controller.ts` 추가
- [ ] `towercrane-for-uiux-server/src/app.module.ts`에 `DevChallengeModule` 등록

검증:

- [ ] categories API 동작
- [ ] sections API 동작
- [ ] admin guard 적용
- [ ] 일반 사용자가 생성/수정/삭제 불가

## 4단계. 프론트 1차/2차 패널 구현

- [ ] `towercrane-for-uiux-front/src/entities/dev-challenge/model/types.ts` 추가
- [ ] `towercrane-for-uiux-front/src/entities/dev-challenge/api/dev-challenge-api.ts` 추가
- [ ] `towercrane-for-uiux-front/src/features/dev-challenge/lib/hooks.ts` 추가
- [ ] `DevChallengeCategoryPanel` 구현
- [ ] `DevChallengeSectionPanel` 구현
- [ ] `DevChallengePage`에 3패널 레이아웃 연결

검증:

- [ ] 1차 주제 추가/수정/삭제/정렬
- [ ] 2차 주제 추가/수정/삭제/정렬
- [ ] Study Diary와 query key가 섞이지 않음

## 5단계. 출제 모델과 출제 UI

- [ ] `dev_challenge_assignments` CRUD API 구현
- [ ] `dev_challenge_assignment_blocks` CRUD API 구현
- [ ] `AssignmentList` 구현
- [ ] `AssignmentEditorDialog` 구현
- [ ] `AssignmentBlockEditor` 구현
- [ ] `AssignmentViewer` 구현
- [ ] `NOTE`, `CHECKLIST` 블록 1차 지원

검증:

- [ ] 어드민이 출제 생성 가능
- [ ] 일반 사용자는 published 출제 읽기 가능
- [ ] 체크리스트가 안정적인 item id로 저장됨
- [ ] 블록 순서 변경 가능

## 6단계. 제출 UI와 제출 API

- [ ] `dev_challenge_submissions` 생성/수정/조회 API 구현
- [ ] `SubmissionPanel` 구현
- [ ] `SubmissionForm` 구현
- [ ] `SubmissionCard` 구현
- [ ] 출제 체크리스트에서 제출 체크리스트 자동 생성
- [ ] GitHub 링크 검증
- [ ] 점수 계산 구현

검증:

- [ ] 사용자가 댓글 + GitHub 링크 + 체크리스트로 제출 가능
- [ ] 기존 제출이 있으면 수정 플로우로 동작
- [ ] 체크리스트 점수와 만점이 맞음

## 7단계. 어드민 검토

- [ ] `reviewSubmission` API 구현
- [ ] `SubmissionReviewPanel` 구현
- [ ] 어드민 제출 목록 구현
- [ ] 상태 변경, 평점, 피드백 저장

검증:

- [ ] 일반 사용자는 다른 사용자 제출 목록 접근 불가
- [ ] 어드민은 모든 제출 검토 가능
- [ ] 검토 결과가 사용자 제출 카드에 표시됨

## 8단계. 정리 / 테스트 / 스타일 점검

- [ ] raw Tailwind 팔레트 사용 여부 검사
- [ ] `pnpm --dir towercrane-for-uiux-front typecheck`
- [ ] `pnpm --dir towercrane-for-uiux-front build`
- [ ] `pnpm --dir towercrane-for-uiux-server test` 또는 최소 typecheck/build
- [ ] 브라우저에서 `/study-diary`, `/challenge`, `/dev-challenge` 확인

스타일 검사 후보:

```sh
rg -n "text-white|text-slate-|text-emerald-|text-amber-|text-sky-|bg-white/|bg-slate-|bg-emerald-|border-white/|border-slate-|border-emerald-" towercrane-for-uiux-front/src
```

