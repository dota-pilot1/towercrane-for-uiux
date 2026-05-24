# 02. DB/API 확장 계획

## 1단계: 팀 워크스페이스 추가

### 새 테이블

```sql
CREATE TABLE IF NOT EXISTS api_doc_teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  emoji TEXT,
  order_idx INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

### 기존 테이블 변경

`api_doc_categories`에 `team_id`를 추가한다.

```sql
ALTER TABLE api_doc_categories ADD COLUMN team_id TEXT;
CREATE INDEX IF NOT EXISTS idx_api_doc_categories_team_order
  ON api_doc_categories(team_id, order_idx);
```

SQLite에서는 기존 컬럼에 foreign key를 나중에 붙이기 어렵기 때문에 런타임 DDL에서는 nullable 컬럼과 index를 먼저 추가한다. 새 설치용 `CREATE TABLE`에는 foreign key를 포함한다.

### 기존 데이터 보정

1. `Default Team` 또는 `Prototype Console` 팀을 생성한다.
2. `team_id IS NULL`인 category를 기본 팀으로 연결한다.
3. 기존 API 응답은 팀 파라미터가 없어도 기본 팀 기준으로 동작하게 한다.

## 1단계 API

```text
GET    /api/api-doc/teams
POST   /api/api-doc/teams
PATCH  /api/api-doc/teams/:teamId
DELETE /api/api-doc/teams/:teamId
POST   /api/api-doc/teams/reorder

GET    /api/api-doc/teams/:teamId/categories
```

기존 API는 호환을 위해 유지한다.

```text
GET /api/api-doc/categories
```

이 API는 기본 팀 또는 전체 category를 반환하도록 기존 동작을 유지한다. 프론트 신규 화면은 `teams/:teamId/categories`를 사용한다.

## 2단계: 폴더/시나리오 추가

### 새 테이블

```sql
CREATE TABLE IF NOT EXISTS api_doc_folders (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  parent_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  order_idx INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(category_id) REFERENCES api_doc_categories(id) ON DELETE CASCADE,
  FOREIGN KEY(parent_id) REFERENCES api_doc_folders(id) ON DELETE CASCADE,
  FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

### 기존 테이블 변경

```sql
ALTER TABLE api_doc_endpoints ADD COLUMN folder_id TEXT;
CREATE INDEX IF NOT EXISTS idx_api_doc_endpoints_folder_order
  ON api_doc_endpoints(folder_id, order_idx);
```

### API

```text
GET    /api/api-doc/categories/:categoryId/folders
POST   /api/api-doc/folders
PATCH  /api/api-doc/folders/:folderId
DELETE /api/api-doc/folders/:folderId
POST   /api/api-doc/folders/reorder

GET    /api/api-doc/folders/:folderId/endpoints
```

폴더 없는 요청은 기존 API로 계속 조회한다.

```text
GET /api/api-doc/categories/:categoryId/endpoints
```

## 3단계: 팀 멤버와 권한

### 새 테이블

```sql
CREATE TABLE IF NOT EXISTS api_doc_team_members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(team_id) REFERENCES api_doc_teams(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(team_id, user_id)
);
```

권장 role:

```text
owner  : 팀 삭제, 멤버 관리 가능
editor : collection/request 편집 가능
viewer : 조회와 Send 가능
```

초기에는 전역 `admin`이면 모든 팀 owner로 간주한다.

## 4단계: 팀별 환경 변수

### 새 테이블

```sql
CREATE TABLE IF NOT EXISTS api_doc_environments (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  name TEXT NOT NULL,
  variables TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(team_id) REFERENCES api_doc_teams(id) ON DELETE CASCADE,
  FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

`variables`는 JSON 문자열로 저장한다.

```json
[
  { "key": "API_BASE", "value": "http://localhost:3000/api", "description": "local API" },
  { "key": "TOKEN", "value": "", "description": "manual token" }
]
```

민감 값 저장은 후순위다. 초기에는 localStorage 환경 변수를 유지하고, 팀별 환경은 공유 가능한 non-secret 값 중심으로 둔다.

## import/export 확장

기존 JSON:

```json
{
  "version": 1,
  "source": "towercrane-postman-lite",
  "collections": []
}
```

확장 JSON:

```json
{
  "version": 2,
  "source": "towercrane-postman-lite",
  "teams": [
    {
      "name": "AI 서비스 포털 팀",
      "collections": []
    }
  ]
}
```

서버 import는 version 1과 version 2를 모두 받아야 한다. version 1은 선택된 팀 또는 기본 팀에 append한다.
