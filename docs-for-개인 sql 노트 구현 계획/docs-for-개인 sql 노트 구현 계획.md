# 개인 SQL 노트 구현 계획

## 결론

개인 SQL 노트를 제대로 저장하고 여러 브라우저/기기에서 이어서 보려면 백엔드와 프론트엔드 모두 구현이 필요하다.

다만 Study Diary를 그대로 복제하는 방식은 피한다. 현재 Study Diary는 프론트에서 `StudyDiaryPage -> ChallengePage`를 렌더링하고, 백엔드에서는 `challenge_user_notes` 테이블과 `/challenge/.../notes` API를 사용한다. 이 테이블은 `challenge_sections`, `challenge_topics`에 FK로 묶여 있어 SQL 연습장의 seed, 문제, 테이블과 의미가 맞지 않는다.

권장 방향은 다음과 같다.

- 백엔드: SQL 노트 전용 테이블/API를 새로 만든다.
- 프론트엔드: Study Diary의 노트 작성 UI, 블록 에디터, 카드 렌더링 패턴을 공용 컴포넌트로 승격해 재사용한다.
- 범위: “모두의 노트”가 아니라 로그인한 사용자 본인의 노트만 조회/작성/수정/삭제한다.
- 화면: SQL 연습장 왼쪽 사이드바 닫기 버튼 왼쪽에 노트 버튼을 추가하고, 클릭하면 풀 다이얼로그로 `오현석의 SQL 노트` 같은 제목의 개인 노트 화면을 띄운다.

## 왜 백엔드를 별도로 둬야 하는가

### `challenge_user_notes` 재사용의 문제

`challenge_user_notes`는 아래 구조다.

- `sectionId` -> `challenge_sections.id`
- `topicId` -> `challenge_topics.id`
- `visibility`: `private | shared | public`

SQL 연습장 노트는 Study Diary의 섹션/토픽이 아니라 SQL seed, SQL 문제, 테이블, 사용자 학습 메모에 붙는 데이터다. 억지로 숨겨진 Study Diary 섹션을 만들어 매핑하면 처음에는 빠르지만, 나중에 seed별 필터, 문제별 노트, SQL 실행 기록 연동을 붙일 때 의미가 꼬인다.

### SQL 노트의 자연스러운 소유 모델

SQL 노트는 기본적으로 아래 기준으로 소유권이 정해진다.

- 로그인 사용자 `userId`
- SQL seed 파일 `seedFile`
- 선택 문제 `exampleId` 또는 테이블 `tableName`은 선택 메타데이터
- 본문은 Study Diary와 같은 블록 형식 사용 가능

따라서 백엔드에는 SQL 노트 전용 리소스가 있는 편이 안전하다.

## 데이터 모델

새 테이블 이름은 `sql_practice_notes`를 권장한다.

```ts
export const sqlPracticeNotesTable = sqliteTable('sql_practice_notes', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  seedFile: text('seed_file'),
  exampleId: text('example_id'),
  exampleTitle: text('example_title'),
  tableName: text('table_name'),
  title: text('title'),
  content: text('content').notNull(),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
```

초기 MVP에서는 `visibility`를 넣지 않는다. “모두의 노트”가 아닌 개인 노트가 요구사항이므로 공개/공유 상태를 넣으면 UI와 권한이 불필요하게 커진다. 나중에 공유가 필요해지면 `visibility`를 추가한다.

## 백엔드 구현 계획

### 1. DB 스키마 추가

파일:

- `towercrane-for-uiux-server/src/database/schema.ts`
- `towercrane-for-uiux-server/src/database/database.service.ts`

작업:

- `sqlPracticeNotesTable` 추가
- `schema` export 목록에 추가
- `SqlPracticeNoteRow`, `SqlPracticeNoteInsert` 타입 추가
- `DatabaseService`의 SQLite 마이그레이션/보정 루틴에 `CREATE TABLE IF NOT EXISTS sql_practice_notes` 추가
- 인덱스 권장:
  - `(user_id, updated_at)`
  - `(user_id, seed_file)`
  - `(user_id, example_id)`

### 2. DTO/Zod 스키마 추가

파일:

- `towercrane-for-uiux-server/src/sql-practice/sql-practice.schemas.ts`

스키마:

- `createSqlPracticeNoteSchema`
- `updateSqlPracticeNoteSchema`
- `listSqlPracticeNotesQuerySchema`

필드:

- `seedFile?: string`
- `exampleId?: string`
- `exampleTitle?: string`
- `tableName?: string`
- `title?: string`
- `content: string`
- `pinned?: boolean`

### 3. Service 추가

파일:

- `towercrane-for-uiux-server/src/sql-practice/sql-practice.service.ts`

