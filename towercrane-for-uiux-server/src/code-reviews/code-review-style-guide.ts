export const codeReviewStyleGuide = `
# 코드 리뷰 출력 가이드

## 핵심 원칙
- 리뷰는 변경 diff를 이해하기 위한 작업 노트처럼 작성한다.
- reviewGoal이 있으면 그 기능 흐름을 최우선 기준으로 삼고, 직접 관련 없는 일반론은 쓰지 않는다.
- 주요 프로세스는 코드 없이 전체 흐름만 설명한다.
- 주요 로직은 함수/모듈명, 코드, 설명 순서로만 단순하게 보여준다.
- 주요 문법은 정말 특이하거나 난이도 있는 문법이 있을 때만 작성한다.
- import 목록, 단순 type/interface 선언, 일반적인 TypeScript 안정성 설명은 주요 문법으로 뽑지 않는다.
- 테스트 부족만 주요 리뷰 결과로 만들지 않는다.

## 섹션별 body 형식

### 1. 파일 구조 도식화
plain text tree만 작성한다. 설명 문장은 recommendation에만 넣는다.

### 2. 주요 프로세스
번호 목록으로 흐름만 작성한다. 코드블록을 넣지 않는다.

### 3. 주요 로직
아래 형식을 반복한다.

1. 함수/모듈: 함수명 또는 모듈명
코드:
\`\`\`ts
실제 핵심 코드 3~12줄
\`\`\`
설명: 해당 코드가 맡는 역할을 짧게 설명한다.

### 4. 주요 문법
특이 문법이 없으면 정확히 "특이 문법 없음."만 작성한다.
특이 문법이 있으면 아래 형식을 반복한다.

1. 기술 이름
TanStack Query:
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
1. 사용자가 GitHub compare URL과 리뷰 관점을 선택한다.
2. 프론트 API 계층이 분석 요청을 서버로 보낸다.
3. 서버가 diff와 변경 파일 컨텍스트를 수집한다.
4. 리뷰 항목을 정규화해 code_reviews에 저장한다.
5. 목록/상세 화면에서 저장된 리뷰를 확인한다.

### 3. 주요 로직
1. 함수/모듈: analyze
코드:
\`\`\`ts
const detail = await analyzeMutation.mutateAsync({
  sourceUrl,
  repositoryUrl,
  sections: selectedSections,
})
\`\`\`
설명: 화면 입력값을 서버 분석 요청으로 넘기는 진입점이다.

2. 함수/모듈: analyzeAndSave
코드:
\`\`\`ts
const diff = await this.fetchDiff(source.diffUrl)
const analysis = await this.reviewDiff(source, reviewedFiles, excludedFiles, input.sections)
this.db.insert(codeReviewsTable).values(row).run()
\`\`\`
설명: diff 수집, 리뷰 생성, 저장을 한 흐름으로 연결한다.

### 4. 주요 문법
특이 문법 없음.

## 금지 예시
- import 목록만 코드로 보여주기
- type/interface 선언만 길게 보여주기
- 코드 없이 함수명만 나열하기
- "TypeScript 타입 안정성이 좋습니다" 같은 일반론 반복하기
- diff와 무관한 테스트 부족 지적을 주요 결과로 만들기
`.trim();
