# SQL 연습 페이지 헤더 문제 풀이 기능 구현 계획

## 목표

`/sql` 연습장 페이지의 상단 검은 헤더 오른쪽에 있는 `SQLite` 배지를 `문제 풀기` 버튼으로 교체한다.

사용 흐름은 다음과 같다.

1. 기본 상태: 헤더 왼쪽에는 `SQL 연습장` 제목/설명, 오른쪽에는 `문제 풀기` 버튼이 보인다.
2. `문제 풀기` 클릭: 같은 헤더 오른쪽 영역에 `초보`, `중수`, `고수` 선택 버튼이 열린다.
3. 난이도 선택: 현재 seed의 해당 난이도 문제 10개를 한 문제씩 보여준다.
4. 문제 풀이 상태: 헤더 전체가 문제 풀이 패널로 바뀐다.
   - 왼쪽: 현재 문제
   - 오른쪽: 정답 보기 버튼, 이전/다음 이동 버튼, 진행 번호
5. `정답 보기` 클릭: 버튼 아래에 정답 SQL 박스와 해설 박스가 열린다.
6. 좌우 이동: 같은 난이도의 모든 문제를 순서대로 확인한다. 문제 이동 시 정답 공개 상태는 기본적으로 닫는다.

문제 데이터는 새로 만들지 않고, 현재 SQL 예제 페이지에서 쓰는 데이터를 그대로 재사용한다.

- `towercrane-for-uiux-front/src/features/sql-practice/model/examples/*`
- `getSqlPracticeExampleSet(currentSeedFile)`
- `SqlPracticeExample`
- `SqlExampleLevel`

## 구현 범위

이번 기능은 프론트엔드만 수정한다.

백엔드 API, seed SQL, ERD API는 변경하지 않는다.

## 현재 구조 확인

관련 파일:

- `towercrane-for-uiux-front/src/pages/sql-practice/ui/sql-practice-page.tsx`
  - `/sql` 페이지 본문
  - 상단 헤더에 `SQLite` 배지가 있음
  - `useSqlPracticeMeta()`로 현재 seed 파일을 알고 있음
- `towercrane-for-uiux-front/src/pages/sql-practice/ui/sql-practice-examples-page.tsx`
  - `/sql/examples` 전용 예제 페이지
  - 이미 난이도별 문제 선택, 정답 보기, 복사 기능 패턴이 있음
- `towercrane-for-uiux-front/src/features/sql-practice/model/sql-practice-examples.ts`
  - `getSqlPracticeExampleSet(seedFile)` export
- `towercrane-for-uiux-front/src/entities/sql-practice/model/example-types.ts`
  - `SqlExampleLevel`, `SqlPracticeExample` 타입 정의
- `towercrane-for-uiux-front/src/shared/ui/button.tsx`
  - 공용 버튼
- `towercrane-for-uiux-front/src/shared/ui/tabs.tsx`
  - 난이도 선택 UI에 재사용 가능
- `towercrane-for-uiux-front/src/index.css`
  - semantic token, `ui-*` 유틸 정의

## 설계 원칙

1. raw Tailwind 팔레트 색상은 쓰지 않는다.
   - 금지 예: `text-white`, `text-slate-*`, `bg-white/*`, `border-white/*`, `text-emerald-*`
   - 사용 예: `text-text-primary`, `text-text-secondary`, `bg-surface-muted`, `border-surface-border-soft`, `bg-brand-glass`
2. `/sql/examples`의 문제 데이터와 타입을 그대로 재사용한다.
3. 문제 풀이 UI는 `/sql` 헤더 안에 독립 컴포넌트로 분리한다.
4. 헤더가 너무 커져도 본문 SQL 입력/결과 영역을 가리지 않게 한다.
5. 답안 SQL은 복사 기능까지 같이 제공하면 좋지만, 1차 필수 범위는 `정답 보기/숨기기`다.

## 파일별 구현 계획

### 1. 새 컴포넌트 추가

파일:

- `towercrane-for-uiux-front/src/features/sql-practice/ui/sql-practice-header-quiz.tsx`

역할:

- `/sql` 상단 헤더의 우측 `문제 풀기` 버튼, 난이도 선택, 문제/정답 표시를 담당한다.

