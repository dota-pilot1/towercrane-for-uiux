# 02. 백엔드 API/서비스 구현 계획

## 목표

기존 `/challenge/*` API의 전역 조회 성격을 스터디 다이어리 개인 범위로 바꾼다. 2차 MVP에서는 새 prefix `/study-diary/*`를 추가하고, 프론트 `/study-diary` 화면은 이 API만 사용하게 한다.

## 신규 모듈 구조

권장 파일:

- `towercrane-for-uiux-server/src/study-diary/study-diary.module.ts`
- `towercrane-for-uiux-server/src/study-diary/study-diary.controller.ts`
- `towercrane-for-uiux-server/src/study-diary/study-diary.service.ts`
- `towercrane-for-uiux-server/src/study-diary/dto/study-diary.schema.ts`

처음에는 내부에서 기존 `challenge_*` 테이블을 그대로 사용해도 된다. 중요한 것은 API boundary와 ownership 검증을 새로 세우는 것이다.

## 엔드포인트 설계

### 다이어리 조회

`GET /study-diary/me`

로그인 유저의 다이어리를 반환한다. 없으면 자동 생성한다.

응답 예:

```json
{
  "id": "diary-id",
  "userId": "user-id",
  "ownerName": "Seed User",
  "title": "Seed User의 스터디 다이어리",
  "description": null,
  "visibility": "private",
  "createdAt": "2026-05-15T00:00:00.000Z",
  "updatedAt": "2026-05-15T00:00:00.000Z"
}
```

### 다이어리 메타 수정

`PATCH /study-diary/me`

요청:

```json
{
  "title": "현석의 백엔드 학습 다이어리",
  "description": "Spring Boot와 DB 중심으로 정리"
}
```

### 1차 주제

`GET /study-diary/categories`

- 현재 유저 diary id로만 조회한다.
- 기존 `/challenge/categories`처럼 전체 category를 반환하면 안 된다.

`POST /study-diary/categories`

- body는 기존 category 생성 schema와 유사하게 둔다.
- 서버가 `diaryId`와 `createdBy`를 현재 유저로 강제한다.

`PATCH /study-diary/categories/:id`

- category가 현재 유저 diary 소속인지 확인 후 수정한다.

`DELETE /study-diary/categories/:id`

- category가 현재 유저 diary 소속인지 확인 후 삭제한다.

`POST /study-diary/categories/reorder`

- 전달받은 모든 category id가 현재 유저 diary 소속인지 확인한다.

### 2차 주제

`GET /study-diary/categories/:categoryId/sections`

- category owner 검증 후 section 목록을 반환한다.

`POST /study-diary/sections`

- `categoryId`가 현재 유저 diary 소속인지 검증한다.

`PATCH /study-diary/sections/:id`

- section -> category -> diary owner 검증 후 수정한다.

`DELETE /study-diary/sections/:id`

- section -> category -> diary owner 검증 후 삭제한다.

`POST /study-diary/sections/reorder`

- `categoryId`와 모든 `sectionIds`가 현재 유저 diary 소속인지 검증한다.

### 노트

`GET /study-diary/sections/:sectionId/notes/mine`

- section이 현재 유저 diary 소속인지 확인한다.
- note는 `user_id = currentUser.id` 조건을 유지한다.

`POST /study-diary/notes`

- `sectionId` 또는 `topicId`가 현재 유저 diary 소속인지 확인한다.
- `userId`는 body에서 받지 않고 현재 유저로 강제한다.

`PATCH /study-diary/notes/:id`

- note owner가 현재 유저인지 확인한다.
- section/topic 변경이 들어오면 새 section/topic도 현재 유저 diary 소속인지 확인한다.

`DELETE /study-diary/notes/:id`

- note owner가 현재 유저인지 확인한다.

## 서비스 메서드 설계

핵심 helper:

```ts
async getOrCreateMyDiary(userId: string): Promise<StudyDiaryRow>
async assertDiaryOwner(diaryId: string, userId: string): Promise<void>
async assertCategoryInMyDiary(categoryId: string, userId: string): Promise<ChallengeCategoryRow>
async assertSectionInMyDiary(sectionId: string, userId: string): Promise<ChallengeSectionRow>
async assertTopicInMyDiary(topicId: string, userId: string): Promise<ChallengeTopicRow>
```

조회 로직 예:

```ts
async getCategories(userId: string) {
  const diary = await this.getOrCreateMyDiary(userId);
  return this.db.db
    .select()
    .from(challengeCategoriesTable)
    .where(eq(challengeCategoriesTable.diaryId, diary.id))
    .orderBy(challengeCategoriesTable.orderIdx)
    .all();
}
```

## 기존 ChallengeService에서 가져올 때 수정할 점

아래 메서드는 그대로 복사하면 안 된다.

- `getCategories()`: current user scope 추가 필요
- `getSectionsByCategory(categoryId)`: category owner 검증 필요
- `createSection(input, userId)`: category owner 검증 필요
- `updateSection/deleteSection/reorderSections`: section/category owner 검증 필요
- `getGptThreads(sectionId, userId)`: `sectionId` 조건 추가 필요
- `getSharedNotes(sectionId, userId)`: shared/public 정책을 유지하더라도 section 접근 정책을 명확히 해야 함

## app.module 연결

`StudyDiaryModule`을 `AppModule`에 추가한다.

```ts
import { StudyDiaryModule } from './study-diary/study-diary.module';

@Module({
  imports: [
    StudyDiaryModule,
  ],
})
export class AppModule {}
```

## 테스트 포인트

- A 유저가 만든 category가 B 유저 목록에 보이지 않는다.
- B 유저가 A 유저의 category id로 sections API를 호출하면 403 또는 404가 반환된다.
- 새 유저가 최초로 `/study-diary/me`를 호출하면 diary가 생성된다.
- `/study-diary/categories`는 로그인 유저의 diary category만 반환한다.
- 기존 `/challenge/*` API를 유지하는 동안에도 `/study-diary/*` 화면은 새 API만 사용한다.
