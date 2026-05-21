# 미니 포스트맨 JSON 임포트/익스포트 구현 계획

## 결론

2차 테스트 스펙부터 JSON import/export로 구현한다.

Excel/CSV는 나중에 붙인다. 현재 Postman Lite의 요청 설정은 params, headers, body처럼 중첩 구조가 있어서 CSV 1장으로 표현하면 사람이 수정하기 어렵고 파싱도 취약하다. JSON은 GPT가 생성하기 쉽고, 현재 저장 구조와도 잘 맞는다.

## 목표

`/api-doc` Postman Lite 상단 헤더 우측에 다음 기능을 추가한다.

- `내보내기`: 현재 등록된 컬렉션, API 항목, 2차 테스트 스펙을 JSON 파일로 다운로드
- `가져오기`: GPT가 만든 JSON 파일을 업로드해 컬렉션/API 항목/테스트 스펙을 한 번에 생성

1차/2차 중에서는 2차를 먼저 지원한다.

- 1차: API 제목, method, path 정도의 기본 목록
- 2차: 실제 테스트 요청 스펙
  - url
  - authEnabled
  - params
  - headers
  - body.type
  - body.content
  - description

## 왜 2차부터 가능한가

현재 프론트 타입이 이미 2차 스펙을 구조화하고 있다.

관련 파일:

- `towercrane-for-uiux-front/src/entities/api-doc/model/types.ts`
  - `ApiBlockContent`
  - `KeyValueItem`
  - `createDefaultApiBlockContent`
  - `parseApiBlockContent`
- `towercrane-for-uiux-front/src/features/api-doc/ui/api-tester-panel.tsx`
  - 실제 요청 테스트 UI
  - params/headers/body 저장 구조 사용
- `towercrane-for-uiux-server/src/database/schema.ts`
  - `api_doc_categories`
  - `api_doc_endpoints`
  - `api_doc_blocks`

현재 DB 구조:

```text
api_doc_categories
  id
  name
  icon
  emoji
  orderIdx

api_doc_endpoints
  id
  categoryId
  title
  method
  path
  orderIdx

api_doc_blocks
  id
  endpointId
  blockType = API
  content = JSON.stringify(ApiBlockContent)
  orderIdx
```

따라서 JSON 한 파일로 아래 구조를 주고받으면 된다.

## JSON 포맷 초안

파일 버전은 반드시 둔다. 나중에 필드가 늘어도 마이그레이션하기 쉽게 하기 위함이다.

```json
{
  "version": 1,
  "source": "towercrane-postman-lite",
  "exportedAt": "2026-05-13T00:00:00.000Z",
  "collections": [
    {
      "name": "Auth",
      "icon": "Folder",
      "emoji": null,
      "endpoints": [
        {
          "title": "로그인",
          "method": "POST",
          "path": "/auth/login",
          "request": {
            "method": "POST",
            "url": "{{API_BASE}}/auth/login",
            "authEnabled": false,
            "headers": [
              {
                "key": "Content-Type",
                "value": "application/json",
                "enabled": true,
                "description": "JSON body"
              }
            ],
            "params": [],
            "body": {
              "type": "json",
              "content": "{\n  \"email\": \"seed@example.com\",\n  \"password\": \"password\"\n}"
            },
            "description": "이메일과 비밀번호로 로그인합니다."
          }
        }
      ]
    }
  ]
}
```

주의:

- `lastResponse`는 export/import 대상에서 제외한다.
- `request.method`는 `endpoint.method`와 같게 맞춘다.
- `path`는 앱 내 목록 표시용이다.
- `request.url`은 실제 Send에 쓰는 값이다.
- `{{API_BASE}}` 같은 env 변수는 그대로 보존한다.

## GPT에게 요청할 출력 포맷

나중에 백엔드 프로젝트를 GPT에게 분석시킬 때는 아래처럼 요청한다.

```text
아래 JSON 스키마에 맞춰 Postman Lite import 파일을 만들어줘.
version은 1, source는 towercrane-postman-lite로 고정.
각 API는 collection, title, method, path, request.url, authEnabled, headers, params, body를 포함해줘.
로그인/회원가입처럼 토큰이 없는 API는 authEnabled=false.
보호 API는 authEnabled=true.
body.content는 유효한 JSON 문자열로 넣어줘.
```