Props 초안:

```ts
type SqlPracticeHeaderQuizProps = {
  seedFile?: string
}
```

내부 상태:

```ts
type QuizMode = 'idle' | 'level-picker' | 'active'

const [mode, setMode] = useState<QuizMode>('idle')
const [level, setLevel] = useState<SqlExampleLevel | null>(null)
const [index, setIndex] = useState(0)
const [answerOpen, setAnswerOpen] = useState(false)
```

계산 값:

```ts
const exampleSet = useMemo(
  () => getSqlPracticeExampleSet(seedFile ?? '01_board_basic.sql'),
  [seedFile],
)

const currentExamples = level ? exampleSet[level] : []
const currentExample = currentExamples[index]
```

주요 동작:

- `문제 풀기` 클릭: `mode = 'level-picker'`
- `초보/중수/고수` 클릭:
  - `level` 설정
  - `index = 0`
  - `answerOpen = false`
  - `mode = 'active'`
- 이전/다음:
  - 범위 밖으로 못 나가게 disabled 처리
  - 이동 시 `answerOpen = false`
- 닫기/초기화:
  - 헤더를 기본 상태로 되돌릴 수 있는 닫기 버튼 제공

UI 구성:

- idle:
  - `BookOpenCheck` 아이콘 + `문제 풀기`
- level-picker:
  - `초보`, `중수`, `고수` 버튼
  - 각 버튼에 문제 개수 표시 가능: `초보 10`
- active:
  - 왼쪽 문제 영역:
    - 난이도 라벨
    - `Q.01 / 10`
    - 제목
    - 설명
    - 관련 테이블 뱃지
    - 힌트
  - 오른쪽 컨트롤 영역:
    - 이전/다음 아이콘 버튼
    - `정답 보기` 버튼
    - 닫기 버튼
    - 정답이 열린 경우 SQL 박스와 해설 박스

아이콘 후보:

- `BookOpenCheck`
- `ChevronLeft`
- `ChevronRight`
- `Eye`
- `EyeOff`
- `X`
- `Table2`
- `Lightbulb`

스타일:

- 헤더의 검은 배경과 맞추되 raw palette 없이 semantic token/변수 사용
- 현재 `sql-practice-page.tsx`의 헤더가 `bg-text-primary`, `text-background`를 쓰므로 신규 컴포넌트도 이 톤에 맞춘다.
- 내부 박스는 `border-background/20`, `bg-background/10`처럼 현재 파일의 기존 패턴을 유지할 수 있지만, 가능하면 semantic token 또는 CSS 변수 기반으로 정리한다.

주의:

- `text-white` 사용 금지
- `bg-slate-*`, `border-slate-*` 사용 금지
- 긴 문제 설명이 헤더 폭을 깨지 않게 `min-w-0`, `line-clamp`, responsive grid 사용

### 2. `/sql` 페이지 헤더 교체

파일:

- `towercrane-for-uiux-front/src/pages/sql-practice/ui/sql-practice-page.tsx`

변경:

- 기존 import에서 `Trash2`는 히스토리 비우기 버튼이 새 컴포넌트로 이동하지 않으면 유지한다.
- 새 컴포넌트 import:

```ts
import { SqlPracticeHeaderQuiz } from '../../../features/sql-practice/ui/sql-practice-header-quiz'
```

현재 헤더 우측:

```tsx
<span>SQLite</span>
{history.length > 0 && <button>...</button>}
```

변경 후:

```tsx
<SqlPracticeHeaderQuiz seedFile={metaQuery.data?.seedFile} />
{history.length > 0 && <button>...</button>}
```

또는 문제 풀이 모드에서 헤더 전체 레이아웃을 바꿔야 하므로, 더 깔끔한 구조:

```tsx
<SqlPracticeHeader
  seedFile={metaQuery.data?.seedFile}
  hasHistory={history.length > 0}
  onClearHistory={() => setHistory([])}
/>
```

1차 구현은 파일 수를 줄이기 위해 `SqlPracticeHeaderQuiz`만 추가하고, 기존 제목 영역은 `sql-practice-page.tsx`에 둔다.

### 3. 필요 시 헤더 전체 컴포넌트로 승격

