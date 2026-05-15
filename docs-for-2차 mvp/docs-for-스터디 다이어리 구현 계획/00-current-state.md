# 00. 현재 구조와 판단

## 현재 화면 구조

현재 `/study-diary` 라우트는 별도 구현이 아니라 아래처럼 기존 챌린지 페이지를 그대로 사용한다.

```tsx
export function StudyDiaryPage() {
  return <ChallengePage />
}
```

실제 화면은 3패널 구조다.

- 1차 주제: `challenge_categories`
- 2차 주제: `challenge_sections`
- 본문 노트: `challenge_user_notes`

## 현재 DB 개인화 상태

이미 개인화되어 있는 데이터:

- `challenge_user_notes.user_id`
- `challenge_submissions.user_id`
- `challenge_gpt_threads.user_id`
- `challenge_gpt_messages`는 thread를 통해 user scope를 따라간다.

아직 충분히 개인화되지 않은 데이터:

- `challenge_categories`
  - `created_by`가 있지만 조회 API가 전체 category를 반환한다.
  - 지금 구조에서는 "내 다이어리의 1차 주제"라기보다 "누군가 만든 전역 카테고리 목록"처럼 동작할 수 있다.
- `challenge_sections`
  - 직접 `user_id`가 없다.
  - category를 통해 소유자를 추론해야 한다.
- `challenge_topics`
  - 직접 `user_id`가 없다.
  - section -> category를 통해 소유자를 추론해야 한다.

## 왜 DB 설계를 바꾸는 게 맞나

단순히 "내 노트만 보이면 된다"면 지금도 어느 정도 가능하다. 하지만 사용자가 말한 요구사항은 노트 개인화가 아니라 "OOO의 스터디 다이어리"다. 이 경우에는 1차/2차 주제 구조 자체가 사용자별로 분리되어야 한다.

개인화된 스터디 다이어리에서 사용자는 아래를 기대한다.

- 내 1차 주제를 마음대로 추가/수정/삭제한다.
- 내 2차 주제를 마음대로 추가/수정/삭제한다.
- 다른 사용자의 주제 트리와 섞이지 않는다.
- 공유 기능을 켜기 전까지 내 노트와 구조가 노출되지 않는다.
- 추후 "기본 템플릿 복사", "다이어리 공개", "팀 스터디 공유"로 확장할 수 있다.

이 요구를 안정적으로 만족하려면 `users` 바로 아래에 스터디 다이어리 루트를 두는 것이 낫다.

## 현재 코드에서 주의할 점

현재 `ChallengeService`에는 user scope 검증이 약한 메서드가 있다.

- `getCategories()`는 user filter 없이 전체 category를 반환한다.
- `getSectionsByCategory(categoryId)`는 해당 category가 로그인 유저 소유인지 확인하지 않는다.
- `createSection(input, userId)`는 `userId`를 받지만 category owner를 검증하지 않는다.
- `updateSection`, `deleteSection`, `reorderSections`도 상위 category owner 검증이 필요하다.
- `getGptThreads(sectionId, userId)`는 `sectionId`를 인자로 받지만 현재 쿼리에는 `sectionId` 필터가 빠져 있다.

2차 MVP 구현 때 이 부분을 같이 정리해야 개인화가 데이터 누수 없이 동작한다.

## 권장 범위

2차 MVP에서는 "스터디 다이어리"를 Challenge 도메인의 리브랜딩으로만 두지 말고 별도 도메인으로 분리한다.

- 신규 API prefix: `/study-diary`
- 신규 프론트 feature/entity namespace: `study-diary`
- 기존 `challenge_*` 테이블은 재사용 가능
- 단, 루트 ownership을 표현하는 `study_diaries` 테이블과 `challenge_categories.diary_id`는 추가

이 방식은 기존 구현을 최대한 살리면서도 개인화 경계를 명확하게 만든다.
