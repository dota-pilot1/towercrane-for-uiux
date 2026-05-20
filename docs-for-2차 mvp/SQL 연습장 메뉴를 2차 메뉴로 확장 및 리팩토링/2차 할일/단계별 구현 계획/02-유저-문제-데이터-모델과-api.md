# 2단계 - 유저 문제 데이터 모델과 API

## 목표

유저가 커머스 기본 DB를 기준으로 문제를 만들고 관리할 수 있게 한다.

## 데이터 모델

```text
sql_user_practice_schemas
- id
- title
- description
- schema_sql
- erd_mmd
- version
- created_by
- is_active
- created_at
- updated_at

sql_user_practice_problems
- id
- schema_id
- title
- description
- level
- target_tables
- starter_sql
- answer_sql
- explanation
- created_by
- visibility
- status
- created_at
- updated_at
```

## API 초안

```text
GET    /sql/user/schemas/active
GET    /sql/user/problems
POST   /sql/user/problems
GET    /sql/user/problems/:id
PATCH  /sql/user/problems/:id
DELETE /sql/user/problems/:id
```

## 문제 필드 기준

- `title`: 문제 목록에 보이는 짧은 제목
- `description`: 사용자가 풀 문제 설명
- `level`: 1~5
- `targetTables`: 관련 테이블 목록
- `starterSql`: 풀이 입력창에 미리 채울 SQL
- `answerSql`: 기본 정답 SQL
- `explanation`: 정답 해설
- `visibility`: 공개 여부
- `status`: draft, published, archived

## 완료 기준

- 문제 생성, 수정, 삭제가 된다.
- 공개 문제와 내가 만든 문제를 구분해서 조회할 수 있다.
- 문제는 활성 schema version에 연결된다.
