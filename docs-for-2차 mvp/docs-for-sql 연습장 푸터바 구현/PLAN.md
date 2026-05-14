# SQL 연습장 푸터바 구현 계획

## 결론

좋은 방향이다. 현재 SQL 연습장은 왼쪽 문제 목록 하단에 `랭킹 보기` 버튼이 있고, 랭킹은 다이얼로그로만 열린다. 이걸 하단 푸터바로 상시 노출하면 사용자는 문제를 풀면서 자기 위치와 다른 사용자의 풀이 흐름을 계속 볼 수 있다.

다만 푸터바는 SQL 입력 영역과 겹칠 가능성이 크다. 그래서 1차 구현은 `닫힘 상태: 얇은 하단 바`, `열림 상태: 하단에서 위로 올라오는 drawer`로 만들고, 메인 SQL 영역에는 drawer 높이만큼 `padding-bottom` 또는 레이아웃 보정을 넣는다.

## 목표 UI

- `/sql` 화면 하단에 접을 수 있는 푸터바를 배치한다.
- 닫힘 상태에서는 한 줄 요약만 보인다.
  - 왼쪽: 현재 seed 기준 내 점수, 내 순위, 전체 제출 수
  - 오른쪽: 최근 제출 1건 요약
- 열림 상태에서는 푸터바가 위로 열린다.
  - 왼쪽 50%: SQL 랭킹
  - 오른쪽 50%: 실시간 제출 로그
- 오른쪽 로그는 `누가`, `몇 번 문제를`, `맞았는지/틀렸는지`, `언제` 제출했는지 보여준다.
- 테마 규칙상 raw Tailwind 팔레트 색상은 사용하지 않는다.
  - 사용 가능: `text-text-primary`, `text-text-secondary`, `text-text-muted`, `bg-surface-muted`, `bg-surface-raised`, `border-surface-border`, `bg-brand-glass`, `text-brand-primary`
  - 금지: `text-white`, `text-slate-*`, `bg-white/*`, `border-slate-*`, `text-emerald-*` 등

## 1차 MVP 범위

- 실시간은 WebSocket이 아니라 `GET /api/sql/submissions/activity` polling으로 구현한다.
- polling 주기는 5초로 시작한다.
- 새 제출 성공 시 ranking/activity query를 즉시 invalidate한다.
- 푸터바 상태는 페이지 local state로 관리한다.
- 랭킹 다이얼로그는 바로 제거하지 않는다. 기존 진입점을 유지하되, 푸터바 구현 후 중복 UX를 정리할지 결정한다.

## 데이터 정책

- 기존 `sql_practice_submissions` 테이블을 그대로 사용한다.
- 추가 테이블은 만들지 않는다.
- 최근 로그는 제출 row를 `createdAt DESC`로 조회한다.
- seed 기준으로 필터링한다.
- 사용자명은 `users` 테이블과 join해서 가져온다.
- 오답도 로그에 남긴다. 랭킹 점수는 기존처럼 문제별 최고 점수만 반영한다.

## API 설계

### 신규 응답 타입

프론트:

`towercrane-for-uiux-front/src/entities/sql-practice/model/types.ts`

```ts
export type SqlPracticeActivityItem = {
  id: string
  userId: string
  userName: string
  seedFile: string
  exampleId: string
  exampleTitle: string
  exampleLevel: SqlPracticeSubmissionLevel
  exampleOrder: number
  isCorrect: boolean
  score: number
  maxScore: number
  createdAt: string
}

export type SqlPracticeActivityResponse = {
  seedFile: string
  activities: SqlPracticeActivityItem[]
}
```

백엔드:

`towercrane-for-uiux-server/src/sql-practice/sql-practice.types.ts`

```ts
export type SqlPracticeActivityItem = {
  id: string;
  userId: string;
  userName: string;
  seedFile: string;
  exampleId: string;
  exampleTitle: string;
  exampleLevel: SqlPracticeSubmissionLevel;
  exampleOrder: number;
  isCorrect: boolean;
  score: number;
  maxScore: number;
  createdAt: string;
};

export type SqlPracticeActivityResponse = {
  seedFile: string;
  activities: SqlPracticeActivityItem[];
};
```

### 신규 엔드포인트

`GET /api/sql/submissions/activity?seedFile=01_board_basic.sql&limit=30`

응답:

```json
{
  "seedFile": "01_board_basic.sql",
  "activities": [
    {
      "id": "submission-id",
      "userId": "user-id",
      "userName": "오현석",
      "seedFile": "01_board_basic.sql",
      "exampleId": "01_board_basic-beginner-01",
      "exampleTitle": "사용자 가입일순 목록",
      "exampleLevel": "beginner",
      "exampleOrder": 1,
      "isCorrect": true,
      "score": 1,
      "maxScore": 1,
      "createdAt": "2026-05-14T01:16:00.000Z"
    }
  ]
}
```

