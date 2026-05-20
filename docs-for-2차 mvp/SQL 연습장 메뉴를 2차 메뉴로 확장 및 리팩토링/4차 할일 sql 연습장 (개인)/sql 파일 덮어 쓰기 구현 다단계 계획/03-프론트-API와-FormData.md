# 03. 프론트 API와 FormData 처리

## 목표

프론트에서 `.sql` 파일을 multipart/form-data로 업로드할 수 있게 API 계층을 보강한다.

## 대상 파일

```text
towercrane-for-uiux-front/src/shared/api/http.ts
towercrane-for-uiux-front/src/entities/sql-practice/model/types.ts
towercrane-for-uiux-front/src/entities/sql-practice/api/sql-practice-api.ts
towercrane-for-uiux-front/src/features/sql-practice/model/use-sql-practice-queries.ts
```

## `http.ts`

현재 `apiRequest`는 모든 요청에 `Content-Type: application/json`을 넣는다.

FormData 업로드에서는 이 헤더를 직접 넣으면 boundary가 깨질 수 있다.

수정:

```ts
const isFormData = init?.body instanceof FormData

headers: {
  ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
  ...(auth headers),
  ...init?.headers,
}
```

## 타입 추가

`types.ts`:

```ts
export type SqlPersonalPracticeSchemaReplaceResponse = {
  workspace: SqlPersonalPracticeWorkspace
  schemaVersion: SqlPersonalPracticeSchemaVersion
  tableCount: number
  tables: TableInfo[]
}
```

## API 추가

`sql-practice-api.ts`:

```ts
replacePersonalSchemaVersion: (
  workspaceId: string,
  payload: {
    file: File
    title?: string
    description?: string
  },
) => {
  const formData = new FormData()
  formData.append('file', payload.file)
  if (payload.title) formData.append('title', payload.title)
  if (payload.description) formData.append('description', payload.description)

  return apiRequest<SqlPersonalPracticeSchemaReplaceResponse>(
    `/sql/personal/workspaces/${encodeURIComponent(workspaceId)}/schema-versions/replace`,
    {
      method: 'POST',
      body: formData,
    },
  )
}
```

## mutation 추가

`use-sql-practice-queries.ts`:

```ts
useReplaceSqlPersonalPracticeSchemaVersion(workspaceId?: string)
```

성공 시 invalidate:

- `personalDefaultWorkspace`
- `personalMeta(workspaceId)`
- `personalTables(workspaceId)`
- `personalErd(workspaceId)`
- `personalProblems(workspaceId, ...)`

권장:

```ts
queryClient.invalidateQueries({
  queryKey: ['sql-practice'],
})
```

범위가 넓지만 MVP에서는 안전하다. 이후 정확한 key 단위로 좁힌다.

## 에러 표시

mutation error는 다이어로그 내부에서 보여준다.

예:

- `.sql 파일만 업로드할 수 있습니다.`
- `SQL 적용 중 오류가 발생했습니다.`
- `생성된 테이블이 없습니다.`
