# 개발 챌린지 구현 계획

## 목표

현재 `/challenge` 경로에 남아 있는 기능은 실제로 `Study Diary`로 쓰이고 있다. 이를 명확하게 정리한다.

- `Study Diary`: `/study-diary`로 URL과 메뉴 키를 정리한다.
- `Dev Challenge`: `/dev-challenge`로 별도 구현한다.
- `Dev Challenge`는 `Study Diary`와 같은 1차 주제, 2차 주제 관리 경험을 유지한다.
- 본문 영역만 `챌린지 출제`와 `제출` 중심으로 바꾼다.

## 결론

URL 변경은 가능하다. 현재 프론트 라우터, 헤더 매핑, 메뉴 시드, 메뉴 DB의 `sectionId` 매핑만 정리하면 된다. 다만 기존 `/challenge`를 바로 없애면 북마크나 메뉴 DB가 깨질 수 있으므로 1차 구현에서는 `/challenge`를 `/study-diary`로 리다이렉트하는 호환 라우트를 둔다.

`Dev Challenge`는 기존 `challenge_*` 테이블을 그대로 재사용하기보다 `dev_challenge_*`로 분리하는 편이 좋다. `Study Diary`와 챌린지는 성격이 다르고, 제출/채점/검토가 붙는 순간 데이터 정책이 달라진다. 프론트 컴포넌트는 1차/2차 패널 같은 공통 UI만 재사용한다.

## 권장 출제/제출 형식

출제는 하나의 주제 안에 여러 블록을 넣는 방식이 가장 낫다.

- 출제 본문: 노트 블록
- 보조 자료: 다이어그램, Figma, GitHub, 파일, DB 테이블 블록
- 완료 조건: 체크리스트 블록

즉, "노트 + 체크리스트"만으로 시작하되 데이터 모델은 여러 블록을 담을 수 있게 만든다. 나중에 다이어그램, Figma가 추가되어도 스키마를 갈아엎지 않는다.

제출은 아래 3개를 1차 필수로 둔다.

- 댓글형 설명
- 제출 체크리스트
- GitHub 링크

Figma 링크, 배포 URL, 첨부 파일은 2차 확장 필드로 둔다.

## 문서 구성

- `00-current-state-and-decision.md`: 현재 코드 상태와 결정 사항
- `01-url-menu-study-diary-plan.md`: `/challenge`에서 `/study-diary`로 URL 정리 계획
- `02-dev-challenge-backend-plan.md`: DB, NestJS 모듈, API 파일별 계획
- `03-dev-challenge-frontend-plan.md`: 라우터, 메뉴, 페이지, 공통 UI 파일별 계획
- `04-assignment-content-model.md`: 출제 블록 모델과 에디터 계획
- `05-submission-review-plan.md`: 제출, 체크리스트, GitHub 링크, 검토 계획
- `06-step-by-step-checklist.md`: 구현 순서 체크리스트

