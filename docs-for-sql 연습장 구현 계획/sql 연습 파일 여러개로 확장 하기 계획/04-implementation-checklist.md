# 04. 구현 체크리스트

## Phase 1. 백엔드 seed 목록 기반

- [ ] `SqlPracticeSeedSource`, `SqlPracticeSeedSummary` 타입 추가
- [ ] `-- @key value` 메타 파서 추가
- [ ] builtin seed directory scan 구현
- [ ] uploaded seed directory scan 구현
- [ ] active seed state read/write 구현
- [ ] `GET /api/sql/seeds` 구현
- [ ] `getSeedFile()`을 active seed 기준으로 변경
- [ ] `GET /api/sql/meta`에 active seed 정보 추가

검증:

- [ ] `GET /api/sql/seeds`가 seed 목록 반환
- [ ] active seed fallback이 동작
- [ ] 기존 `/api/sql/tables`, `/api/sql/execute`가 깨지지 않음

## Phase 2. 10개 기본 SQL seed 파일

- [ ] `01_board_basic.sql`
- [ ] `02_shop_order.sql`
- [ ] `03_hr_attendance.sql`
- [ ] `04_project_task.sql`
- [ ] `05_reservation_schedule.sql`
- [ ] `06_support_ticket.sql`
- [ ] `07_sales_crm.sql`
- [ ] `08_analytics_event.sql`
- [ ] `09_finance_reconciliation.sql`
- [ ] `10_inventory_supply_chain.sql`

검증:

- [ ] 모든 seed 파일에 메타 주석 있음
- [ ] 모든 seed 파일이 SQLite에서 실행됨
- [ ] 각 seed에 테이블 5개 이상 있음
- [ ] 각 seed에 추천 쿼리 1개 이상 있음

## Phase 3. active seed 전환

- [ ] `activateSeedSchema` 추가
- [ ] `POST /api/sql/seeds/activate` 구현
- [ ] seed 선택 시 `active-seed.json` 저장
- [ ] seed 선택 시 runtime DB clean rebuild
- [ ] seed 선택 후 `meta/tables` 응답 변경 확인
- [ ] seed 변경 시 기존 history를 비우는 프론트 콜백 설계

검증:

- [ ] 게시판 seed 선택 시 게시판 테이블 표시
- [ ] 쇼핑몰 seed 선택 시 쇼핑몰 테이블 표시
- [ ] 잘못된 파일명 요청은 400/404

## Phase 4. 프론트 다이얼로그

- [ ] `SqlSeedManagerDialog` 생성
- [ ] `SqlSchemaSidebar`에 `Settings` 버튼 추가
- [ ] `fetchSqlPracticeSeeds()` 추가
- [ ] `useSqlPracticeSeeds()` 추가
- [ ] `useActivateSqlPracticeSeed()` 추가
- [ ] seed 목록 카드 UI 구현
- [ ] active seed 표시
- [ ] 적용 버튼 구현
- [ ] 적용 전 confirm dialog
- [ ] 적용 성공 후 history/table/meta 갱신

검증:

- [ ] 톱니바퀴 클릭 시 다이얼로그 open
- [ ] 10개 seed 목록 표시
- [ ] active seed 표시
- [ ] seed 전환 후 오른쪽 테이블 목록 변경

## Phase 5. 업로드 기능

- [ ] `POST /api/sql/seeds/upload` 구현
- [ ] admin guard 적용
- [ ] multipart file 처리
- [ ] `.sql` 확장자 검사
- [ ] 파일 크기 제한
- [ ] 파일명 sanitize
- [ ] 금지 SQL 키워드 검사
- [ ] 임시 DB 실행 검증
- [ ] `data/sql-practice/seeds/` 저장
- [ ] 프론트 업로드 UI 추가
- [ ] 업로드 성공 후 seed 목록 갱신

검증:

- [ ] 정상 SQL 업로드 성공
- [ ] 깨진 SQL 업로드 실패
- [ ] `.txt` 업로드 실패
- [ ] 일반 사용자 업로드 403

## Phase 6. 문서와 배포 확인

- [ ] README env 설명 보강
- [ ] `docs-for-배포/접속_및_환경변수_정보.md` 보강
- [ ] `docs-for-배포/백엔드_배포_방법.md` 보강
- [ ] 운영 서버에서 uploaded seed 보존 확인
- [ ] PM2 restart 후 active seed 유지 확인

## 로컬 검증 명령

```bash
cd /Users/terecal/towercrane-for-uiux/towercrane-for-uiux-server
pnpm build

cd /Users/terecal/towercrane-for-uiux/towercrane-for-uiux-front
pnpm typecheck
pnpm build
```