파일:

- `towercrane-for-uiux-front/src/features/sql-practice/ui/sql-practice-page-header.tsx`

이 단계는 선택 사항이다.

조건:

- `sql-practice-page.tsx` 헤더 JSX가 너무 커지거나
- 문제 풀이 active 상태에서 왼쪽 제목 영역까지 통째로 바꿔야 해서 레이아웃 제어가 어려울 때

역할:

- 헤더 전체를 담당한다.
- 기본 헤더와 문제 풀이 헤더를 한 컴포넌트 안에서 분기한다.

Props:

```ts
type SqlPracticePageHeaderProps = {
  seedFile?: string
  hasHistory: boolean
  onClearHistory: () => void
}
```

권장:

- 사용자 요구가 “선택하면 헤더 전체가 왼쪽에 문제 오른쪽에 정답”이므로, 최종 구현은 이 컴포넌트 분리가 더 적합하다.
- 1차부터 `SqlPracticePageHeader`로 분리하면 `sql-practice-page.tsx`가 깨끗해진다.

### 4. 기존 `/sql/examples` 페이지는 유지

파일:

- `towercrane-for-uiux-front/src/pages/sql-practice/ui/sql-practice-examples-page.tsx`

변경하지 않는 것을 기본으로 한다.

이유:

- `/sql/examples`는 ERD + 전체 문제 탐색 페이지로 의미가 다르다.
- 새 기능은 `/sql`에서 빠르게 한 문제씩 풀어보는 헤더 내 미니 풀이 모드다.

단, 중복 UI가 커지면 나중에 아래 컴포넌트를 공유할 수 있다.

- 문제 상세 카드
- 정답 SQL 박스
- 정답 보기 버튼

이번 1차 구현에서는 과한 추상화를 피한다.

### 5. 타입/데이터 파일 변경 여부

파일:

- `towercrane-for-uiux-front/src/entities/sql-practice/model/example-types.ts`
- `towercrane-for-uiux-front/src/features/sql-practice/model/sql-practice-examples.ts`
- `towercrane-for-uiux-front/src/features/sql-practice/model/examples/index.ts`

변경 없음.

필요한 export가 이미 있다.

- `SqlExampleLevel`
- `SqlPracticeExample`
- `getSqlPracticeExampleSet`
- `sqlExampleLevelLabels`

### 6. 스타일/테마 점검

파일:

- `towercrane-for-uiux-front/src/index.css`

변경 없음이 원칙이다.

새 유틸이 꼭 필요할 때만 추가한다.

금지 검색:

```bash
rg -n "text-white|text-slate-|text-emerald-|text-amber-|text-sky-|bg-white/|bg-slate-|bg-emerald-500|border-white/|border-slate-|border-emerald-" towercrane-for-uiux-front/src
```

새 코드에서 위 패턴이 나오면 수정한다.

## 단계별 작업 순서

### 1단계: 데이터 연결 확인

- `sql-practice-page.tsx`에서 `metaQuery.data?.seedFile`을 새 컴포넌트로 넘긴다.
- 새 컴포넌트에서 `getSqlPracticeExampleSet(seedFile)`로 문제 세트를 가져온다.
- 현재 seed가 `01_board_basic.sql`이면 초보/중수/고수 각 10개가 나와야 한다.

완료 기준:

- 콘솔 에러 없이 현재 seed의 문제 개수를 계산할 수 있다.

### 2단계: 기본 버튼/난이도 선택 구현

- `SQLite` 배지를 제거한다.
- 같은 위치에 `문제 풀기` 버튼을 둔다.
- 클릭 시 `초보`, `중수`, `고수` 버튼이 보인다.
- 난이도 버튼에는 문제 수를 함께 표시한다.

완료 기준:

- 헤더 오른쪽에서 `문제 풀기 -> 초보/중수/고수` 흐름이 동작한다.

### 3단계: 헤더 active 문제 UI 구현

- 난이도 선택 후 헤더를 문제 풀이 모드로 전환한다.
- 왼쪽에 현재 문제 제목/설명/힌트/관련 테이블을 표시한다.
- 오른쪽에 이전/다음, 진행 번호, 정답 보기 버튼을 표시한다.

완료 기준:

