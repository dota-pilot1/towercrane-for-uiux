# 02. 백엔드 NestJS `challenge` 모듈

> 마포-팔란티어 `ChallengeController` / `ChallengeService` 의 의도를 그대로 옮기되, NestJS 컨벤션 + Drizzle + Zod 검증으로 다시 작성한다.
> 기존 `api-doc`, `tasks`, `meeting` 모듈과 **동일한 골격**을 따른다.

---

## 1. 모듈 폴더 구조

```
towercrane-for-uiux-server/src/challenge/
├── challenge.module.ts
├── challenge.controller.ts        ← 라우팅
├── challenge.service.ts           ← 비즈니스 로직
├── challenge.schemas.ts           ← Zod (요청 검증)
├── gpt/
│   ├── gpt.controller.ts          ← /challenge/gpt/* 엔드포인트
│   ├── gpt.service.ts             ← OpenAI 호출, 스레드/메시지 저장
│   └── gpt.schemas.ts
└── notes/
    ├── notes.controller.ts        ← /challenge/notes/* 엔드포인트
    ├── notes.service.ts
    └── notes.schemas.ts
```

> GPT 와 Notes 는 challenge 의 하위 기능이지만 책임이 다르므로 폴더로 분리. 모듈은 1개(`ChallengeModule`)로 유지하고, 그 안에서 컨트롤러/서비스를 묶는다.

---

## 2. `app.module.ts` 등록

```ts
import { ChallengeModule } from './challenge/challenge.module';

@Module({
  imports: [
    // ... 기존
    ChallengeModule,
  ],
})
export class AppModule {}
```

---

## 3. Zod 스키마 (`challenge.schemas.ts`)

```ts
import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(64).optional().nullable(),
  emoji: z.string().max(8).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
})

export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
})

export const reorderSchema = z.object({
  // [{ id, orderIdx }] — 트랜잭션으로 일괄 업데이트
  items: z.array(z.object({ id: z.string().uuid(), orderIdx: z.number().int().min(0) })),
})

export const createSectionSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(1).max(150),
  summary: z.string().max(500).optional().nullable(),
})

export const updateSectionSchema = createSectionSchema.partial().extend({
  isActive: z.boolean().optional(),
})

// blockType 화이트리스트
export const blockTypeSchema = z.enum([
  'NOTE', 'MMD', 'CHECKLIST', 'GITHUB', 'FIGMA', 'FILE', 'DBTABLE',
])

// 주제 블록 일괄 저장 (마포 패턴: 기존 블록 삭제 후 다시 insert)
export const saveTopicsSchema = z.object({
  topics: z.array(z.object({
    blockType: blockTypeSchema,
    blockTitle: z.string().max(200).optional().nullable(),
    content: z.string(),                  // JSON string
    orderIdx: z.number().int().min(0),
  })),
})

export const createSubmissionSchema = z.object({
  githubUrl: z.string().url().optional().nullable(),
  content: z.string().max(10_000).default(''),
  checklistResult: z.string().default('[]'),  // JSON string
})

export const updateSubmissionSchema = createSubmissionSchema.partial()

export const ratingSchema = z.object({
  rating: z.number().int().min(1).max(5),
})
```

---

## 4. 컨트롤러 라우팅 표

`/api/challenge` prefix (`apiRequest` 가 자동으로 `/api` 붙이므로 컨트롤러는 `@Controller('challenge')`).

### 4.1 카테고리

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/categories` | 인증 | 활성 카테고리 목록 (orderIdx) |
| POST | `/categories` | admin | 카테고리 생성 |
| PATCH | `/categories/:id` | admin | 이름/아이콘/활성화 수정 |
| DELETE | `/categories/:id` | admin | cascade 삭제 |
| POST | `/categories/reorder` | admin | 일괄 순서 변경 |

### 4.2 섹션

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/categories/:id/sections` | 인증 | 카테고리의 섹션 목록 |
| POST | `/sections` | admin | 섹션 생성 |
| PATCH | `/sections/:id` | admin | 수정 |
| DELETE | `/sections/:id` | admin | cascade 삭제 |
| POST | `/sections/reorder` | admin | 일괄 순서 변경 |

### 4.3 주제 블록

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/sections/:id/topics` | 인증 | 섹션의 주제 블록 (orderIdx) |
| PUT | `/sections/:id/topics` | admin | **일괄 덮어쓰기** (기존 삭제 + 새로 insert in 트랜잭션) |

### 4.4 풀이 제출

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/sections/:id/submissions` | 인증 | 섹션의 모든 풀이 (createdAt desc) |
| POST | `/sections/:id/submissions` | 인증 | 풀이 생성 (자동 채점) |
| PATCH | `/submissions/:id` | 본인 | 본인 풀이 수정 (자동 재채점) |
| DELETE | `/submissions/:id` | 본인 또는 admin | 삭제 |
| PUT | `/submissions/:id/rating` | admin | 별점 (1~5) |