## 구현 방식 선택

### 권장: 백엔드 bulk export/import API 추가

프론트에서 카테고리별 endpoints와 endpoint별 blocks를 순차 호출해도 구현은 가능하다. 하지만 import는 생성 순서, 실패 복구, 중복 처리 때문에 백엔드에서 한 번에 처리하는 편이 낫다.

권장 API:

```text
GET  /api-doc/export
POST /api-doc/import
```

장점:

- SQLite DB 기준으로 한 번에 읽고 쓸 수 있다.
- orderIdx를 안정적으로 계산할 수 있다.
- import 실패 시 프론트 mutation 여러 개가 꼬이는 문제를 줄인다.
- 나중에 전체 공유/백업 용도로도 그대로 쓸 수 있다.

## import 정책

초기 구현은 `append`만 지원한다.

```ts
type ImportMode = 'append'
```

`replace`는 나중에 추가한다.

이유:

- 개인 용도라도 기존 컬렉션 삭제는 위험하다.
- JSON 파일 실수 업로드 시 복구가 어렵다.
- append면 먼저 넣어보고 필요 없는 컬렉션만 직접 지우면 된다.

중복 이름 처리:

- 같은 컬렉션 이름이 이미 있으면 새 컬렉션 이름 뒤에 suffix를 붙인다.
  - 예: `Auth`, `Auth (import 2026-05-13 14:20)`
- endpoint 제목 중복도 허용한다.

## 파일별 구현 계획

### 1. 타입/스키마 추가

파일:

- `towercrane-for-uiux-front/src/entities/api-doc/model/import-export-types.ts`
- `towercrane-for-uiux-server/src/api-doc/api-doc.import-export.schemas.ts`

프론트 타입:

```ts
export type ApiDocImportExportFile = {
  version: 1
  source: 'towercrane-postman-lite'
  exportedAt?: string
  collections: ApiDocImportCollection[]
}

export type ApiDocImportCollection = {
  name: string
  icon?: string | null
  emoji?: string | null
  endpoints: ApiDocImportEndpoint[]
}

export type ApiDocImportEndpoint = {
  title: string
  method: HttpMethod
  path: string
  request: Omit<ApiBlockContent, 'lastResponse'>
}
```

서버는 zod로 같은 스키마를 검증한다.

검증 규칙:

- `version === 1`
- `source === 'towercrane-postman-lite'`
- `collections[].name` 필수
- `endpoints[].title` 필수
- `method`는 `GET | POST | PUT | PATCH | DELETE`
- `request.headers`, `request.params`는 배열
- `request.body.type`은 `none | json | raw`
- `lastResponse`는 입력에 있어도 제거

### 2. 백엔드 export 구현

파일:

- `towercrane-for-uiux-server/src/api-doc/api-doc.controller.ts`
- `towercrane-for-uiux-server/src/api-doc/api-doc.service.ts`

추가:

```ts
@Get('export')
exportAll()
```

서비스 흐름:

1. categories 전체 조회
2. endpoints 전체 조회
3. blocks 전체 조회
4. category별 endpoint를 묶는다.
5. endpoint별 API block을 찾아 `ApiBlockContent`로 파싱한다.
6. `lastResponse` 제거
7. JSON 응답 반환

응답:

```ts
{
  version: 1,
  source: 'towercrane-postman-lite',
  exportedAt: new Date().toISOString(),
  collections: [...]
}
```

### 3. 백엔드 import 구현

파일:

- `towercrane-for-uiux-server/src/api-doc/api-doc.controller.ts`
- `towercrane-for-uiux-server/src/api-doc/api-doc.service.ts`
- `towercrane-for-uiux-server/src/api-doc/api-doc.import-export.schemas.ts`

추가:

```ts
@Post('import')
importAll(@CurrentUser() user, @Body() body)
```

서비스 흐름:

1. admin 권한 확인
2. zod schema로 JSON 검증
3. 현재 category 최대 orderIdx 조회
4. collection 단위로 category insert
5. endpoint insert
6. 각 endpoint에 API block insert
7. 결과 summary 반환

반환 예:

```ts
{
  success: true,
  importedCollections: 3,
  importedEndpoints: 42,
  skippedEndpoints: 0
}
```

주의:

- import는 append만 지원한다.
- 실패한 validation은 아무 것도 insert하지 않는 방향이 좋다.
- SQLite transaction을 사용할 수 있으면 transaction으로 감싼다.

### 4. 프론트 API 함수 추가

파일:

- `towercrane-for-uiux-front/src/entities/api-doc/api/api-doc-api.ts`

추가:

```ts
exportAll: () => apiRequest<ApiDocImportExportFile>('/api-doc/export')

importAll: (body: ApiDocImportExportFile) =>
  apiRequest<ApiDocImportResult>('/api-doc/import', {
    method: 'POST',
    body: JSON.stringify(body),
  })
```

### 5. React Query mutation 추가

파일:

- `towercrane-for-uiux-front/src/features/api-doc/model/use-api-doc-queries.ts`

추가:

```ts
useExportApiDoc()
useImportApiDoc()
```

import 성공 시:

```ts
queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.all })
```

toast:

- 성공: `N개 컬렉션, M개 API를 가져왔습니다.`
- 실패: validation 메시지 표시

### 6. JSON 파일 유틸 추가

파일:

- `towercrane-for-uiux-front/src/features/api-doc/lib/api-doc-json-file.ts`

역할:

- JSON 다운로드
- 파일 읽기
- 확장자/Content-Type 기본 확인
- parse error 메시지 정리

함수 초안:

```ts
export function downloadJsonFile(fileName: string, data: unknown) {}
export async function readJsonFile<T>(file: File): Promise<T> {}
```

파일명:

```text
towercrane-postman-lite-YYYYMMDD-HHmm.json
```

### 7. 헤더 액션 컴포넌트 추가

파일:

- `towercrane-for-uiux-front/src/features/api-doc/ui/api-doc-import-export-actions.tsx`

역할:

- `내보내기` 버튼
- `가져오기` 버튼
- 숨겨진 `<input type="file" accept="application/json,.json">`
- import 전 확인 confirm

UI:

- `Upload`
- `Download`
- `FileJson`

스타일:

- 기존 앱 규칙에 맞춰 `Button`, `ui-icon-button`, semantic token 사용
- raw Tailwind 팔레트 금지

### 8. `/api-doc` 페이지 헤더 연결

파일:

- `towercrane-for-uiux-front/src/pages/api-doc/ui/api-doc-page.tsx`

현재:

```tsx
<PageHeader icon={FileJson} title="Postman Lite" />
```

변경 방향:

1. `PageHeader`가 actions slot을 지원하면 actions로 연결
2. 지원하지 않으면 Postman Lite 페이지에서 별도 헤더 컴포넌트로 교체

예상:

```tsx
<PageHeader
  icon={FileJson}
  title="Postman Lite"
  actions={isAdmin ? <ApiDocImportExportActions /> : null}
/>
```

만약 `PageHeader`가 `actions`를 지원하지 않으면 `shared/ui/page-header.tsx`에 actions prop을 추가한다.

### 9. 선택 상태 갱신

파일:

- `towercrane-for-uiux-front/src/pages/api-doc/ui/api-doc-page.tsx`

import 성공 후:

- categories query invalidate
- 가능하면 새로 import된 첫 컬렉션을 선택
- 처음에는 단순히 invalidate만 하고 현재 선택이 유효하지 않으면 기존 effect가 첫 컬렉션을 잡도록 둔다.

현재 `api-doc-page.tsx`는 selected category/endpoint를 effect로 보정한다. 이 부분은 기존 React hook lint 문제가 있을 수 있으므로, 구현 시 SQL 페이지에서 했던 것처럼 파생값 방식으로 정리할지 검토한다.

## 구현 순서

### 1단계: JSON 포맷/스키마 고정

