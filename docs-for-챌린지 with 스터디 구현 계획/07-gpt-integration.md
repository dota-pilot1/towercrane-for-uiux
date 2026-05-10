# 07. Challenge with GPT — 학습 대화 로그

> 사용자가 챌린지를 풀면서 GPT 와 주고받은 대화를 **섹션 단위로 저장**해, 나중에 자기 학습 흔적으로 돌아볼 수 있게 한다.
> 단순 챗봇이 아니라 "이 챌린지를 풀 때 어떤 질문을 했는지"가 곧 학습 자산.

---

## 1. 정책 요약

| 항목 | 결정 |
|---|---|
| 모델 | `gpt-4o-mini` 기본 (스레드별 변경 가능) |
| 인증 | 로그인 필수, 본인 스레드만 보기/쓰기 |
| 공유 | 스레드 단위 `is_shared` 토글 → 공개 시 같은 섹션의 다른 유저가 읽기 가능 (쓰기는 불가) |
| 시스템 프롬프트 | 섹션 제목/주제 요약 + "정답을 직접 주지 말고 힌트로 유도" |
| 호출 단위 | 1 메시지 1 호출 (스트리밍 X v1, 추후 SSE) |
| 메시지 수 한도 | 스레드당 100, 초과 시 새 스레드 안내 |
| 토큰 사용량 | 응답에 `tokens_in/tokens_out` 저장 (관측용) |

---

## 2. UI 컴포넌트

```
features/challenge/gpt-chat/
├── ui/
│   ├── gpt-chat-panel.tsx              ← 좌(스레드 목록) + 우(대화창) 2분할
│   ├── thread-list.tsx                 ← 본인 스레드 + 공유받은 스레드 탭
│   ├── thread-item.tsx
│   ├── message-list.tsx
│   ├── message-bubble.tsx              ← user/assistant/system 구분
│   ├── message-input.tsx               ← textarea + 전송 + 단축키
│   └── thread-header.tsx               ← 제목 편집, 모델 선택, 공유 토글
└── lib/
    ├── format-tokens.ts
    └── parse-message.ts                ← 코드블록/마크다운 처리 (markdown-it 또는 react-markdown)
```

---

## 3. 데이터 훅

