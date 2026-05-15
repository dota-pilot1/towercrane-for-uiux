# 03. 프론트엔드 기반 작업 (메뉴 교체 + 라우터 + FSD 폴더)

> 이 단계의 산출물: **로그인 후 헤더의 "Challenge with GPT" 메뉴를 클릭하면 `/challenge` 빈 페이지에 진입**할 수 있다.
> 데이터/API 는 다음 문서에서, 여기서는 **뼈대만** 만든다.

---

## 1. 변경되는 파일 한눈에

| 파일 | 변경 내용 |
|---|---|
| `towercrane-for-uiux-server/src/database/database.service.ts` | 메뉴 시드 `Chatbot` → `Challenge with GPT` (sectionId `chatbot` → `challenge`, icon `Bot` → `Trophy`) |
| `towercrane-for-uiux-front/src/widgets/app-header/ui/app-header.tsx` | `sectionIdToPath`, `getSectionIdFromPath` 매핑 교체 |
| `towercrane-for-uiux-front/src/app/router.tsx` | `chatbotRoute` 제거, `challengeRoute` 추가 |
| `towercrane-for-uiux-front/src/pages/chatbot/` | **삭제 또는 rename → `pages/challenge/`** |
| `towercrane-for-uiux-front/src/pages/challenge/` | 새 폴더, `challenge-page.tsx` placeholder |
| `towercrane-for-uiux-front/src/entities/challenge/` | 신규 — 타입/API 훅 (다음 문서에서 채움) |
| `towercrane-for-uiux-front/src/features/challenge/` | 신규 — 카테고리/섹션 사이드바, 블록 에디터 등 (다음 문서) |

---

## 2. FSD 신규 폴더 구조 (목표)

```
towercrane-for-uiux-front/src/
├── pages/challenge/
│   ├── ui/
│   │   ├── challenge-page.tsx          ← 라우트 진입점, 3패널 구성
│   │   └── empty-state.tsx
│   └── lib/
│       └── use-challenge-selection.ts  ← 카테고리/섹션 선택 상태 (zustand or local)
├── entities/challenge/
│   ├── api/
│   │   ├── challenge-api.ts            ← React Query 훅 (categories/sections/topics/submissions)
│   │   ├── challenge-gpt-api.ts        ← GPT 스레드/메시지
│   │   └── challenge-notes-api.ts      ← 유저 노트
│   └── model/
│       └── types.ts                    ← ChallengeCategory/Section/Topic/Submission/Note/Thread/Message
└── features/challenge/
    ├── category-sidebar/
    │   └── ui/category-sidebar.tsx
    ├── section-sidebar/
    │   └── ui/section-sidebar.tsx
    ├── topic-editor/
    │   └── ui/topic-editor.tsx
    ├── submission-form/
    │   └── ui/submission-form.tsx
    ├── gpt-chat/
    │   └── ui/gpt-chat-panel.tsx
    └── user-notes/
        └── ui/user-notes-panel.tsx
```

> 이 단계(M1)에서 만드는 건 **`pages/challenge/ui/challenge-page.tsx`** 1개 + 라우트/메뉴 교체뿐이다. 나머지는 후속 문서에서 채운다.

---

## 3. 메뉴 시드 교체 (DB)

`towercrane-for-uiux-server/src/database/database.service.ts` 의 `seedDefaults()` 안 `initialMenus` 배열에서 `Chatbot` 항목을 다음과 같이 교체:

```ts
{
  id: randomUUID(),
  name: 'Challenge with GPT',
  sectionId: 'challenge',
  icon: 'Trophy',          // Lucide
  displayOrder: 5,         // 기존 Chatbot 자리
  isVisible: true,
  requiredRole: null,
  parentId: null,
  createdAt: now,
  updatedAt: now,
},
```

> 기존 DB 가 이미 채워진 경우 `seedDefaults` 는 시드를 다시 돌리지 않는다. 이 경우 두 가지 선택지:
> 1. **DB 리셋** (`rm data/towercrane-catalog.sqlite*` 후 재기동) — 개발 환경에선 권장.
> 2. **기존 메뉴 행을 직접 UPDATE** — 운영 데이터가 있을 때.

운영 마이그레이션이 필요하다면 `migrateLegacySchema()` 옆에 1회성 함수를 추가:

```ts
private migrateChatbotMenuToChallenge(now: string) {
  const row = this.sqlite
    .prepare("SELECT id FROM menus WHERE section_id = 'chatbot' LIMIT 1")
    .get() as { id: string } | undefined
  if (!row) return
  this.sqlite.prepare(`
    UPDATE menus
    SET name = 'Challenge with GPT', section_id = 'challenge', icon = 'Trophy', updated_at = ?
    WHERE id = ?
  `).run(now, row.id)
}
```

> 호출은 `migrateLegacySchema()` 마지막에. 멱등하므로 여러 번 돌아도 안전.

---

