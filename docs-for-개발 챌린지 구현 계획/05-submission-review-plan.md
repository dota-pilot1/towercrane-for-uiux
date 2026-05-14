# 05. 제출 / 검토 계획

## 제출 형식

1차 제출은 다음 3가지를 기본으로 한다.

- 댓글형 설명
- 제출 체크리스트
- GitHub 링크

필수 정책:

- `comment` 또는 `githubUrl` 중 하나는 필수
- 체크리스트는 출제 체크리스트에서 자동 생성
- GitHub 링크는 `https://github.com/...` 형태를 우선 허용

## 제출 UI

```txt
제출
├─ 설명
│  └─ textarea 또는 간단 Lexical editor
├─ GitHub 링크
│  └─ input
├─ 체크리스트
│  ├─ [ ] 요구사항 UI 구현
│  ├─ [ ] 반응형 확인
│  └─ [ ] 타입체크 통과
└─ 제출 버튼
```

1차에서는 댓글을 textarea로 구현하는 편이 빠르다. 나중에 `shared/ui/lexical/lexical-editor.tsx`로 바꾸면 된다.

## 제출 데이터

권장 payload:

```json
{
  "assignmentId": "uuid",
  "comment": "구현 내용과 고민한 점입니다.",
  "githubUrl": "https://github.com/user/repo/pull/12",
  "checkedItems": ["requirement-ui", "responsive"]
}
```

## 점수 계산

기본:

- 출제 체크리스트 항목 수 * 10 = 만점
- 제출 체크 항목 수 * 10 = 점수

예외:

- 출제 체크리스트가 없으면 `score = 0`, `maxScore = 0`
- 제출 체크 항목이 출제 원본에 없으면 무시
- 어드민 평점은 자동 점수와 별도 필드로 저장

## 제출 수정 정책

1차 권장:

- 같은 사용자, 같은 assignment에는 제출 1개만 유지한다.
- 다시 제출하면 기존 제출을 update한다.

이유:

- UI가 단순하다.
- Study Diary의 현재 `createSubmission`도 기존 제출이 있으면 update하는 패턴이다.

2차 확장:

- 제출 히스토리 테이블을 따로 둔다.
- 리뷰 요청/수정 요청 흐름을 기록한다.

## 어드민 검토

검토 필드:

- `status`: `SUBMITTED`, `NEEDS_CHANGES`, `APPROVED`, `REJECTED`
- `adminRating`: 0~100 또는 1~5 중 하나
- `adminFeedback`
- `reviewedBy`

권장:

- 자동 점수는 체크리스트 기반 `score/maxScore`
- 어드민 평점은 `adminRating` 1~5

이유:

- 체크리스트 점수는 완료율이다.
- 어드민 평점은 품질 평가다.
- 둘을 섞으면 점수 의미가 애매해진다.

## 제출 목록

일반 사용자:

- 내 제출만 본다.

어드민:

- 해당 assignment의 모든 제출을 본다.
- 사용자명, 제출 시간, GitHub 링크, 점수, 상태로 스캔 가능해야 한다.

## 파일별 계획

### 백엔드

- `src/dev-challenge/dev-challenge.service.ts`
  - `getMySubmission`
  - `getSubmissionsByAssignment`
  - `createSubmission`
  - `updateSubmission`
  - `reviewSubmission`
  - `calculateSubmissionScore`

- `src/dev-challenge/dev-challenge.controller.ts`
  - 제출 조회/생성/수정/검토 API

- `src/dev-challenge/dto/dev-challenge.schema.ts`
  - `createSubmissionSchema`
  - `updateSubmissionSchema`
  - `reviewSubmissionSchema`

### 프론트

- `src/features/dev-challenge/submission/ui/submission-panel.tsx`
- `src/features/dev-challenge/submission/ui/submission-form.tsx`
- `src/features/dev-challenge/submission/ui/submission-card.tsx`
- `src/features/dev-challenge/submission/ui/submission-review-panel.tsx`
- `src/features/dev-challenge/submission/lib/extract-checklist-items.ts`
- `src/features/dev-challenge/submission/lib/calculate-score-preview.ts`

## 나중에 추가하면 좋은 것

- 배포 URL 필드
- Figma 제출 링크
- 파일 첨부
- PR 상태 자동 조회
- GitHub PR diff 요약
- 제출 히스토리
- 리뷰 댓글 스레드