메서드:

- `getMyNotes(userId, filter)`
- `getNoteById(id)`
- `createNote(input, userId)`
- `updateNote(id, input, userId)`
- `deleteNote(id, userId)`

권한:

- 모든 조회/수정/삭제는 `note.userId === req.user.id`만 허용
- admin도 기본적으로 남의 SQL 노트를 보지 않는다. 개인 학습 노트 성격이므로 관리자 예외를 만들지 않는다.

### 4. Controller 엔드포인트 추가

파일:

- `towercrane-for-uiux-server/src/sql-practice/sql-practice.controller.ts`

API:

- `GET /api/sql/notes/mine?seedFile=&exampleId=&tableName=`
- `POST /api/sql/notes`
- `GET /api/sql/notes/:id`
- `PATCH /api/sql/notes/:id`
- `DELETE /api/sql/notes/:id`

현재 SQL 연습장 API가 세션 보호 API로 운영되므로 동일하게 `SessionGuard`를 사용한다.

## 프론트엔드 구현 계획

### 1. API 타입/클라이언트 추가

파일:

- `towercrane-for-uiux-front/src/entities/sql-practice/model/types.ts`
- `towercrane-for-uiux-front/src/entities/sql-practice/api/sql-practice-api.ts`

타입:

```ts
export type SqlPracticeNote = {
  id: string
  userId: string
  seedFile?: string | null
  exampleId?: string | null
  exampleTitle?: string | null
  tableName?: string | null
  title?: string | null
  content: string
  pinned: boolean
  orderIdx: number
  createdAt: string
  updatedAt: string
}
```

API:

- `getMyNotes(filter)`
- `createNote(input)`
- `updateNote(id, input)`
- `deleteNote(id)`

### 2. React Query hooks 추가

파일:

- `towercrane-for-uiux-front/src/features/sql-practice/model/use-sql-practice-queries.ts`

추가:

- `useSqlPracticeNotes(filter)`
- `useCreateSqlPracticeNote()`
- `useUpdateSqlPracticeNote()`
- `useDeleteSqlPracticeNote()`

쿼리 키:

```ts
notes: (filter) => ['sql-practice', 'notes', filter]
```

생성/수정/삭제 후 `notes` 쿼리를 invalidate한다.

### 3. 노트 UI 공용화

현재 Study Diary 노트 UI:

- `features/challenge/user-notes/ui/user-notes-panel.tsx`
- `features/challenge/user-notes/ui/note-card.tsx`
- `features/challenge/user-notes/ui/note-form-dialog.tsx`
- `features/challenge/user-notes/ui/note-form.tsx`
- `features/challenge/user-notes/ui/block-editor.tsx`
- `features/challenge/user-notes/ui/block-viewer.tsx`
- `features/challenge/user-notes/lib/block-types.ts`

권장 작업:

- `features/challenge/user-notes`에 묶인 UI를 `shared/ui/notes` 또는 `features/note`로 이동
- Study Diary와 SQL 노트가 같은 공용 컴포넌트를 사용
- 텍스트만 props로 분리:
  - 다이얼로그 제목
  - 빈 상태 문구
  - 추가 버튼 라벨
  - 노트 메타 표시 여부

주의:

- 기존 노트 UI 안에 raw Tailwind 색상 `text-white`가 일부 있다. 공용화하면서 `text-text-primary`, `bg-brand-glass`, `ui-*` 유틸로 교체한다.

### 4. SQL 노트 풀 다이얼로그 추가

새 파일:

- `towercrane-for-uiux-front/src/features/sql-practice/ui/sql-notes-dialog.tsx`

역할:

- Radix Dialog 풀 다이얼로그
- 제목: `${user.name}의 SQL 노트`
- 상단 필터:
  - 전체
  - 현재 seed
  - 현재 문제
  - 현재 테이블
- 좌측 또는 상단 목록 + 우측/본문 에디터 구성은 Study Diary 노트 패턴 재사용
- MVP는 단순 카드 목록 + `노트 추가` 버튼으로 충분

다이얼로그 props:

```ts
type SqlNotesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName: string
  seedFile?: string
  selectedExample?: SqlPracticeExample | null
  selectedTable?: string | null
}
```

노트 생성 기본 메타:

- `seedFile`: 현재 seed
- `exampleId`: 선택된 문제가 있으면 저장
- `exampleTitle`: 선택된 문제 제목
- `tableName`: 선택된 테이블

### 5. 왼쪽 사이드바 버튼 추가

파일:

- `towercrane-for-uiux-front/src/features/sql-practice/ui/sql-quiz-sidebar.tsx`
- `towercrane-for-uiux-front/src/pages/sql-practice/ui/sql-practice-page.tsx`

