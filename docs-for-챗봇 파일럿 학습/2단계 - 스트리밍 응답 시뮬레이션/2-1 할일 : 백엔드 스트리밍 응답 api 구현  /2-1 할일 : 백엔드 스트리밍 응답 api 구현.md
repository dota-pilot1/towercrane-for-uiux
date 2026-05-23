# 2-1 할일 — 백엔드 스트리밍 응답 API 구현

## 목표
`POST /chatbot/stream` 엔드포인트를 만들고 Postman으로 GPT 스트리밍 응답을 확인한다.

---

## 체크리스트

### 1. OpenAI SDK 설치
- [x] `pnpm add openai` (towercrane-for-uiux-server)

### 2. .env에 API 키 추가
- [x] `OPENAI_API_KEY` 확인 (기존에 있었음)
- [x] `OPENAI_DEFAULT_MODEL=gpt-4o-mini` 확인

### 3. chatbot 모듈 파일 3개 생성
- [x] `src/chatbot/chatbot.module.ts`
- [x] `src/chatbot/chatbot.controller.ts`
- [x] `src/chatbot/chatbot.service.ts`

### 4. AppModule에 등록
- [x] `app.module.ts`에 `ChatbotModule` import 추가

### 5. Postman 테스트
- [x] `POST /api/chatbot/stream` — Body: `{ "message": "안녕하세요" }`
- [x] 토큰 단위로 청크가 흘러나오는 것 확인

---

## 엔드포인트 스펙

```
POST /api/chatbot/stream
Content-Type: application/json

Request Body:
{
  "message": "안녕하세요"
}

Response: text/event-stream
data: {"text":"안"}
data: {"text":"녕하세요"}
data: {"text":"!"}
...
data: [DONE]
```

> GPT는 한 글자씩이 아니라 토큰(의미 단위)으로 보내기 때문에 청크 크기가 불규칙하다. 정상 동작임.

---

## 구현 방식: 스트리밍 Response (@Post + @Res)

처음에 `@Sse` (SSE) 방식을 시도했으나 GET만 지원해서 JSON Body를 쓸 수 없었다.
`@Post + @Res()` 로 응답 객체를 직접 제어하는 스트리밍 Response 방식으로 변경.

| | SSE (`@Sse`) | 스트리밍 Response (`@Post + @Res`) |
|---|---|---|
| HTTP 메서드 | GET만 가능 | POST 가능 |
| Body | 못 씀 | JSON body 사용 가능 ✅ |
| 실무 사용 | 알림, 피드 | **AI 챗봇 스트리밍** ✅ |

---

## 핵심 코드 흐름

```
Controller: POST /chatbot/stream
  @Body() → message 추출
  @Res()  → res 객체 직접 제어
  ↓
Service.streamGpt(message, res)
  ↓
res.setHeader('Content-Type', 'text/event-stream')
  ↓
OpenAI API (stream: true)
  ↓
for await (chunk of stream)
  → res.write(`data: ${JSON.stringify({ text })}\n\n`)
  ↓
res.write('data: [DONE]\n\n')
res.end()
```

---

## 다음 단계 (2-2)
프론트 `chatbot-streaming-page`의 mock `simulateStream()` 제거하고 실제 API 연동
