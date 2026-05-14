# 05. 테스트와 배포 계획

## 로컬 테스트

백엔드:

```bash
cd /Users/terecal/towercrane-for-uiux/towercrane-for-uiux-server
pnpm build
pnpm start:dev
```

프론트:

```bash
cd /Users/terecal/towercrane-for-uiux/towercrane-for-uiux-front
pnpm typecheck
pnpm build
pnpm dev
```

## API 테스트

인증 후 확인:

```text
GET  /api/sql/seeds
GET  /api/sql/meta
GET  /api/sql/tables
POST /api/sql/seeds/activate
POST /api/sql/execute
POST /api/sql/seeds/upload
```

필수 확인:

- seed 목록이 10개 이상 내려오는지
- active seed가 표시되는지
- seed 변경 후 table 목록이 바뀌는지
- SQL 실행이 새 seed 기준 DB에 실행되는지
- 업로드된 seed가 목록에 추가되는지
- 깨진 seed 업로드가 실패하는지

## UI 테스트

체크 항목:

- `/sql` 접속
- 오른쪽 `테이블 정보` 헤더에 톱니바퀴 표시
- 톱니바퀴 클릭 시 다이얼로그 표시
- seed 목록/난이도/topics/tables 표시
- active seed 표시
- seed 전환 confirm 표시
- seed 전환 후 히스토리 초기화
- 오른쪽 테이블 목록 변경
- 업로드 UI 표시
- 업로드 성공/실패 메시지 표시

## 운영 배포 체크

배포 전:

```bash
git status --short
pnpm --dir towercrane-for-uiux-front typecheck
pnpm --dir towercrane-for-uiux-front build
pnpm --dir towercrane-for-uiux-server build
```

배포:

```bash
git push origin main
WAIT_FOR_INVALIDATION=true ./scripts/deploy-all.sh
```

운영 확인:

```bash
curl -fsSI https://hibot-docu.com/sql | sed -n '1,20p'
curl -fsS https://api.hibot-docu.com/api/menus | head -c 1000
```

운영 서버 파일 확인:

```bash
ssh -i docs-for-배포/hibot-d-server-key.pem ubuntu@54.180.215.129
cd ~/towercrane/towercrane-for-uiux-server
ls -la data/sql-practice
ls -la data/sql-practice/seeds
cat data/sql-practice/active-seed.json
```

## 운영 보존 대상

아래 파일은 배포 후에도 보존되어야 한다.

```text
data/sql-practice/seeds/*.sql
data/sql-practice/active-seed.json
data/sql-practice/runtime/practice.sqlite
```

현재 배포 스크립트는 `data/`를 삭제하지 않으므로 기본적으로 보존된다.

## 롤백 기준

문제가 생기면 백엔드 배포 스크립트의 자동 롤백이 먼저 동작한다.

수동 롤백 시 확인할 것:

- `active-seed.json`이 새 코드에서만 이해 가능한 형식인지
- 업로드 seed 파일은 그대로 둬도 되는지
- `practice.sqlite`는 삭제해도 되는 runtime 파일인지

연습 DB는 재생성 가능한 파일이므로, 필요하면 `data/sql-practice/runtime/`만 삭제하고 다시 seed를 적용해도 된다.

