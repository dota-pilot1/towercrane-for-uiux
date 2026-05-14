# SQL 연습장 본문 SQL 출제 및 채점 기능 구현 계획

## 목표

SQL 연습장 문제 본문에서 사용자가 정답 SQL을 바로 입력하고 제출할 수 있게 한다. 제출 시 Gemini가 현재 문제의 실제 정답 SQL과 사용자 입력 SQL을 비교해 정답 여부와 풀이 피드백을 바로 아래에 출력한다.

## 구현 범위

1. 문제 본문 UI
   - 문제 설명과 힌트 아래, `정답 보기` 버튼 위에 정답 입력 textarea를 배치한다.
   - 제출 버튼을 textarea 우측 또는 하단에 배치해 현재 입력 SQL을 채점한다.
   - 채점 중, 성공, 실패, 오류 상태를 같은 영역 안에서 표시한다.

2. 정답 보기 UI
   - `정답 보기` 버튼은 문제 패널 우하단으로 이동한다.
   - 버튼을 누르면 기존처럼 모범 SQL과 해설을 표시한다.
   - 사용자가 제출한 풀이 결과와 모범 SQL 영역이 서로 구분되도록 한다.

3. Gemini 채점
   - 기존 `/sql/gemini` API와 Gemini SQL 검증 흐름을 참고한다.
   - 새 `grading` 모드를 추가해 “문제, 실제 정답 SQL, 사용자 SQL”을 비교하는 전용 프롬프트를 사용한다.
   - Gemini 응답 첫 줄은 `[SQL_CORRECT]` 또는 `[SQL_INCORRECT]`로 고정해 프론트에서 판정 배지를 안정적으로 표시한다.

4. 프론트 데이터 흐름
   - `ProblemPanel`에서 사용자 답안, 채점 결과, 로딩, 오류 상태를 관리한다.
   - 문제를 바꾸거나 닫으면 입력/채점 결과를 초기화한다.
   - Gemini 응답 파서로 첫 줄 태그를 제거하고 본문 피드백만 표시한다.

5. 검증
   - 금지된 raw Tailwind 팔레트 색상을 추가하지 않는다.
   - 프론트 타입체크 또는 빌드를 실행한다.
   - 필요하면 로컬 화면에서 문제 패널 레이아웃을 확인한다.

## 예상 수정 파일

- `towercrane-for-uiux-server/src/sql-practice/sql-practice.schemas.ts`
- `towercrane-for-uiux-server/src/sql-practice/sql-practice.service.ts`
- `towercrane-for-uiux-front/src/entities/sql-practice/api/sql-practice-api.ts`
- `towercrane-for-uiux-front/src/pages/sql-practice/ui/sql-practice-page.tsx`
