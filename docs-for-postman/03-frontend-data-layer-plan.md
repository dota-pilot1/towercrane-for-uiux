# 03. 프론트 데이터 계층 계획

## 새 파일

```text
towercrane-for-uiux-front/src/entities/api-doc/model/types.ts
towercrane-for-uiux-front/src/entities/api-doc/api/api-doc-api.ts
towercrane-for-uiux-front/src/features/api-doc/model/use-api-doc-queries.ts
towercrane-for-uiux-front/src/features/api-doc/model/api-env-store.ts
```

## 타입

```ts
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type BodyType = 'none' | 'json' | 'raw'

export type ApiDocCategory = {
  id: string
  name: string
  icon?: string | null
  emoji?: string | null
  orderIdx: number
  createdBy?: string | null
  createdAt: string
  updatedAt: string
}

export type ApiDocEndpoint = {
  id: string
  categoryId: string
  title: string
  method: HttpMethod
  path: string
  orderIdx: number
  createdBy?: string | null
  createdAt: string
  updatedAt: string
}
```

요청 설정 JSON:

```ts
export type ApiBlockContent = {
  method: HttpMethod
  url: string
  authEnabled: boolean
  headers: KeyValueItem[]
  params: KeyValueItem[]
  body: {
    type: BodyType
    content: string
  }
  description?: string
  lastResponse?: ApiResponse | null
}
```

## API wrapper

기존 `apiRequest`를 사용한다.

```ts
apiRequest<ApiDocCategory[]>('/api-doc/categories')
apiRequest<ApiDocEndpoint[]>(`/api-doc/categories/${categoryId}/endpoints`)
apiRequest<ApiDocBlock[]>(`/api-doc/endpoints/${endpointId}/blocks`)
```

## Query hook

- `useApiDocCategories()`
- `useApiDocEndpoints(categoryId)`
- `useApiDocBlocks(endpointId)`
- `useCreateApiDocCategory()`
- `useUpdateApiDocCategory()`
- `useDeleteApiDocCategory()`
- `useReorderApiDocCategories()`
- `useCreateApiDocEndpoint()`
- `useUpdateApiDocEndpoint()`
- `useDeleteApiDocEndpoint()`
- `useReorderApiDocEndpoints()`
- `useReplaceApiDocBlocks(endpointId)`

## 환경 변수 store

Zustand persist로 localStorage에 저장한다.

기본 환경:

- `local`: `BASE_URL`, `API_BASE`, `TOKEN`
- `dev`: `BASE_URL`, `API_BASE`, `TOKEN`
- `prod`: `BASE_URL`, `API_BASE`, `TOKEN`

`API_BASE`의 기본값은 `VITE_API_BASE_URL`을 사용한다. `BASE_URL`은 `/api`를 뺀 origin으로 둔다.

## 토큰 처리

테스터 패널의 `authEnabled`가 켜져 있고 Authorization 헤더가 없으면 현재 로그인 세션 토큰을 `Authorization: Bearer ...`로 넣는다. 외부 API를 테스트할 때는 사용자가 `authEnabled`를 끌 수 있어야 한다.