- 초보 선택 시 1번 문제가 보인다.
- 다음 클릭 시 2번 문제로 넘어간다.
- 첫 문제에서 이전 disabled, 마지막 문제에서 다음 disabled.

### 4단계: 정답 공개 UI 구현

- `정답 보기` 클릭 시 정답 SQL 박스를 버튼 아래에 표시한다.
- 다시 클릭하면 닫힌다.
- 문제 이동 시 정답은 닫힌다.
- 해설도 함께 표시한다.

완료 기준:

- 정답 SQL과 해설이 현재 문제 기준으로 정확히 바뀐다.

### 5단계: 반응형/레이아웃 정리

- 데스크톱에서는 `왼쪽 문제 / 오른쪽 정답 컨트롤` 2컬럼.
- 좁은 화면에서는 1컬럼으로 내려간다.
- 헤더가 길어져도 본문 카드/사이드바와 겹치지 않는다.
- 긴 SQL은 `overflow-x-auto`로 가로 스크롤 처리한다.

완료 기준:

- 1440px, 1024px, 모바일 폭에서 텍스트 겹침이 없다.

### 6단계: 정리 및 검증

명령:

```bash
pnpm --dir towercrane-for-uiux-front lint
pnpm --dir towercrane-for-uiux-front build
```

브라우저 확인:

- `/sql`
- `문제 풀기`
- `초보`
- 이전/다음
- 정답 보기/숨기기
- seed 변경 후 문제 데이터가 해당 seed로 바뀌는지 확인

## 권장 구현 형태

최종적으로는 아래 파일 구성이 가장 깔끔하다.

```text
towercrane-for-uiux-front/src/pages/sql-practice/ui/sql-practice-page.tsx
towercrane-for-uiux-front/src/features/sql-practice/ui/sql-practice-page-header.tsx
towercrane-for-uiux-front/src/features/sql-practice/ui/sql-practice-header-quiz.tsx
```

하지만 1차 구현에서 파일을 최소화하려면 다음 2파일만 수정/추가해도 된다.

```text
towercrane-for-uiux-front/src/pages/sql-practice/ui/sql-practice-page.tsx
towercrane-for-uiux-front/src/features/sql-practice/ui/sql-practice-header-quiz.tsx
```

내 판단으로는 `sql-practice-page-header.tsx`까지 분리하는 방식이 더 좋다.

이유:

- 사용자 요구가 단순 버튼 교체가 아니라 “헤더 전체 전환”이다.
- `sql-practice-page.tsx`는 이미 실행 히스토리, 입력바, 사이드바 조율 책임을 갖고 있다.
- 헤더 상태까지 같은 파일에 넣으면 페이지 파일이 금방 커진다.

## 구현 시 주의할 점

- 문제 데이터가 없는 seed일 수 있다. 이 경우 난이도 버튼은 disabled 처리하고 `문제 준비 중` 메시지를 보여준다.
- uploaded seed는 예제 데이터가 없을 가능성이 높다.
- seed가 바뀌면 선택된 난이도/문제 index/정답 공개 상태를 초기화한다.
- `history.length > 0`일 때 보이는 히스토리 비우기 버튼은 유지한다.
- 기존 `/sql/examples` 진입 버튼은 사이드바에 남겨도 된다. 헤더 문제 풀기는 빠른 풀이, `/sql/examples`는 전체 탐색/ERD 용도로 역할이 다르다.

## 예상 수정량

- 신규 컴포넌트 1~2개
- 기존 페이지 1개 import/헤더 JSX 교체
- 타입/데이터/백엔드 변경 없음

## 완료 기준

- `/sql` 상단 헤더의 `SQLite` 배지가 사라지고 `문제 풀기` 버튼이 표시된다.
- `문제 풀기 -> 초보/중수/고수 -> 문제 1개씩 보기` 흐름이 동작한다.
- 좌우 이동으로 해당 난이도의 모든 문제를 볼 수 있다.
- `정답 보기` 버튼 아래에 정답 SQL과 해설이 열린다.
- 새 코드에 raw Tailwind 팔레트 금지 패턴이 없다.
- `pnpm --dir towercrane-for-uiux-front lint`와 `build`가 통과한다.
