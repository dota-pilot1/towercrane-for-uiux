# 제출 후 오답일 경우 보충 설명이 아닌 오답 분석 버튼 구현 계획

## 목표

SQL 연습장에서 답안을 제출한 뒤 정답/오답 상태에 따라 피드백 액션을 분리한다.

- 정답: 기존처럼 `보충 설명` 버튼을 제공한다.
- 오답: `보충 설명` 대신 `오답 분석` 버튼을 제공한다.
- `오답 분석` 클릭 시 정답 SQL, 사용자 제출 SQL의 문제 줄 하이라이트, 틀린 이유 분석을 한 화면에서 보여준다.

## 현재 상태

- 주요 화면은 `towercrane-for-uiux-front/src/pages/sql-practice/ui/sql-practice-page.tsx`의 `ProblemPanel`에 있다.
- 제출 시 `useGradeSqlPracticeSubmission()`으로 채점하고, `gradeStatus`, `gradeBody`, `gradeError`를 화면에 표시한다.
- 현재는 `gradeBody`가 있으면 정답/오답 여부와 무관하게 `보충 설명` 버튼을 보여준다.
- 보충 설명은 `useSqlPracticeSupplementExplanation()`에서 `/sql/gemini`의 `general` 모드를 사용한다.
- 채점 응답 타입은 `SqlPracticeGradeResponse`이며, 현재는 `submission.feedback`만 내려온다.

## UX 결정

### 정답일 경우

피드백 카드에 `정답입니다` 상태와 채점 피드백을 보여준다.

액션 버튼:

```text
보충 설명
```

클릭 시 기존 보충 설명 다이얼로그를 유지한다.

### 오답일 경우

피드백 카드에 `오답입니다` 상태와 짧은 채점 피드백을 보여준다.

액션 버튼:

```text
오답 분석
```

클릭 시 오답 분석 다이얼로그를 연다.

다이얼로그 내용:

```text
정답 SQL
SELECT p.title, COUNT(l.id) AS like_count
FROM posts p
LEFT JOIN likes l ON l.post_id = p.id
GROUP BY p.id, p.title
ORDER BY like_count DESC;

내 제출 SQL
SELECT p.title, COUNT(l.id) AS like_count
FROM posts p
LEFT JOIN likes l ON l.post_id = p.id
GROUP BY p.title
ORDER BY like_count DESC;

틀린 이유 분석:
GROUP BY에 p.id가 빠져 있습니다.
게시글 제목이 같을 수 있으므로 title만으로 그룹화하면 서로 다른 게시글이 하나로 합쳐질 수 있습니다.
```

사용자 SQL 중 틀린 줄은 붉은톤 형광펜으로 표시한다.

## 구현 방향

### 1. 버튼 분기

`ProblemPanel`의 피드백 영역에서 `gradeStatus` 기준으로 버튼을 분기한다.

- `gradeStatus === 'correct'`: `보충 설명`
- `gradeStatus === 'incorrect'`: `오답 분석`
- 채점 실패 또는 실행 오류만 있는 경우: 액션 버튼 없음

파일:

```text
towercrane-for-uiux-front/src/pages/sql-practice/ui/sql-practice-page.tsx
```

### 2. 오답 분석 상태 추가

`ProblemPanel`에 오답 분석용 state를 추가한다.

```ts
const [mistakeOpen, setMistakeOpen] = useState(false)
const [mistakeBody, setMistakeBody] = useState('')
const [mistakeError, setMistakeError] = useState('')
```

로딩은 기존 `useSqlPracticeSupplementExplanation()`를 재사용하거나, 이름을 일반화한다.

추천:

```ts
useSqlPracticeExplanation()
```

다만 범위를 줄이려면 기존 mutation을 재사용하고 함수명만 나중에 정리한다.

### 3. 오답 분석 프롬프트 추가

새 prompt builder를 만든다.

```ts
buildSqlMistakeAnalysisPrompt({
  example,
  submittedSql,
  answerSql,
  gradeFeedback,
})
```

프롬프트 요구사항:

- 정답 SQL을 변형하지 말 것
- 사용자 SQL에서 틀린 줄 번호를 반환할 것
- 틀린 이유는 초보자 기준으로 짧게 설명할 것
- 가능하면 JSON으로 반환할 것

추천 응답 형식:

```json
{
  "wrongLines": [4],
  "analysis": "GROUP BY에 p.id가 빠져 있습니다. 게시글 제목이 같을 수 있으므로 title만으로 그룹화하면 서로 다른 게시글이 하나로 합쳐질 수 있습니다."
}
```

주의:

- AI가 JSON을 깨뜨릴 수 있으므로 JSON 파싱 실패 시 plain text fallback을 둔다.
- MVP에서는 `wrongLines`가 없으면 전체 사용자 SQL을 하이라이트하지 않고 분석 텍스트만 보여준다.

### 4. 오답 분석 다이얼로그 컴포넌트

새 컴포넌트 또는 기존 파일 하단 내부 컴포넌트로 시작한다.

추천 이름:

```text
SqlMistakeAnalysisDialog
```

초기 위치:

```text
towercrane-for-uiux-front/src/pages/sql-practice/ui/sql-practice-page.tsx
```

나중에 커지면 분리:

```text
towercrane-for-uiux-front/src/features/sql-practice/ui/sql-mistake-analysis-dialog.tsx
```

