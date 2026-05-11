# SQL 연습장 구현 계획

`/Users/terecal/mapo-palantier-project`의 `/sql` 기능을 `towercrane-for-uiux`에 맞게 구현하기 위한 계획 문서다.

## 문서 목록

- `00-overview.md`: 구현 가능성, 참조 파일, 범위, 설계 결정
- `01-backend-plan.md`: NestJS + `better-sqlite3` 백엔드 구현 계획
- `02-frontend-plan.md`: React/TanStack Router/Query 기반 프론트 구현 계획
- `03-set-label-improvement.md`: 우측 사이드바 숫자 세트 식별성 개선안
- `04-step-by-step-checklist.md`: 단계별 파일별 체크리스트
- `05-single-seed-file-decision.md`: SQL 파일 하나로 단순화하는 권장안

## 핵심 방향

- `/sql` 페이지 추가
- `/api/sql/*` API 추가
- 앱 DB와 분리된 SQL 연습 전용 SQLite DB 사용
- 1차는 SQL seed 파일 하나와 runtime SQLite DB 하나로 단순화
- 여러 SQL 파일/세트 선택은 후순위 확장
- raw Tailwind 팔레트 금지, semantic token과 `ui-*` 유틸 사용