- import/export 타입 정의
- 서버 zod schema 작성
- 샘플 JSON 문서 추가

완료 기준:

- GPT에게 줄 수 있는 JSON 예시가 명확하다.

### 2단계: 백엔드 export

- `GET /api-doc/export`
- 현재 DB 내용을 JSON 포맷으로 반환

완료 기준:

- 브라우저/ curl로 export JSON 확인 가능
- `lastResponse`가 빠져 있음

### 3단계: 백엔드 import

- `POST /api-doc/import`
- append 방식 insert
- admin만 허용

완료 기준:

- 샘플 JSON 업로드 시 컬렉션/API/blocks 생성
- 잘못된 JSON은 400 응답

### 4단계: 프론트 import/export API 연결

- api 함수 추가
- query mutation 추가
- JSON 파일 유틸 추가

완료 기준:

- 코드 레벨에서 export 응답 다운로드 가능
- import 파일 parse 후 서버 전송 가능

### 5단계: 헤더 버튼 UI 추가

- Postman Lite 헤더 우측에 `가져오기`, `내보내기`
- admin만 가져오기 표시
- 내보내기는 읽기 권한 사용자도 가능하게 할지 결정 필요

권장:

- 내보내기: 로그인 사용자 가능
- 가져오기: admin만 가능

완료 기준:

- 버튼이 헤더 우상단에 표시된다.
- 업로드 성공 후 목록 갱신된다.

### 6단계: 검증

명령:

```bash
pnpm --dir towercrane-for-uiux-server build
pnpm --dir towercrane-for-uiux-front typecheck
pnpm --dir towercrane-for-uiux-front build
```

가능하면:

```bash
pnpm --dir towercrane-for-uiux-front exec eslint src/entities/api-doc src/features/api-doc src/pages/api-doc
```

수동 확인:

1. `/api-doc` 접속
2. 내보내기 클릭
3. JSON 파일 내용 확인
4. 기존 데이터와 다른 이름으로 import
5. 컬렉션/API 항목 증가 확인
6. API 항목 선택 후 params/headers/body가 들어왔는지 확인
7. Send 실행 가능 여부 확인

## 예외 처리

### 빈 파일

- `collections`가 없거나 빈 배열이면 import 거부
- 메시지: `가져올 컬렉션이 없습니다.`

### 잘못된 method

- import 거부
- 메시지에 컬렉션/엔드포인트 위치를 표시하면 좋다.

### body JSON이 깨진 경우

- `body.type = json`이어도 `body.content` 자체는 문자열로 저장한다.
- 단, 가능하면 import 전에 `JSON.parse(body.content)` 검증을 한다.
- 깨져 있으면 경고 또는 거부.

권장:

- 1차 구현은 거부
- 메시지: `Auth > 로그인 body.content가 유효한 JSON이 아닙니다.`

### 너무 큰 파일

- 초기 제한: 2MB
- 초과 시 프론트에서 거부

## 나중에 확장

### CSV 다운로드

읽기용으로는 유용하다.

하지만 import는 JSON을 유지한다.

CSV 컬럼 예:

```text
collection,title,method,path,url,authEnabled,paramsJson,headersJson,bodyType,bodyContent,description
```

### Excel import/export

나중에 필요하면 아래 시트 구조로 간다.

- `Collections`
- `Endpoints`
- `Params`
- `Headers`
- `Bodies`

Excel은 사람이 수정하기 좋지만 구현량이 늘어난다. 개인용 2차 스펙 자동 생성에는 JSON이 더 적합하다.

### replace mode

나중에 import modal에서 선택:

- `append`
- `replace all`
- `replace same collection name`

초기에는 append만 지원한다.

## 완료 기준

- `/api-doc` 헤더 우상단에 JSON 가져오기/내보내기 버튼이 있다.
- 내보내기 파일을 다시 가져오면 동일한 요청 스펙이 append된다.
- params/headers/body/authEnabled/url/description이 보존된다.
- import 실패 시 기존 데이터가 부분적으로 꼬이지 않는다.
- 새 코드에 raw Tailwind 팔레트 금지 패턴이 없다.
