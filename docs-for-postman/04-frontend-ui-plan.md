# 04. 프론트 UI 계획

## 새 파일

```text
towercrane-for-uiux-front/src/pages/api-doc/ui/api-doc-page.tsx
towercrane-for-uiux-front/src/features/api-doc/ui/api-tester-panel.tsx
```

## 수정 파일

```text
towercrane-for-uiux-front/src/app/App.tsx
```

## 화면 구조

```text
┌─────────────────────────────────────────────────────────────┐
│ Header                                                      │
├──────────────┬─────────────────┬────────────────────────────┤
│ 카테고리 목록 │ API 항목 목록      │ 요청 편집/테스트 패널        │
│ + 추가/수정   │ 제목 추가/수정     │ 환경 선택, 저장, 초기화      │
│ drag reorder │ drag reorder    │ method url send             │
│              │                 │ params headers body response │
└──────────────┴─────────────────┴────────────────────────────┘
```

## 주요 상태

- `selectedCategoryId`
- `selectedEndpointId`
- `editingCategoryId`
- `editingEndpointId`
- `isAddingCategory`
- `isAddingEndpoint`
- `envModalOpen`
- `activeTab`: `params | headers | body`
- `activeResponseTab`: `body | headers`

## 관리자/일반 사용자 UX

- 일반 사용자: 카테고리/엔드포인트/요청 내용을 볼 수 있고 Send 실행 가능
- 관리자: 추가/수정/삭제/정렬/저장 가능

2차 컬럼의 `API 항목`은 목록 제목만 관리한다. 실제 HTTP method와 URL endpoint는 오른쪽 본문 테스터의 요청 입력 영역에서 관리한다.

## 스타일 규칙

이 기능은 `AGENTS.md` 규칙을 반드시 따른다.

- `text-white`, `text-slate-*`, `text-emerald-*`, `bg-white/*`, `bg-slate-*`, `border-slate-*` 사용 금지
- `text-text-primary`, `text-text-secondary`, `text-brand-primary`, `bg-surface-muted`, `border-surface-border-soft` 사용
- 버튼은 기존 `Button`, `CompactSelect`, `ui-icon-button*` 또는 semantic class 사용
- 반복되는 상태 배지는 raw 색상 대신 CSS 변수 기반 inline style이나 semantic token으로 처리

## 원본에서 바꿔야 하는 점

팔란티어 원본의 `ApiTesterPanel`은 raw 색상과 shadcn token이 섞여 있다. towercrane에서는 그대로 복사하지 않고 다음을 바꾼다.

- method 색상은 semantic token 계열로 단순화
- Response status도 `text-brand-primary`, `text-danger`, `text-text-secondary` 중심으로 표시
- API 호출은 fetch 직접 조합 대신 저장 API는 `apiRequest`, 테스트 전송은 브라우저 `fetch`
- 인증 토큰은 별도 token store 대신 현재 `useSessionStore` token을 사용할 수 있게 처리