## 4. 헤더 매핑 교체

`towercrane-for-uiux-front/src/widgets/app-header/ui/app-header.tsx`:

```ts
function sectionIdToPath(sectionId: string): string {
  const map: Record<string, string> = {
    prototype: '/prototype',
-   chatbot: '/chatbot',
+   challenge: '/challenge',
    meeting: '/meeting',
    docu: '/docu',
    ai_methodology: '/ai-methodology',
    api_doc: '/api-doc',
    task: '/task',
    profile: '/profile',
    users: '/admin/users',
    menu_admin: '/admin/menu',
    readme_admin: '/admin/readme',
  }
  return map[sectionId] ?? '/prototype'
}

function getSectionIdFromPath(pathname: string): string {
  if (pathname.startsWith('/prototype')) return 'prototype'
- if (pathname.startsWith('/chatbot')) return 'chatbot'
+ if (pathname.startsWith('/challenge')) return 'challenge'
  if (pathname.startsWith('/meeting')) return 'meeting'
  // …
}
```

> 또한 `app-header.tsx` 에 `chatbot` 다음 자리에 하드코딩된 게 있으면 제거 (회의실 추가했을 때처럼). 메뉴는 DB 트리에서 자동으로 그려지므로 보통은 손댈 게 없다.

---

## 5. 라우터 교체

`towercrane-for-uiux-front/src/app/router.tsx`:

```ts
- const chatbotRoute = createRoute({
-   getParentRoute: () => authedLayoutRoute,
-   path: '/chatbot',
-   component: () => (
-     <Card>...placeholder...</Card>
-   ),
- })
+ const challengeRoute = createRoute({
+   getParentRoute: () => authedLayoutRoute,
+   path: '/challenge',
+   component: lazy(() => import('../pages/challenge/ui/challenge-page')),
+ })
```

`routeTree` 에서도 `chatbotRoute` 제거하고 `challengeRoute` 추가.

선택: 기존 `/chatbot` URL 보존이 필요하면 별도 redirect route 추가.
```ts
const chatbotRedirectRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/chatbot',
  beforeLoad: () => { throw redirect({ to: '/challenge' }) },
})
```

---

## 6. `pages/challenge/ui/challenge-page.tsx` (M1 placeholder)

```tsx
import { Card } from '../../../shared/ui/card'
import { Trophy } from 'lucide-react'

export default function ChallengePage() {
  return (
    <div className="p-6">
      <Card className="ui-panel p-8 flex flex-col items-center gap-3 text-center">
        <Trophy className="size-8 text-brand-primary" />
        <h1 className="text-xl font-black ui-text-primary">Challenge with GPT</h1>
        <p className="text-sm ui-text-secondary max-w-md">
          셀프 챌린지 카테고리와 회차를 곧 여기서 관리할 수 있습니다.
          M2~M8 에서 사이드바, 주제 블록, 풀이 제출, GPT 대화, 유저 노트를 차례로 붙입니다.
        </p>
      </Card>
    </div>
  )
}
```

> Tailwind 토큰 규칙 준수 (`ui-text-primary`, `ui-panel`, `text-brand-primary`).

---

## 7. 기존 chatbot 페이지/feature 삭제 가이드

- `towercrane-for-uiux-front/src/pages/chatbot/` 가 존재한다면:
  - 내용물이 placeholder 만 있다면 **폴더 통째로 삭제**.
  - 의미 있는 코드가 있다면 `git log -- src/pages/chatbot` 로 마지막 커밋 확인 후 **제거 PR 에 명시**.
- `entities/chatbot`, `features/chatbot` 가 있다면 함께 삭제. (현재 grep 결과 없음 → 안전)

---

## 8. 라우트 가드 / 인증

기존 `authedLayoutRoute` 아래에 `challengeRoute` 를 매다는 한, 비로그인 사용자는 자동으로 `/login` 으로 리다이렉트된다 (기존 `meeting`, `task` 와 동일).

- 추후 게스트 읽기 허용이 필요하면 별도 `publicLayoutRoute` 로 옮긴다.

---

## 9. 점검 체크리스트

- [ ] DB 리셋 후 메뉴에서 "Challenge with GPT" 노출 (Bot → Trophy 아이콘)
- [ ] 메뉴 클릭 시 URL `/challenge` 로 이동
- [ ] 페이지에 placeholder 카드 보임
- [ ] 직접 `/challenge` 입력해도 진입됨
- [ ] `/chatbot` 입력 시 (선택) `/challenge` 로 리다이렉트
- [ ] 비로그인 시 `/login` 으로 강제 이동
- [ ] 헤더의 active 강조가 새 메뉴 위에 정상 표시 (getSectionIdFromPath 매핑 OK)
- [ ] 콘솔 에러 0건

---

## 10. 다음 단계

→ `04-frontend-ui-3panel.md` — 카테고리/섹션 사이드바 + 메인 콘텐츠 영역 골격
