# SQL 연습장(공식) 모바일 반응형 구현 계획

## 목적

`/sql` SQL 연습장(공식) 화면을 모바일에서 사용할 수 있게 만든다.

이번 범위는 **공식 연습장만**이다. 아래 화면은 제외한다.

- `/sql/user` SQL 연습장(유저)
- `/sql/personal` SQL 연습장(개인)
- `/sql/examples`
- `/sql/notes`
- 공개 공유 페이지

## 참고한 문서

- `/Users/terecal/towercrane-for-uiux/docs-for-2차 mvp/화면 크기별 반응형 ui 구현 방법 참고/라우터-분기-반응형-패턴.md`
- `/Users/terecal/towercrane-for-uiux/docs-for-2차 mvp/화면 크기별 반응형 ui 구현 방법 참고/참고 파일/KioskHome.tsx`
- `/Users/terecal/towercrane-for-uiux/docs-for-2차 mvp/화면 크기별 반응형 ui 구현 방법 참고/참고 파일/KioskDesktopView.tsx`
- `/Users/terecal/towercrane-for-uiux/docs-for-2차 mvp/화면 크기별 반응형 ui 구현 방법 참고/참고 파일/KioskMobileView.tsx`

참고 문서의 핵심은 “데이터/상태 로직은 공유하고, 데스크탑/모바일 View는 분리한다”이다.
이 프로젝트는 Next.js가 아니라 Vite + TanStack Router 구조이므로, 그대로 `/sql/mobile` 리다이렉트를 먼저 만들기보다는 `/sql` 안에서 viewport 기반 `variant` 분기를 적용한다.

## 현재 구조 요약

공식 SQL 연습장은 아래 파일 중심으로 구성되어 있다.

- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-front/src/pages/sql-practice/ui/sql-practice-page.tsx`
- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-front/src/features/sql-practice/ui/sql-quiz-sidebar.tsx`
- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-front/src/features/sql-practice/ui/sql-schema-sidebar.tsx`
- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-front/src/features/sql-practice/ui/sql-input-bar.tsx`
- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-front/src/features/sql-practice/ui/sql-practice-footer-drawer.tsx`

현재 `/sql`은 데스크탑 기준 3분할 레이아웃이다.

- 왼쪽: 문제 목록 사이드바
- 중앙: 문제/결과/SQL 입력 영역
- 오른쪽: 테이블/ERD/seed 관리 사이드바
- 하단 fixed drawer: 랭킹/풀이 로그

모바일에서는 이 구조가 그대로 축소되면 가로 폭이 부족하고, 입력창과 양쪽 사이드바가 충돌한다. 따라서 Tailwind `md:` 조정만으로 끝내지 않고 모바일 전용 정보 구조가 필요하다.

## 구현 방향

### 1. 로직과 View 분리

`SqlPracticePage`에 데이터 조회, 선택 상태, 실행/채점 핸들러, 사이드바 상태가 한 파일에 모여 있다.
먼저 공식 페이지용 상태를 hook으로 분리한다.

예상 파일:

- `src/pages/sql-practice/model/use-media-query.ts`
- `src/pages/sql-practice/model/use-sql-practice-official-workbench.ts`
- `src/pages/sql-practice/ui/sql-practice-desktop-view.tsx`
- `src/pages/sql-practice/ui/sql-practice-mobile-view.tsx`

`SqlPracticePage`는 아래처럼 얇게 만든다.

```tsx
export function SqlPracticePage() {
  const workbench = useSqlPracticeOfficialWorkbench()
  const isMobile = useMediaQuery('(max-width: 767px)')

  if (isMobile) return <SqlPracticeMobileView workbench={workbench} />
  return <SqlPracticeDesktopView workbench={workbench} />
}
```

### 2. 모바일 정보 구조

모바일은 데스크탑의 3분할을 그대로 접지 않는다.
문제를 고르고 바로 풀 수 있는 흐름을 우선한다.

모바일 1차 구조:

- 최상단: 공식 연습장 헤더 + 현재 파일/문제 선택 영역
- 상단 슬라이드: 데스크탑 왼쪽 문제 목록을 모바일 전용 가로 슬라이드로 재구성
- 파일 선택: 데스크탑 오른쪽 사이드바의 seed 파일 전환 기능을 상단 문제 선택 영역에 통합
- 중앙 본문: 데스크탑 가운데 영역을 모바일 세로 흐름에 맞춘 전용 컴포넌트로 재구성
- 오른쪽 사이드바: 모바일에서는 제거
- 테이블/ERD: 오른쪽 사이드바를 상시 노출하지 않고, 필요할 때 여는 버튼/시트/다이얼로그로 제공
- 랭킹/풀이 로그: 모바일 1차에서는 우선순위를 낮추고, 필요 시 하단 접힘 영역 또는 별도 버튼으로 연결

문제 풀이 중에는 입력 영역을 우선한다.

- 문제를 선택하면 중앙 문제 풀이 영역이 즉시 해당 문제로 갱신
- 선택 문제의 이전/다음/닫기 액션은 상단 compact toolbar로 유지
- 정답/오답/오답 분석/보충 설명 버튼은 결과 영역 아래로 세로 배치

기존에 검토했던 `문제 / 쿼리 / 테이블 / 랭킹` 탭 방식은 보류한다.
공식 연습장 1차 모바일 UX에서는 “문제 슬라이드 + 풀이 본문”이 더 직접적이다.

### 3. 사이드바 컴포넌트 재사용 방식

기존 `SqlQuizSidebar`, `SqlSchemaSidebar`는 데스크탑 사이드바 width와 height에 강하게 묶여 있다.
모바일에서 그대로 쓰지 않고, 내부 반복 UI를 작은 컴포넌트로 분리해 재사용한다.

후보:

- `SqlQuizLevelTabs`
- `SqlQuizProblemList`
- `SqlMobileProblemCarousel`
- `SqlMobileSeedSelector`
- `SqlMobilePracticePanel`
- `SqlMobileSchemaActions`
- `SqlSchemaSeedCard`
- `SqlSchemaTableList`
- `SqlPracticeRankingPanel`
- `SqlPracticeActivityPanel`

반복되는 “목록 항목 + 상태 아이콘”, “seed 카드”, “테이블 행”은 `features/sql-practice/ui/`에 두고, 전역 공통성이 생길 때만 `shared/ui/`로 올린다.

### 4. 라우터 분기 여부

참고 문서의 라우터 분기 패턴은 Next.js의 `/customer`와 `/customer/mobile` 구조다.
현재 프로젝트는 Vite + TanStack Router이며 `/sql` 단일 경로에서 동작한다.

1차 구현은 `/sql` 단일 경로 + `useMediaQuery` 분기를 사용한다.

나중에 아래 조건이 생기면 `/sql/mobile` 라우트를 추가한다.

- 모바일 URL을 별도로 공유해야 함
- 모바일 번들에서 데스크탑 전용 UI를 완전히 제외해야 함
- 데스크탑/모바일 간 뒤로가기 UX를 명확히 분리해야 함

## 스타일 규칙

AGENTS.md 규칙을 따른다.

- raw Tailwind 팔레트 금지
- `text-text-primary`, `text-text-secondary`, `text-text-muted` 사용
- `bg-surface-muted`, `bg-surface-raised`, `bg-surface-strong` 사용
- `border-surface-border`, `border-surface-border-soft` 사용
- 브랜드 강조는 `text-brand-primary`, `bg-brand-glass`, `border-brand-border` 사용
- 버튼/입력은 가능한 `ui-icon-button`, `ui-icon-button-brand`, `ui-input` 재사용

## 단계별 계획

### 0단계: FSD 기준 컴포넌트 분리

모바일 반응형 구현 전에 `/sql` 공식 연습장의 큰 파일을 먼저 나눈다.
이 단계는 **동작 변경 없이 구조만 정리**한다.

분리 대상:

- `pages/sql-practice/ui/sql-practice-page.tsx`
  - 공식 페이지 진입점과 데스크탑 레이아웃 조립만 유지
- `features/sql-practice/ui/sql-problem-panel.tsx`
  - 문제 설명, 대상 테이블, 답안 SQL 입력, 제출/채점 UI
- `features/sql-practice/ui/sql-submission-result-dialog.tsx`
  - 제출 결과 다이얼로그
- `features/sql-practice/ui/sql-supplement-explanation-dialog.tsx`
  - 보충 설명 Markdown 미리보기 다이얼로그
- `features/sql-practice/ui/sql-mistake-analysis-dialog.tsx`
  - 오답 분석 다이얼로그
- `features/sql-practice/ui/sql-practice-empty-state.tsx`
  - SQL 실행 전 빈 상태
- `features/sql-practice/lib/sql-practice-analysis.ts`
  - 보충 설명 prompt, 오답 분석 prompt, 오답 라인 parser/helper

FSD 판단:

- `/sql` 공식 화면의 조립은 `pages/sql-practice`에 둔다.
- SQL 연습 도메인의 재사용 가능한 UI와 로직은 `features/sql-practice`로 내린다.
- 아직 전역 공통 컴포넌트로 볼 수 없는 항목은 `shared/ui`로 올리지 않는다.

완료 기준:

- 기존 `/sql` 데스크탑 UI 동작 변화 없음
- `sql-practice-page.tsx`에서 `ProblemPanel`, 다이얼로그, prompt/parser helper 제거
- `npm run typecheck` 통과

### 1단계: 공식 페이지 상태 hook 추출

- `SqlPracticePage`의 query/mutation/state/handler를 `useSqlPracticeOfficialWorkbench`로 이동
- 0단계에서 분리한 `SqlProblemPanel`, `SqlPracticeEmptyState`, prompt/parser helper는 그대로 재사용
- 기존 데스크탑 화면이 동일하게 동작하는지 확인

완료 기준:

- `/sql` 데스크탑 UI 시각 변화 최소화
- 문제 선택, SQL 실행, 채점, seed 변경, 테이블 선택, footer drawer 동작 유지
- `npm run typecheck` 통과

### 2단계: 데스크탑 View 분리

- 기존 JSX를 `SqlPracticeDesktopView`로 이동
- `SqlPracticePage`는 hook 호출과 viewport 분기만 담당
- 기존 `h-[calc(100dvh-220px)]` 데스크탑 높이 계산은 데스크탑 View에만 남김
- `SqlPracticeMobileView` 파일도 같이 만들되, 실제 모바일 탭 UX 구현 전까지는 임시로 데스크탑 View를 위임해 기능 회귀를 막음

완료 기준:

- 데스크탑 스크린샷이 기존과 큰 차이 없음
- `/sql/user`, `/sql/personal` 영향 없음
- `SqlPracticePage`가 아래처럼 “진입점 + 분기”만 담당

```tsx
export function SqlPracticePage() {
  const workbench = useSqlPracticeOfficialWorkbench()
  const isMobile = useMediaQuery('(max-width: 767px)')

  if (isMobile) return <SqlPracticeMobileView workbench={workbench} />
  return <SqlPracticeDesktopView workbench={workbench} />
}
```

### 3단계: 모바일 View 추가

- `SqlPracticeMobileView` 추가
- 2단계의 임시 desktop 위임을 제거하고 모바일 전용 JSX로 교체
- 상단에는 `SqlPracticePageHeader`를 유지하되 버튼이 줄바꿈/가로 스크롤 없이 들어가도록 compact 처리
- 데스크탑 왼쪽 문제 목록을 모바일 전용 가로 슬라이드 컴포넌트로 재구성
- 문제 슬라이드 영역에서 난이도 전환, 문제 선택, 정답/오답 상태 확인 가능하게 구성
- 데스크탑 오른쪽 사이드바의 파일 선택 기능은 문제 슬라이드 상단 또는 인접 compact selector로 통합
- 오른쪽 사이드바 자체는 모바일에서 렌더링하지 않음
- 중앙 영역은 모바일 전용 세로 풀이 패널로 구성
- 테이블/ERD/스키마 확인은 상단 또는 문제 본문 근처의 버튼으로 다이얼로그/시트 연결
- 모바일 높이는 `100dvh` 기준으로 fixed footer와 겹치지 않게 계산

완료 기준:

- 375px, 390px, 430px 폭에서 가로 스크롤 없음
- 텍스트가 버튼 밖으로 삐져나가지 않음
- SQL textarea가 터치 입력 가능한 높이를 확보
- 파일 변경과 문제 선택이 최상단 영역에서 가능
- 오른쪽 사이드바 없이도 ERD/테이블 스키마 확인 가능

### 4단계: 모바일용 목록/패널 컴포넌트 분리

- 문제 목록과 테이블 목록의 반복 UI를 재사용 가능한 작은 컴포넌트로 분리
- 데스크탑 사이드바와 모바일 슬라이드에서 같은 문제 상태 렌더링 로직 사용
- 선택/정답/오답 상태 표현 통일
- 모바일 문제 슬라이드는 고정 높이와 `overflow-x-auto`/snap을 사용해 레이아웃 흔들림 방지

완료 기준:

- 문제 상태 아이콘과 점수 표시가 데스크탑/모바일에서 동일한 데이터 기준으로 보임
- seed 파일 선택, 테이블 스키마 다이얼로그, ERD 다이얼로그가 모바일에서도 동작

### 5단계: 모바일 footer drawer 재배치

- 데스크탑은 기존 fixed footer drawer 유지
- 모바일은 fixed footer drawer를 우선 숨김
- 랭킹/풀이 로그는 1차에서 필수 풀이 흐름 밖으로 빼고, 필요하면 하단 접힘 영역 또는 별도 버튼으로 연결
- 최근 풀이 로그 요약은 필요하면 상단 compact row 또는 하단 접힘 영역에 표시

완료 기준:

- 모바일에서 fixed drawer가 SQL 입력창을 가리지 않음
- 랭킹/풀이 로그가 주요 풀이 동선을 방해하지 않음

### 6단계: 검증

명령어:

```bash
cd /Users/terecal/towercrane-for-uiux/towercrane-for-uiux-front
npm run typecheck
npm run lint
npm run build
```

브라우저 확인:

- `http://localhost:5174/sql`
- desktop: 1440px 이상
- tablet-ish: 768px
- mobile: 430px, 390px, 375px

확인 항목:

- 문제 선택 후 풀이 입력 가능
- Ctrl/Cmd+Enter 실행 가능
- SQL 정리 버튼 동작
- AI 도우미 다이얼로그 열림
- 정답 제출/오답 분석/보충 설명 동작
- ERD 다이얼로그 열림
- 테이블 스키마 다이얼로그 열림
- seed 이전/다음 전환 후 문제/테이블 상태 초기화
- 랭킹/풀이 로그 표시
- light/brand theme에서 글자 대비 유지

## 리스크와 주의점

- `ProblemPanel`이 현재 `sql-practice-page.tsx` 내부에 크고 복잡하게 들어 있어, hook 추출과 View 분리를 한 번에 하면 회귀 위험이 크다.
- 모바일에서 SQL 입력창이 키보드에 가려질 수 있으므로 `dvh`, `scrollIntoView`, 충분한 하단 padding을 같이 확인해야 한다.
- 기존 footer drawer는 fixed라 모바일 입력 UX와 충돌한다. 모바일에서는 탭 내부 패널로 옮기는 것이 우선이다.
- `/sql/user`, `/sql/personal`과 공유되는 API/query hook은 건드리되, 화면 파일은 공식 `/sql`에 필요한 범위만 수정한다.