요구사항:

- 왼쪽 사이드바 닫기 버튼 왼쪽에 노트 버튼 추가
- 닫힌 상태에서도 필요하면 세로 아이콘 버튼으로 노트 진입 가능하게 할지 결정

구현:

- `SqlQuizSidebar` props 추가:
  - `onOpenNotes: () => void`
- 헤더 버튼 영역:
  - 노트 버튼
  - 닫기 버튼
- 아이콘은 `NotebookPen` 또는 `BookOpenText` 사용
- 버튼 title: `SQL 노트 열기`

`SqlPracticePage`에서:

- `const [notesOpen, setNotesOpen] = useState(false)`
- `SqlNotesDialog` 렌더링
- 현재 `metaQuery.data?.seedFile`, `selectedExample`, `selectedTable` 전달

### 6. 사용자 이름

헤더에 현재 사용자 정보가 이미 표시된다. 기존 session store/API를 확인해 다음 중 하나를 쓴다.

- `useSessionStore`에 현재 사용자 이름이 있으면 바로 사용
- 없다면 `/auth/me` 또는 기존 auth query에서 사용자 정보를 가져온다

fallback:

- 사용자 이름이 없으면 `나의 SQL 노트`
- 있으면 `${user.name}의 SQL 노트`

## UX 세부안

### 다이얼로그 기본 구조

- 헤더:
  - 아이콘 + `오현석의 SQL 노트`
  - 현재 컨텍스트 배지: `01_board_basic.sql`, `Q.01 사용자 가입일순 목록`, `users`
  - 닫기 버튼
- 상단 액션:
  - `노트 추가`
  - 필터 segmented control: `전체`, `현재 seed`, `현재 문제`, `현재 테이블`
- 본문:
  - pinned 노트 먼저
  - 최근 수정순
  - 카드 클릭 시 편집

### 작성 폼

Study Diary와 동일한 블록 타입을 지원한다.

- 노트
- Mermaid
- 체크리스트
- GitHub
- Figma
- 파일
- DB Table

SQL 노트에 추가하면 좋은 블록은 후순위다.

- SQL 코드 블록
- 실행 결과 스냅샷
- 관련 테이블 목록

MVP에서는 기존 블록 타입만 사용한다.

## 구현 순서

1. 백엔드 `sql_practice_notes` 테이블과 마이그레이션 보정 추가
2. 백엔드 SQL 노트 DTO/API/service 추가
3. 프론트 SQL 노트 API 타입과 React Query hooks 추가
4. Study Diary 노트 UI를 공용 컴포넌트로 이동하거나, 1차에서는 SQL 전용 wrapper에서 기존 컴포넌트 재사용
5. `SqlNotesDialog` 구현
6. `SqlQuizSidebar` 헤더에 노트 버튼 추가
7. `SqlPracticePage`에서 다이얼로그 상태와 컨텍스트 전달
8. 타입체크, 수정 파일 lint, SQL 노트 CRUD 수동 테스트

## 테스트 계획

### 백엔드

- 로그인 없이 접근 시 401
- 내 노트 목록 조회
- seed별 필터 조회
- 문제별 필터 조회
- 노트 생성 후 목록에 표시
- 남의 노트 `GET/PATCH/DELETE` 차단
- 삭제 후 목록에서 제거

### 프론트

- SQL 연습장 왼쪽 사이드바 헤더에서 노트 버튼이 보인다.
- 버튼 클릭 시 풀 다이얼로그가 열린다.
- 제목이 `사용자명 SQL 노트` 형식으로 보인다.
- 노트 추가/수정/삭제가 된다.
- 현재 문제를 선택한 상태에서 만든 노트는 해당 `exampleId`를 가진다.
- 새로고침 후에도 노트가 유지된다.

## 1차 범위와 제외 범위

### 1차 포함

- 개인 SQL 노트 CRUD
- 풀 다이얼로그
- 현재 seed/문제/테이블 메타 저장
- Study Diary 스타일의 노트 작성 경험 재사용

### 1차 제외

- 모두의 노트
- 공개/공유 노트
- 댓글
- 좋아요
- SQL 실행 결과 자동 첨부
- 노트 검색 전문 인덱스
- 노트 export/import

## 최종 판단

백엔드는 별도 SQL 노트 리소스로 구현하는 것이 맞다. 프론트는 완전히 새로 만들기보다 Study Diary 노트 UI를 공용화해서 쓰는 것이 좋다. 이렇게 하면 데이터 모델은 SQL 연습장에 맞게 깨끗하게 분리되고, 사용자는 Study Diary와 같은 익숙한 노트 작성 경험을 그대로 얻게 된다.
