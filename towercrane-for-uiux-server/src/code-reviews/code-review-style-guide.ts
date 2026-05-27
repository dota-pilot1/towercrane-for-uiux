export const codeReviewStyleGuide = `
# 코드 리뷰 출력 가이드

## 핵심 원칙
- 리뷰는 변경 diff를 이해하기 위한 작업 노트처럼 작성한다.
- reviewGoal이 있으면 그 기능 흐름을 최우선 기준으로 삼고, 직접 관련 없는 일반론은 쓰지 않는다.
- 주요 프로세스는 코드 없이 전체 흐름만 설명한다.
- 주요 로직의 단계 제목은 "무슨 코드인가"를 먼저 쓴다. 함수명은 괄호 안에 보조로 넣는다.
- 주요 로직은 주제 제목, 핵심 코드, 설명 순서로만 단순하게 보여준다.
- 주요 로직 코드블록에는 의도를 읽을 수 있는 짧은 주석을 1~2개 넣는다.
- 핵심 문법은 diff 이해에 필요한 기술/패턴이 있을 때만 작성한다.
- import 목록, 단순 type/interface 선언, 일반적인 TypeScript 안정성 설명은 핵심 문법으로 뽑지 않는다.
- 테스트 부족만 주요 리뷰 결과로 만들지 않는다.

## 섹션별 body 형식

### 1. 변경 파일 구조
커밋에서 실제 변경된 파일만 plain text tree로 작성한다. 설명 문장은 recommendation에만 넣는다.

### 2. 주요 프로세스
번호 목록으로 흐름만 작성한다. 코드블록을 넣지 않는다.

### 3. 주요 로직
아래 형식을 반복한다.

단계 1. 수정 버튼 UI (함수 컴포넌트: 함수명)

핵심 코드:
\`\`\`ts
// 이 함수가 맡는 핵심 책임
실제 핵심 코드 3~12줄
\`\`\`

설명: 해당 코드가 맡는 역할을 짧게 설명한다.

### 4. 핵심 문법
핵심 문법이 없으면 정확히 "핵심 문법 없음."만 작성한다.
핵심 문법이 있으면 아래 형식을 반복한다.

문법 1. TanStack Query

관련 코드:
\`\`\`ts
실제 핵심 코드 3~10줄
\`\`\`

보충 설명: 이 문법이 왜 여기서 중요한지 설명한다.

### 5. 아키텍처/클린코드 평가
레이어 경계, 책임 분리, 파일 크기, 중복, 명명, 유지보수성 기준으로 짧게 평가한다.

### 6. mmd 흐름도
body는 반드시 Mermaid 원문만 작성한다. 첫 줄은 flowchart TD여야 한다.

## 좋은 예시

### 2. 주요 프로세스
1. 사용자가 GitHub commit URL과 리뷰 관점을 선택한다.
2. 프론트 API 계층이 분석 요청을 서버로 보낸다.
3. 서버가 diff와 변경 파일 컨텍스트를 수집한다.
4. 리뷰 항목을 정규화해 code_reviews에 저장한다.
5. 목록/상세 화면에서 저장된 리뷰를 확인한다.

### 3. 주요 로직
단계 1. 리뷰 요청 전송 (함수 컴포넌트: analyze)

핵심 코드:
\`\`\`ts
// 리뷰 요청값을 서버 분석 요청으로 전달
const detail = await analyzeMutation.mutateAsync({
  sourceUrl,
  repositoryUrl,
  reviewGoal,
  sections: selectedSections,
})
\`\`\`

설명: 커밋 URL, 저장소 URL, 리뷰할 로직 설명을 서버 분석 요청으로 넘기는 진입점이다.

단계 2. diff 분석과 리뷰 저장 (서비스 함수: analyzeAndSave)

핵심 코드:
\`\`\`ts
// diff 수집부터 리뷰 저장까지 서버에서 한 번에 처리
const diff = await this.fetchDiff(source.diffUrl)
const analysis = await this.reviewDiff(source, reviewedFiles, excludedFiles, input.sections)
this.db.insert(codeReviewsTable).values(row).run()
\`\`\`

설명: 커밋 diff 수집, 변경 파일 파싱, 리뷰 생성, 저장을 한 흐름으로 연결한다.

### 4. 핵심 문법
핵심 문법 없음.

## 금지 예시
- import 목록만 코드로 보여주기
- type/interface 선언만 길게 보여주기
- 코드 없이 함수명만 나열하기
- "TypeScript 타입 안정성이 좋습니다" 같은 일반론 반복하기
- diff와 무관한 테스트 부족 지적을 주요 결과로 만들기
`.trim();