## 파일별 구현 계획

### 1단계: 백엔드 타입과 쿼리 스키마 추가

수정:

- `towercrane-for-uiux-server/src/sql-practice/sql-practice.types.ts`
- `towercrane-for-uiux-server/src/sql-practice/sql-practice.schemas.ts`

작업:

1. `SqlPracticeActivityItem`, `SqlPracticeActivityResponse` 타입을 추가한다.
2. `activity` 조회용 query schema를 추가한다.
   - `seedFile`: 필수 string
   - `limit`: 선택 number, 기본 30
   - 최소 1, 최대 100
3. 기존 `sqlPracticeSubmissionSeedQuerySchema`와 중복되는 부분은 유지하되, limit이 필요한 activity 전용 schema를 둔다.

완료 기준:

- 타입스크립트 컴파일 시 신규 타입 import가 가능하다.
- 잘못된 `limit` 값은 zod schema에서 막힌다.

### 2단계: 백엔드 activity 조회 서비스 추가

수정:

- `towercrane-for-uiux-server/src/sql-practice/sql-practice.service.ts`

작업:

1. `getRecentActivity(query: unknown): SqlPracticeActivityResponse` 메서드를 추가한다.
2. `sqlPracticeSubmissionsTable`과 `usersTable`을 join한다.
3. `seedFile` 필터를 적용한다.
4. `createdAt DESC` 정렬과 `limit`을 적용한다.
5. `userName`이 없으면 기존 랭킹처럼 `Unknown User`로 fallback한다.

주의:

- 이 API는 제출 결과만 읽으므로 practice SQLite DB가 아니라 메인 앱 DB의 `sql_practice_submissions`를 조회한다.
- 랭킹과 다르게 문제별 최고 점수로 접지 않는다. 모든 제출 시도를 최신순으로 보여준다.

완료 기준:

- 최근 제출이 최신순으로 내려온다.
- 정답/오답이 모두 포함된다.
- 같은 사용자가 같은 문제를 여러 번 제출해도 로그에는 각각 표시된다.

### 3단계: 백엔드 컨트롤러 엔드포인트 추가

수정:

- `towercrane-for-uiux-server/src/sql-practice/sql-practice.controller.ts`

작업:

1. 아래 라우트를 추가한다.

```ts
@Get('submissions/activity')
activity(@Query() query: unknown) {
  return this.sqlPracticeService.getRecentActivity(query);
}
```

2. 라우트 순서는 `submissions/mine`, `submissions/ranking` 근처에 둔다.

완료 기준:

- 로그인 세션이 있는 상태에서 `/api/sql/submissions/activity?seedFile=...` 호출이 가능하다.
- `AuthGuard` 보호 범위 안에서 동작한다.

### 4단계: 프론트 API 타입과 클라이언트 함수 추가

수정:

- `towercrane-for-uiux-front/src/entities/sql-practice/model/types.ts`
- `towercrane-for-uiux-front/src/entities/sql-practice/api/sql-practice-api.ts`

작업:

1. `SqlPracticeActivityItem`, `SqlPracticeActivityResponse` 타입을 추가한다.
2. `sqlPracticeApi.getActivity(seedFile: string, limit = 30)` 함수를 추가한다.

예상 함수:

```ts
getActivity: (seedFile: string, limit = 30) =>
  apiRequest<SqlPracticeActivityResponse>(
    `/sql/submissions/activity?seedFile=${encodeURIComponent(seedFile)}&limit=${limit}`,
  ),
```

완료 기준:

- 프론트에서 activity 응답 타입을 안전하게 사용할 수 있다.

### 5단계: React Query hook 추가

수정:

- `towercrane-for-uiux-front/src/features/sql-practice/model/use-sql-practice-queries.ts`

작업:

1. query key를 추가한다.

```ts
activity: (seedFile: string) => ['sql-practice', 'activity', seedFile] as const,
```

2. hook을 추가한다.

```ts
export function useSqlPracticeActivity(seedFile: string | undefined, enabled = true) {
  return useQuery({
    queryKey: sqlPracticeQueryKeys.activity(seedFile ?? ''),
    queryFn: () => sqlPracticeApi.getActivity(seedFile!, 30),
    enabled: Boolean(seedFile) && enabled,
    refetchInterval: enabled ? 5000 : false,
  })
}
```