```ts
// entities/challenge/api/challenge-gpt-api.ts
export function useGptThreads(sectionId: string) { /* GET /sections/:id/gpt/threads */ }
export function useCreateGptThread(sectionId: string) { /* POST */ }
export function useUpdateGptThread() { /* PATCH /gpt/threads/:id */ }
export function useDeleteGptThread() { /* DELETE */ }

export function useGptMessages(threadId: string | null) {
  return useQuery({
    queryKey: ['challenge', 'gpt', 'messages', threadId],
    queryFn: () => apiRequest(`/challenge/gpt/threads/${threadId}/messages`),
    enabled: !!threadId,
  })
}

export function useSendGptMessage(threadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) =>
      apiRequest(`/challenge/gpt/threads/${threadId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['challenge', 'gpt', 'messages', threadId] })
      qc.invalidateQueries({ queryKey: ['challenge', 'gpt', 'threads'] })
    },
  })
}
```

---

## 4. 시스템 프롬프트 빌더 (서버측)

```ts
// gpt.service.ts
private async buildSystemPrompt(sectionId: string): Promise<string> {
  const section = await this.findSectionById(sectionId) // title + summary
  const topics = await this.findTopicsBySection(sectionId)
  const objective = topics
    .filter((t) => t.blockType === 'NOTE' || t.blockType === 'CHECKLIST')
    .slice(0, 5)
    .map((t) => `- ${t.blockTitle ?? t.blockType}`)
    .join('\n')

  return [
    `당신은 학습 멘토입니다. 사용자가 "${section.title}" 챌린지를 풀고 있습니다.`,
    section.summary ? `섹션 요약: ${section.summary}` : '',
    `주요 학습 항목:\n${objective || '- (없음)'}`,
    `규칙:`,
    `1. 정답 코드를 그대로 주지 말고, 단계별 힌트와 검증 방법을 제시하세요.`,
    `2. 사용자가 직접 막힌 지점을 묘사하면 디버깅 질문 3개를 제시하세요.`,
    `3. 답변 끝에 "다음에 시도해볼 것" 1줄을 붙이세요.`,
  ].filter(Boolean).join('\n\n')
}
```

> 시스템 프롬프트가 매번 길어지면 토큰 비용이 늘어난다. 섹션이 변경되지 않는 한 캐시(메모리, 5분 TTL) 가능.

---

## 5. 메시지 전송 흐름 (서버)

```ts
async sendMessage(threadId: string, content: string, user: SessionUser) {
  const thread = await this.assertOwnedThread(threadId, user.id)

  // 메시지 수 한도
  const count = await this.countMessages(threadId)
  if (count >= 100) throw new BadRequestException('스레드 메시지 한도 초과')

  // user 메시지 저장
  const userMsg = await this.appendMessage(threadId, 'user', content)

  // history 가져오기
  const history = await this.findMessages(threadId)

  // OpenAI 호출
  let reply = ''
  let usage: { prompt_tokens?: number; completion_tokens?: number } = {}
  try {
    const completion = await this.openai.chat.completions.create({
      model: thread.model,
      messages: [
        { role: 'system', content: await this.buildSystemPrompt(thread.sectionId) },
        ...history.map((m) => ({ role: m.role as any, content: m.content })),
      ],
      max_tokens: this.maxTokens,
      temperature: 0.4,
    })
    reply = completion.choices[0]?.message?.content ?? ''
    usage = completion.usage ?? {}
  } catch (err) {
    // 실패 시 user 메시지는 남기고 assistant 자리에 에러 메시지 저장
    await this.appendMessage(threadId, 'assistant', `⚠️ 응답 생성 실패: ${err.message}`)
    throw new BadGatewayException('Upstream model error')
  }

  const assistantMsg = await this.appendMessage(threadId, 'assistant', reply, {
    tokensIn: usage.prompt_tokens,
    tokensOut: usage.completion_tokens,
  })

  // 첫 사용자 메시지였으면 thread title 자동 갱신 (앞 30자)
  if (count === 0) {
    await this.updateThreadTitle(threadId, content.slice(0, 30) + (content.length > 30 ? '…' : ''))
  }

  return { userMessage: userMsg, assistantMessage: assistantMsg }
}
```

---

## 6. 메시지 UI

`MessageBubble`:
- `role === 'user'` → 우측 정렬, brand-glass
- `role === 'assistant'` → 좌측, surface-raised, GPT 아이콘
- `role === 'system'` → 가운데, 작은 회색 배지

마크다운 렌더링: `react-markdown` + `remark-gfm` + `rehype-highlight` (코드블록 하이라이트).

```bash
pnpm add react-markdown remark-gfm rehype-highlight
```

코드블록 클립보드 복사 버튼 추가 (마우스 호버 시).

---

## 7. 입력창

- `textarea` autosize (1~6줄)
- `Cmd/Ctrl + Enter` 전송
- 전송 중 버튼 disabled + 스피너
- 가능하면 cancel(AbortController) 지원 (v1.5)

---

## 8. 공유 모드

- `is_shared` 가 true 인 스레드는 같은 섹션의 다른 유저가 읽기 전용으로 볼 수 있다.
- ThreadList 의 두 탭:
  - **내 대화** (본인 스레드, private/shared 모두)
  - **공유받은 대화** (다른 사람의 shared, 본인 것 제외)
- 공유 토글은 ThreadHeader 의 스위치 (Sonner toast 로 변경 알림).

> 추후 "공감/북마크" 같은 가벼운 인터랙션 가능. v1 에서는 읽기만.

---

## 9. 비용/안전 가드

- 환경변수: `CHALLENGE_GPT_DAILY_LIMIT` (사용자당 일일 메시지 수 상한, 기본 50)
- 한도 초과 시 429 + "내일 다시 시도" 메시지
- 매우 긴 입력 (>4000자) 차단
- 욕설/금칙어 필터는 v1 에서는 미적용 (필요 시 추가)

---

## 10. 테스트

- 단위: `gpt.service.spec.ts`
  - 메시지 한도 초과 → BadRequest
  - OpenAI 실패 → BadGateway + assistant placeholder 저장
  - 첫 메시지 시 title 자동 변경
- E2E (가능하면 mock OpenAI):
  - 로그인 → 스레드 생성 → 메시지 1턴 → 응답 저장 확인

---

## 11. 점검 체크리스트

- [ ] 본인 스레드 목록 + 공유 스레드 목록 분리 표시
- [ ] 새 스레드 생성 → 첫 메시지 입력 → 응답 표시 → 새로고침 후에도 동일
- [ ] 모델 변경 후 다음 메시지부터 적용
- [ ] 공유 토글 → 다른 계정에서 읽기 가능, 쓰기 불가
- [ ] 메시지 100개 시 새 스레드 안내
- [ ] OPENAI_API_KEY 누락 시 에러 메시지 명확
- [ ] 일일 한도 초과 시 429 노출
- [ ] 마크다운 코드블록 정상 하이라이트 + 복사 버튼

---

## 12. 다음 단계

→ `08-user-notes-sharing.md` — 유저별 개인 노트 + 공개 토글