### 4.5 GPT (별도 컨트롤러 `gpt.controller.ts`)

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/sections/:id/gpt/threads` | 인증 | 본인 스레드 목록 |
| POST | `/sections/:id/gpt/threads` | 인증 | 새 스레드 생성 |
| PATCH | `/gpt/threads/:id` | 본인 | 제목/공유 수정 |
| DELETE | `/gpt/threads/:id` | 본인 | 삭제 (cascade messages) |
| GET | `/gpt/threads/:id/messages` | 본인 또는 공유된 스레드 | 메시지 목록 |
| POST | `/gpt/threads/:id/messages` | 본인 | 사용자 메시지 입력 → GPT 호출 → 응답 저장 → 둘 다 반환 |

### 4.6 유저 노트 (별도 컨트롤러 `notes.controller.ts`)

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/sections/:id/notes/mine` | 인증 | 본인 노트 (private 포함) |
| GET | `/sections/:id/notes/shared` | 인증 | 다른 사람의 shared/public 노트 |
| GET | `/topics/:id/notes/mine` | 인증 | 토픽 단위 본인 노트 |
| POST | `/notes` | 인증 | 새 노트 (sectionId 또는 topicId 필요) |
| PATCH | `/notes/:id` | 본인 | 내용/공개여부/핀 |
| DELETE | `/notes/:id` | 본인 | 삭제 |

---

## 5. 권한 가드

기존 `auth/roles.guard.ts` + `@Roles('admin')` 데코레이터를 그대로 사용한다.

```ts
// challenge.controller.ts 예시
@Controller('challenge')
@UseGuards(AuthGuard)
export class ChallengeController {
  @Post('categories')
  @Roles('admin')
  createCategory(@Body() body: unknown, @CurrentUser() user: SessionUser) {
    return this.challengeService.createCategory(body, user.id)
  }
}
```

> "본인 또는 admin" 같은 조건부 권한은 가드로 처리하기 어려우므로, **서비스 안에서 명시적으로 검사**하고 `ForbiddenException` 던진다 (마포 ChallengeService 의 패턴과 동일).

---

## 6. 서비스 핵심 로직 (스니펫)

### 6.1 자동 채점 (`calculateScore`)

```ts
// 마포 calculateScore 의 NestJS 버전
private calculateScore(topics: ChallengeTopicRow[], checklistResult: string): number {
  let totalChecked = 0
  let parsed: Array<{ index: number; checked: boolean }> = []
  try { parsed = JSON.parse(checklistResult) } catch { return 0 }

  // 모든 CHECKLIST 블록을 순회하며 체크된 항목의 point 합산
  for (const topic of topics.filter(t => t.blockType === 'CHECKLIST')) {
    let items: Array<{ label: string; point: number }> = []
    try { items = JSON.parse(topic.content) } catch { continue }
    for (const item of parsed) {
      if (item.checked && items[item.index]) {
        totalChecked += items[item.index].point ?? 0
      }
    }
  }
  return totalChecked
}
```

> 채점 규칙은 추후 협의로 바꿀 수 있으니, 별도 함수로 빼서 단위 테스트 작성. (`challenge.service.spec.ts`)

### 6.2 주제 블록 일괄 저장 (트랜잭션)

```ts
saveTopics(sectionId: string, topics: SaveTopicsInput['topics'], userId: string) {
  const now = new Date().toISOString()
  this.databaseService.db.transaction((tx) => {
    tx.delete(challengeTopicsTable).where(eq(challengeTopicsTable.sectionId, sectionId)).run()
    if (topics.length === 0) return
    tx.insert(challengeTopicsTable).values(
      topics.map((t, idx) => ({
        id: randomUUID(),
        sectionId,
        blockType: t.blockType,
        blockTitle: t.blockTitle ?? null,
        content: t.content,
        orderIdx: t.orderIdx ?? idx,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      })),
    ).run()
  })
}
```

### 6.3 풀이 제출 (자동 채점 포함)

```ts
createSubmission(sectionId: string, body: unknown, user: SessionUser) {
  const input = createSubmissionSchema.parse(body)
  const topics = this.databaseService.db
    .select().from(challengeTopicsTable)
    .where(eq(challengeTopicsTable.sectionId, sectionId)).all()
  const score = this.calculateScore(topics, input.checklistResult)
  const now = new Date().toISOString()
  const id = randomUUID()
  this.databaseService.db.insert(challengeSubmissionsTable).values({
    id, sectionId, userId: user.id, userName: user.name,
    githubUrl: input.githubUrl ?? null,
    content: input.content,
    checklistResult: input.checklistResult,
    score,
    createdAt: now, updatedAt: now,
  }).run()
  return this.findSubmissionById(id)
}
```