3. `useGradeSqlPracticeSubmission` 성공 시 activity query도 invalidate한다.

완료 기준:

- 푸터바가 열려 있을 때 5초마다 최근 제출 로그가 갱신된다.
- 내가 문제를 제출하면 polling을 기다리지 않고 로그와 랭킹이 바로 갱신된다.

### 6단계: 랭킹 테이블을 재사용 컴포넌트로 분리

신규:

- `towercrane-for-uiux-front/src/features/sql-practice/ui/sql-ranking-table.tsx`

수정:

- `towercrane-for-uiux-front/src/features/sql-practice/ui/sql-ranking-dialog.tsx`

작업:

1. 현재 `SqlRankingDialog` 내부의 table UI를 `SqlRankingTable`로 분리한다.
2. props:

```ts
type SqlRankingTableProps = {
  rankings: SqlPracticeRankingItem[]
  isLoading: boolean
  currentUserId: string
  compact?: boolean
}
```

3. dialog는 `SqlRankingTable`을 사용하게 바꾼다.
4. 푸터바에서는 `compact` 모드로 사용한다.

스타일 규칙:

- `bg-surface-raised`, `bg-surface-muted`, `border-surface-border`, `text-text-*`, `bg-brand-glass`, `text-brand-primary`만 사용한다.
- raw palette 금지.

완료 기준:

- 기존 랭킹 다이얼로그 UI가 깨지지 않는다.
- 같은 랭킹 UI를 푸터바에서도 재사용할 수 있다.

### 7단계: 실시간 제출 로그 컴포넌트 추가

신규:

- `towercrane-for-uiux-front/src/features/sql-practice/ui/sql-activity-feed.tsx`

작업:

1. `SqlPracticeActivityItem[]`을 받아 최신 제출 목록을 렌더링한다.
2. 각 row에는 아래 정보를 표시한다.
   - 사용자명
   - 문제 번호와 제목
   - 정답/오답 badge
   - 제출 시각
3. 빈 상태와 로딩 상태를 포함한다.
4. 정답은 `CheckCircle`, 오답은 `XCircle`, 로그는 `Activity` 또는 `Clock` icon을 사용한다.

props:

```ts
type SqlActivityFeedProps = {
  activities: SqlPracticeActivityItem[]
  isLoading: boolean
  currentUserId: string
}
```

완료 기준:

- 최근 제출이 최신순으로 보인다.
- 내 제출 row는 `bg-brand-glass` 정도로만 은은하게 강조한다.
- 긴 문제 제목은 truncate 처리한다.

### 8단계: 푸터 drawer 컴포넌트 추가

신규:

- `towercrane-for-uiux-front/src/features/sql-practice/ui/sql-practice-footer-drawer.tsx`

작업:

1. 닫힘/열림 상태를 props로 받는다.
2. 닫힘 상태 높이는 약 `56px`로 고정한다.
3. 열림 상태 높이는 desktop 기준 `320px` 내외, viewport 기준 `max-h-[42dvh]` 수준으로 제한한다.
4. 열릴 때는 하단에서 위로 올라오는 transition을 적용한다.
5. 내부는 좌우 2분할 grid로 구성한다.
   - 왼쪽: `SqlRankingTable`
   - 오른쪽: `SqlActivityFeed`
6. 상단 bar에는 toggle 버튼, 현재 seed, 내 점수 요약, 최근 제출 요약을 넣는다.

props 예시:

```ts
type SqlPracticeFooterDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  seedFile?: string
  rankings: SqlPracticeRankingItem[]
  activities: SqlPracticeActivityItem[]
  rankingLoading: boolean
  activityLoading: boolean
  currentUserId: string
  myScore: number
  maxScore: number
}
```

접근성:

- toggle button에 `aria-expanded`를 넣는다.
- 버튼 label은 `SQL 랭킹과 제출 로그 열기/닫기`로 둔다.
- `Escape`로 닫는 처리는 선택 사항이다. 구현한다면 `useEffect`로 keydown을 등록한다.

완료 기준:

- 닫힘 상태에서 화면 하단에 얇게 보인다.
- 열림 상태에서 위로 펼쳐진다.
- 왼쪽 랭킹과 오른쪽 로그가 같은 높이에서 스크롤된다.

### 9단계: SQL 페이지에 푸터바 연결

수정:

- `towercrane-for-uiux-front/src/pages/sql-practice/ui/sql-practice-page.tsx`

작업:

1. state를 추가한다.

```ts
const [footerOpen, setFooterOpen] = useState(false)
```

2. queries를 추가한다.

