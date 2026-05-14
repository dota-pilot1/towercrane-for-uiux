# SQL 연습 파일 여러 개로 확장하기 계획

## 목표

현재 SQL 연습장은 `seed.sql` 하나를 기준으로 별도 SQLite 연습 DB를 만든다. 다음 단계에서는 연습 SQL 파일을 10개 커리큘럼 세트로 확장하고, 오른쪽 `테이블 정보` 패널에서 톱니바퀴 다이얼로그로 연습 파일을 선택/업로드할 수 있게 만든다.

## 추천 방향

- 기본 연습 파일 10개를 repo에 포함한다.
- 운영에서 업로드한 `.sql` 파일은 `data/sql-practice/seeds/`에 저장한다.
- 현재 선택된 seed는 `data/sql-practice/active-seed.json`에 저장한다.
- seed를 선택하면 `practice.sqlite`를 선택된 파일 기준으로 clean rebuild한다.
- seed 선택/업로드는 admin 권한으로 제한한다.
- SQL 파일 설명은 파일 상단의 `-- @key value` 메타 주석으로 관리한다.

## 문서 구성

| 문서 | 역할 |
|---|---|
| `00-overview.md` | 전체 구조, UX, 정책 결정 |
| `01-backend-file-plan.md` | 백엔드 파일별 구현 계획 |
| `02-frontend-file-plan.md` | 프론트 파일별 구현 계획 |
| `03-seed-curriculum-plan.md` | 10개 SQL 연습 파일 커리큘럼 |
| `04-implementation-checklist.md` | 단계별 구현 체크리스트 |
| `05-test-and-deploy-plan.md` | 검증, 운영 배포, 운영 확인 계획 |

## 구현 순서 요약

1. 백엔드 seed 목록/메타 파서 추가
2. 10개 기본 SQL seed 파일 추가
3. active seed 선택 API 추가
4. 프론트 톱니바퀴 다이얼로그 추가
5. admin 업로드 API/UI 추가
6. 테스트와 배포 문서 보강