표시 섹션:

- `정답 SQL`
- `내 제출 SQL`
- `틀린 이유 분석`

### 5. 줄 하이라이트 구현

사용자 제출 SQL을 줄 단위로 split한다.

```ts
const lines = submittedSql.trim().split('\n')
```

`wrongLines`는 1-based line number로 관리한다.

```tsx
{lines.map((line, index) => {
  const lineNumber = index + 1
  const isWrong = wrongLines.includes(lineNumber)
  return (
    <div className={isWrong ? 'bg-danger-glass text-destructive' : ''}>
      ...
    </div>
  )
})}
```

스타일 규칙:

- raw Tailwind palette 사용 금지
- 붉은톤은 기존 토큰 사용
  - `text-destructive`
  - `bg-danger-glass`
  - `border-destructive/40`

### 6. 정답 SQL 표시

정답 SQL은 `example.answerSql` 또는 `submissionResult.answerSql` 기준으로 보여준다.

MVP에서는 이미 `example.answerSql`이 있으므로 별도 백엔드 변경 없이 가능하다.

### 7. 백엔드 변경 여부

MVP에서는 백엔드 변경 없이 가능하다.

이유:

- 제출 SQL: 프론트 state에 있음
- 정답 SQL: `example.answerSql`에 있음
- 채점 결과: 기존 `submission.feedback`에 있음
- 오답 분석: 기존 `/sql/gemini` general 모드로 요청 가능

추후 정확도를 높이려면 백엔드 채점 응답에 아래 필드를 추가한다.

```ts
analysis?: {
  wrongLines: number[]
  reason: string
}
```

하지만 1차 구현에서는 프론트 다이얼로그 + Gemini 분석 호출로 충분하다.

## 단계별 작업

### 1단계: UI 버튼 분기

- `gradeStatus === 'correct'`일 때만 `보충 설명` 표시
- `gradeStatus === 'incorrect'`일 때 `오답 분석` 표시
- 기존 보충 설명 다이얼로그는 정답 전용으로 유지

검증:

- 정답 제출 후 `보충 설명` 버튼 표시
- 오답 제출 후 `오답 분석` 버튼 표시

### 2단계: 오답 분석 다이얼로그 추가

- `SqlMistakeAnalysisDialog` 추가
- 정답 SQL, 내 제출 SQL, 틀린 이유 분석 섹션 구성
- 로딩/에러 상태 표시

검증:

- 오답 분석 버튼 클릭 시 다이얼로그 열림
- 정답 SQL과 사용자 SQL이 동시에 보임

### 3단계: AI 분석 연결

- `buildSqlMistakeAnalysisPrompt` 추가
- 기존 `geminiAsk(content, 'general')` 호출
- JSON 응답 파싱 시 `wrongLines`, `analysis` 사용
- 파싱 실패 시 원문을 `analysis`로 fallback

검증:

- `GROUP BY p.id` 누락 같은 오답에서 해당 줄 하이라이트
- 분석 문장이 `틀린 이유 분석:` 아래 표시

### 4단계: 하이라이트 안정화

- AI가 반환한 line number가 범위를 벗어나면 무시
- `wrongLines`가 비어 있으면 하이라이트 없이 분석만 표시
- 제출 SQL이 한 줄이면 1번 줄 하이라이트 허용

검증:

- 한 줄 SQL 오답
- 여러 줄 SQL 오답
- 문법 오류 SQL

### 5단계: 회귀 확인

명령:

```bash
cd towercrane-for-uiux-front
npm run typecheck
npm run build
```

브라우저 확인:

- `/sql` 접속
- 정답 제출
- 오답 제출
- `보충 설명`/`오답 분석` 분기 확인

## 구현 범위

이번 작업에 포함:

- SQL 연습장 공식 문제 화면의 제출 후 피드백 UX
- 정답/오답 버튼 분기
- 오답 분석 다이얼로그
- 사용자 SQL 줄 하이라이트

이번 작업에 미포함:

- 개인 SQL 연습장 화면까지 동일 적용
- 백엔드 채점 응답 스키마 확장
- 정교한 SQL AST diff
- 오답 분석 결과 저장

## 리스크와 대응

### AI가 틀린 줄 번호를 부정확하게 반환할 수 있음

대응:

- `wrongLines`는 보조 표시로만 사용한다.
- 분석 텍스트를 함께 보여준다.
- 범위 밖 line number는 무시한다.

### formatter 적용 여부에 따라 줄 번호가 달라질 수 있음

대응:

- 분석 요청에는 현재 textarea의 `submittedSql` 그대로 보낸다.
- 하이라이트도 같은 `submittedSql` 기준으로 표시한다.

### 오답인데 실행 오류만 있는 경우

대응:

- 실행 오류 메시지를 우선 표시한다.
- 오답 분석 버튼은 표시하되, 분석 prompt에 실행 오류도 포함한다.

## 최종 수용 기준

- 정답 제출 후 `보충 설명` 버튼만 보인다.
- 오답 제출 후 `오답 분석` 버튼만 보인다.
- 오답 분석 다이얼로그에서 정답 SQL이 보인다.
- 사용자 제출 SQL에서 AI가 지목한 틀린 줄이 붉은톤으로 강조된다.
- `틀린 이유 분석:` 섹션이 있다.
- 타입 체크와 빌드가 통과한다.
