# 04. 출제 본문 모델

## 추천안

하나의 출제 주제에 여러 블록을 포함하는 방식으로 간다.

처음부터 모든 입력 UI를 완성할 필요는 없다. 하지만 데이터 모델은 아래 구조를 지원하게 만든다.

```txt
출제 주제
├─ 노트
├─ 다이어그램
├─ Figma
├─ GitHub 참고 링크
└─ 체크리스트
```

이 방식이 `노트 + 체크리스트` 단일 구조보다 낫다. 이유는 실제 개발 챌린지 출제는 설명, 요구사항, 참고 자료, 완료 조건이 분리되어야 읽기 쉽고 채점도 안정적이기 때문이다.

## 1차 구현 블록

### `NOTE`

용도:

- 문제 설명
- 요구사항
- 배경 지식
- 제약 조건

저장:

- Lexical JSON 문자열 또는 plain text
- 현재 프로젝트에 `shared/ui/lexical/lexical-editor.tsx`가 있으므로 Lexical 재사용 권장

### `CHECKLIST`

용도:

- 제출자가 완료해야 하는 조건
- 자동 점수 계산 기준

저장 형식:

```json
[
  { "id": "requirement-ui", "label": "요구사항 UI를 구현했다" },
  { "id": "responsive", "label": "모바일/데스크톱에서 깨지지 않는다" },
  { "id": "test", "label": "빌드 또는 타입체크를 통과했다" }
]
```

문자열 배열보다 객체 배열을 권장한다. 라벨이 바뀌어도 id 기준으로 제출 체크 상태를 유지할 수 있다.

## 2차 확장 블록

### `MMD`

Mermaid 다이어그램.

용도:

- 데이터 흐름
- 컴포넌트 관계
- API 시퀀스

### `FIGMA`

Figma 링크.

용도:

- 디자인 기준
- 와이어프레임
- 시안 링크

### `GITHUB`

GitHub 참고 링크.

용도:

- 시작 코드
- 참고 PR
- 요구 브랜치

### `FILE`

첨부 파일 또는 업로드 파일.

1차에서는 제외 가능하다. 기존 upload 모듈과 연결하려면 별도 범위로 뺀다.

### `DBTABLE`

DB 테이블 예시.

SQL 연습장과 연결할 때 유용하지만 Dev Challenge 1차 구현에서는 제외 가능하다.

## 에디터 UX

출제 모달:

```txt
제목
요약
난이도
상태

[+ 노트] [+ 체크리스트] [+ 다이어그램] [+ Figma]

블록 1: 노트
블록 2: 체크리스트
```

블록 기능:

- 추가
- 수정
- 삭제
- 드래그 정렬

## 보기 UX

본문 탭에서는 출제 내용을 읽는 데 집중한다.

권장 순서:

1. 제목/요약/난이도
2. 노트 블록
3. 참고 자료 블록
4. 체크리스트 블록
5. 제출 탭으로 이동 버튼

## 기존 코드 재사용 후보

- `towercrane-for-uiux-front/src/shared/ui/lexical/lexical-editor.tsx`
- `towercrane-for-uiux-front/src/features/challenge/user-notes/ui/block-editor.tsx`
- `towercrane-for-uiux-front/src/features/challenge/user-notes/ui/block-viewer.tsx`
- `towercrane-for-uiux-front/src/features/docu/ui/block-editor.tsx`
- `towercrane-for-uiux-front/src/features/docu/ui/blocks/*`

주의:

- 기존 challenge 쪽 블록 코드는 Study Diary와 이름이 섞여 있으므로 그대로 복붙하지 않는다.
- 공통화할 수 있으면 `shared/ui/content-blocks` 같은 위치로 분리한다.

