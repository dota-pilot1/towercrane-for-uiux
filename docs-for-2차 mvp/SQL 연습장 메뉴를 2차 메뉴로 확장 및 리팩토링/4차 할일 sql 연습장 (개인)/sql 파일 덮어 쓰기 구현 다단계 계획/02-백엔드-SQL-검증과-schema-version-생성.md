# 02. 백엔드 SQL 검증과 Schema Version 생성

## 목표

업로드된 `.sql` 파일을 안전하게 검증하고, 성공 시 새 `sql_personal_practice_schema_versions` row를 만든 뒤 workspace active version을 교체한다.

## 대상 파일

```text
towercrane-for-uiux-server/src/sql-practice/sql-practice.service.ts
towercrane-for-uiux-server/src/database/schema.ts
towercrane-for-uiux-server/src/database/database.service.ts
```

## service public method

```ts
replacePersonalPracticeSchemaVersion(
  workspaceId: string,
  file: Express.Multer.File,
  input: ReplacePersonalSchemaVersionInput,
  userId: string,
): SqlPersonalPracticeSchemaReplaceResponse
```

## 처리 순서

1. `assertPersonalWorkspaceOwner(workspaceId, userId)`
2. 현재 active schema version 조회
3. 파일 존재 확인
4. 확장자 `.sql` 확인
5. 파일 크기 제한 확인
6. SQL 문자열 추출
7. 위험 SQL 검사
8. 임시 runtime DB에 SQL 적용
9. table introspection 수행
10. table count가 1 이상인지 확인
11. `dbFileHash = hashSql(schemaSql)` 계산
12. 다음 version 번호 계산
13. 새 schema version insert
14. workspace `activeSchemaVersionId` update
15. 새 schema version과 tables 반환

## helper 계획

```ts
private validateUploadedPersonalSqlFile(file: Express.Multer.File): string
private validatePersonalSchemaSql(schemaSql: string): void
private getNextPersonalSchemaVersion(workspaceId: string): number
private createPersonalSchemaVersionFromSql(...)
private introspectPersonalSchemaVersion(...)
```

## SQL safety 최소 정책

MVP에서 먼저 막을 것:

- `ATTACH`
- `DETACH`
- `PRAGMA writable_schema`
- `load_extension`
- `.read`, `.shell` 같은 sqlite CLI 명령
- 빈 SQL
- 테이블이 하나도 생성되지 않는 SQL

허용:

- `CREATE TABLE`
- `INSERT`
- `CREATE INDEX`
- 기본 seed용 `DROP TABLE IF EXISTS`는 허용 여부를 결정해야 한다.

권장:

- 업로드 파일은 새 runtime DB에 적용되므로 `DROP TABLE`은 기술적으로 안전하다.
- 그래도 사용자 혼동을 줄이려면 `DROP TABLE`은 허용하되 새 DB에서만 실행된다는 설명을 다이어로그에 표시한다.

## metadata DB 처리

현재 `sql_personal_practice_schema_versions`에는 필요한 컬럼이 이미 있다.

사용할 컬럼:

- `schemaSql`
- `erdMmd`
- `dbFileHash`
- `sourceType = uploaded_sql`
- `sourceFileName`
- `replacedFromSchemaVersionId`
- `createdBy`

MVP에서는 새 컬럼 추가 없이 구현한다.

## transaction

schema version insert와 workspace active version update는 하나의 transaction으로 묶는다.

실패 시:

- 새 schema version row 없음
- workspace active version 변경 없음

## 기존 문제/공유 링크 보존

파일 교체 시 아래 테이블은 수정하지 않는다.

- `sql_personal_practice_problems`
- `sql_personal_practice_shares`

이 두 테이블은 각 row의 `schema_version_id`로 계속 기존 DB를 참조한다.