---

## 7. GPT 서비스 (`gpt.service.ts`)

### 7.1 환경변수

```env
# .env
OPENAI_API_KEY=sk-...
OPENAI_DEFAULT_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=2048
```

### 7.2 의존성

```bash
pnpm add openai
```

### 7.3 메시지 전송 흐름

```ts
async sendMessage(threadId: string, userMessage: string, user: SessionUser) {
  // 1. 스레드 소유 확인
  const thread = await this.assertOwnedThread(threadId, user.id)

  // 2. 사용자 메시지 저장
  await this.appendMessage(threadId, 'user', userMessage)

  // 3. 스레드 전체 히스토리 조회
  const history = await this.findMessages(threadId)

  // 4. OpenAI 호출 (system prompt + history)
  const completion = await this.openai.chat.completions.create({
    model: thread.model,
    messages: [
      { role: 'system', content: this.buildSystemPrompt(thread.sectionId) },
      ...history.map((m) => ({ role: m.role as any, content: m.content })),
    ],
    max_tokens: this.maxTokens,
  })
  const reply = completion.choices[0]?.message?.content ?? ''

  // 5. assistant 메시지 저장 (token usage 함께)
  const saved = await this.appendMessage(threadId, 'assistant', reply, {
    tokensIn: completion.usage?.prompt_tokens,
    tokensOut: completion.usage?.completion_tokens,
  })

  // 6. 스레드 updatedAt 갱신, 첫 메시지면 title 자동 생성 (요약)
  return saved
}
```

### 7.4 시스템 프롬프트 (예시)

```ts
private buildSystemPrompt(sectionId: string): string {
  // 섹션 제목 + 주제 블록 요약 + "사용자가 이 챌린지를 푸는 중이다" 컨텍스트
  return `당신은 학습 멘토입니다. 사용자가 "${sectionTitle}" 챌린지를 풀고 있습니다.
구체적인 정답 코드를 그대로 주지 말고, 단계별 힌트와 검증 방법을 제시하세요.`
}
```

### 7.5 안전장치

- 비로그인 차단 (가드)
- thread 당 메시지 수 상한 (예: 100) — 초과 시 새 스레드 안내
- 1 사용자 동시 호출 1건 (간단한 락 또는 큐)
- API 키 누락 시 503 + "관리자에게 문의" 메시지

---

## 8. 노트 서비스 (`notes.service.ts`)

- `sectionId`/`topicId` 둘 중 하나는 반드시 존재 → 서비스에서 검증 후 저장
- `visibility` 변경 시 권한: 본인만 가능
- `getSharedNotes(sectionId, currentUserId)`:
  - `visibility IN ('shared', 'public')`
  - **본인 것은 mine 쪽에 이미 들어있으니 제외** (DISTINCT)
- 추후 "스터디 그룹"이 도입되면 `visibility='group'` 옵션과 `group_id` 컬럼 추가 (지금은 단순화)

---

## 9. 응답 DTO 통일

```ts
// 클라이언트가 카테고리/섹션을 한번에 받을 수 있도록 통합 응답 옵션 제공
GET /api/challenge/tree
→ [{ ...category, sections: [{ ...section, topicCount, submissionCount }] }]
```

> 초기에는 분리된 엔드포인트로 시작하고, 트래픽이 늘면 `tree` 합본 엔드포인트로 최적화. **초기 PR 에는 포함하지 않음.**

---

## 10. 에러 매핑

| 상황 | HTTP | 메시지 |
|---|---|---|
| Zod 검증 실패 | 400 | `Invalid input: <field>` |
| 권한 없음 | 403 | `Forbidden` |
| 리소스 없음 | 404 | `<Resource> not found` |
| OpenAI 실패 | 502 | `Upstream model error` |
| Rate limit (자체) | 429 | `Too many requests` |

---

## 11. 점검 체크리스트

- [ ] `challenge.module.ts` 만들고 `AppModule` 에 등록
- [ ] `challenge.service.ts` CRUD + 자동 채점 단위 테스트 통과
- [ ] `gpt.service.ts` OPENAI_API_KEY 누락 시 503 동작
- [ ] `notes.service.ts` section/topic 중 하나라도 없으면 400
- [ ] curl 테스트: 로그인 → 카테고리 생성(admin) → 섹션 → 주제 → 풀이 → 점수 자동 계산 확인
- [ ] curl 테스트: 일반 유저로 admin 엔드포인트 시도 → 403
- [ ] curl 테스트: GPT 메시지 1턴 왕복

---

## 12. 다음 단계

→ `03-frontend-foundation.md` (메뉴 교체, 라우터, FSD 폴더 정리)
