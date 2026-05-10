# 02. 백엔드 API/서비스 계획

## 새 파일

```text
towercrane-for-uiux-server/src/api-doc/api-doc.module.ts
towercrane-for-uiux-server/src/api-doc/api-doc.controller.ts
towercrane-for-uiux-server/src/api-doc/api-doc.service.ts
towercrane-for-uiux-server/src/api-doc/api-doc.schemas.ts
```

## 수정 파일

```text
towercrane-for-uiux-server/src/app.module.ts
```

## 권한 정책

| API | 권한 |
|---|---|
| 목록/블록 조회 | 로그인 사용자 |
| 카테고리 생성/수정/삭제/정렬 | admin |
| 엔드포인트 생성/수정/삭제/정렬 | admin |
| 블록 저장 | admin |
| 실제 API 요청 전송 | 프론트 브라우저에서 수행, 백엔드 API 없음 |

## API 목록

```text
GET    /api-doc/categories
POST   /api-doc/categories
PATCH  /api-doc/categories/:categoryId
DELETE /api-doc/categories/:categoryId
PATCH  /api-doc/categories/reorder

GET    /api-doc/categories/:categoryId/endpoints
POST   /api-doc/endpoints
PATCH  /api-doc/endpoints/:endpointId
DELETE /api-doc/endpoints/:endpointId
PATCH  /api-doc/endpoints/reorder

GET    /api-doc/endpoints/:endpointId/blocks
PUT    /api-doc/endpoints/:endpointId/blocks
```

컨트롤러에는 `@Controller('api-doc')`만 사용한다. 글로벌 prefix가 이미 `/api`를 붙인다.

## Zod schema

- `createCategorySchema`: `name`, `icon`, `emoji`
- `updateCategorySchema`: `name`, `icon`, `emoji`
- `createEndpointSchema`: `categoryId`, `title`, `method`, `path`
- `updateEndpointSchema`: `title`, `method`, `path`, `categoryId?`
- `reorderSchema`: `{ items: [{ id, orderIdx }] }`
- `replaceBlocksSchema`: `{ blocks: [{ blockType: 'API', content }] }`

## 서비스 구현 메모

- `ensureAdmin(user)`로 관리자 편집 권한을 통일한다.
- `ensureCategory(id)`, `ensureEndpoint(id)`로 NotFound를 명확히 처리한다.
- 생성 시 같은 parent의 최대 `orderIdx + 1`로 순서를 잡는다.
- 삭제는 FK cascade에 맡긴다.
- 블록 저장은 기존 endpoint 블록 전체 삭제 후 새 rows 삽입으로 단순화한다.