```ts
const footerRankingQuery = useSqlPracticeRanking(metaQuery.data?.seedFile, true)
const activityQuery = useSqlPracticeActivity(metaQuery.data?.seedFile, true)
```

3. 기존 `rankingQuery`와 중복되면 하나로 통합한다.
   - 현재는 dialog가 열릴 때만 ranking query가 enabled 된다.
   - 푸터바를 상시 쓰려면 ranking query도 상시 enabled로 바꾸는 편이 낫다.
4. root section에 footer 공간을 고려한다.
   - 닫힘 상태: `pb-16`
   - 열림 상태: `pb-[340px]` 또는 drawer가 fixed overlay면 메인 입력창이 가려지지 않도록 padding 조정
5. `<SqlPracticeFooterDrawer />`를 section 마지막에 배치한다.
6. seed 변경 시 activity/ranking은 query key가 바뀌므로 자동 갱신된다.

주의:

- 현재 메인 영역은 `h-[calc(100dvh-220px)]`를 사용한다. 푸터 drawer가 열릴 때 입력창이 가려지면 이 높이 계산을 `footerOpen` 기준으로 나눠야 한다.
- 예: 닫힘 `h-[calc(100dvh-276px)]`, 열림 `h-[calc(100dvh-540px)]`처럼 직접 줄이기보다, root에 bottom padding을 주고 drawer는 fixed로 두는 방식이 구현 비용이 낮다.
- 최종 화면 QA에서 SQL 입력창이 푸터에 가려지면 main 영역 높이를 별도로 조정한다.

완료 기준:

- `/sql` 화면에서 푸터바가 항상 보인다.
- 열고 닫을 수 있다.
- 문제 제출 직후 오른쪽 로그에 내 제출이 표시된다.
- 왼쪽 랭킹도 점수가 갱신된다.

### 10단계: 반응형 처리

수정:

- `towercrane-for-uiux-front/src/features/sql-practice/ui/sql-practice-footer-drawer.tsx`
- 필요 시 `towercrane-for-uiux-front/src/pages/sql-practice/ui/sql-practice-page.tsx`

작업:

1. desktop에서는 `grid-cols-2`.
2. tablet 이하에서는 세로 분할로 바꾼다.
   - 위: 랭킹
   - 아래: 활동 로그
3. mobile에서는 drawer 높이를 `70dvh`까지 허용하고 내부 영역을 각각 scroll 처리한다.
4. 텍스트가 버튼/row 밖으로 넘치지 않게 `min-w-0`, `truncate`, `tabular-nums`를 사용한다.

완료 기준:

- 1440px 이상에서 좌우 2분할이 자연스럽다.
- 768px 근처에서도 텍스트 겹침이 없다.
- mobile viewport에서 하단 drawer가 화면을 완전히 막지 않고 닫기 버튼이 항상 보인다.

### 11단계: 테스트와 검증

백엔드:

```bash
cd /Users/terecal/towercrane-for-uiux/towercrane-for-uiux-server
pnpm build
```

프론트:

```bash
cd /Users/terecal/towercrane-for-uiux/towercrane-for-uiux-front
pnpm typecheck
pnpm build
```

수동 QA:

1. `/sql` 접속
2. 푸터바 닫힘 상태 확인
3. 푸터바 열기
4. 문제 선택 후 정답 제출
5. 오른쪽 로그에 `내 이름 + 문제명 + 정답` 표시 확인
6. 일부러 오답 제출
7. 오른쪽 로그에 `오답` 표시 확인
8. 왼쪽 랭킹 점수는 오답으로 증가하지 않는지 확인
9. seed 변경 후 ranking/activity가 해당 seed 기준으로 바뀌는지 확인
10. light/dark/brand theme에서 raw palette 문제 없는지 확인

## 구현 순서 요약

1. 백엔드 activity 타입/schema 추가
2. 백엔드 `getRecentActivity` 서비스 추가
3. 백엔드 `GET /sql/submissions/activity` 라우트 추가
4. 프론트 activity 타입/API/hook 추가
5. 제출 성공 시 activity query invalidate
6. 랭킹 테이블 컴포넌트 분리
7. activity feed 컴포넌트 추가
8. footer drawer 컴포넌트 추가
9. `/sql` 페이지에 drawer 연결
10. 반응형과 겹침 QA
11. build/typecheck 검증

## 후속 고도화

- WebSocket 기반 실시간 push로 전환
- 전체 seed 통합 랭킹 추가
- 최근 1시간/오늘/전체 기간 필터 추가
- 정답 streak, 첫 정답자, 가장 많이 푼 문제 같은 보조 지표 추가
- 푸터바 열림 상태를 localStorage에 저장
