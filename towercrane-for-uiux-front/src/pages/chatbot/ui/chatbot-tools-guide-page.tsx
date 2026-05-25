import { Wrench, Zap, GitBranch, MessageSquare, Code2, ChevronRight } from 'lucide-react'

const steps = [
  {
    icon: Code2,
    title: '1. 툴 스키마 정의',
    desc: '백엔드에서 OpenAI Function Calling 형식으로 툴의 이름·설명·파라미터를 정의합니다.',
    code: `const MY_TOOL: OpenAI.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'my_tool',
    description: 'GPT가 언제 이 툴을 쓸지 판단하는 설명',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '검색어' },
      },
      required: ['query'],
    },
  },
}`,
  },
  {
    icon: MessageSquare,
    title: '2. GPT에게 툴 목록 전달 (1차 요청)',
    desc: 'stream: false 로 요청합니다. GPT가 툴 호출이 필요하다고 판단하면 finish_reason: "tool_calls" 를 반환합니다.',
    code: `const response = await openai.chat.completions.create({
  model, stream: false, messages,
  tools: [MY_TOOL],
  tool_choice: 'auto', // GPT가 스스로 판단
})`,
  },
  {
    icon: Zap,
    title: '3. 툴 실행 후 결과를 GPT에게 전달 (2차 요청)',
    desc: '툴 실행 결과를 messages에 추가하고 stream: true 로 최종 답변을 스트리밍합니다.',
    code: `const result = myToolFunction(input)

const finalStream = await openai.chat.completions.create({
  model, stream: true,
  messages: [
    ...messages,
    choice.message,           // assistant: { tool_calls }
    { role: 'tool',
      tool_call_id: toolCall.id,
      content: JSON.stringify(result) },
  ],
})`,
  },
  {
    icon: GitBranch,
    title: '4. 프론트 SSE 수신 & UI 반응',
    desc: 'tool_call 이벤트를 받으면 Zustand 스토어에 쓰고, 페이지는 스토어를 구독해 다이얼로그·패널 등 원하는 UI를 표시합니다.',
    code: `// use-files-chat.ts
if (parsed.type === 'tool_call') {
  setToolCalls(prev => [...prev, parsed])
  if (parsed.name === 'my_tool') {
    useToolDialogStore.getState().setDialog(parsed.result)
  }
}`,
  },
]

const useCases = [
  { icon: '📋', title: '내 업무 조회', desc: 'DB에서 담당자 기준 업무 목록을 가져와 표시' },
  { icon: '📅', title: '일정 검색', desc: '오늘 / 이번 주 일정을 캘린더 API에서 조회' },
  { icon: '🔍', title: '사내 문서 검색', desc: '지식베이스에서 관련 문서 Top-K 반환' },
  { icon: '📊', title: '통계 조회', desc: 'SQL 쿼리 실행 후 차트 데이터 반환' },
  { icon: '🔔', title: '알림 발송', desc: '특정 조건 충족 시 Slack·메일 전송' },
  { icon: '🤖', title: '외부 API 호출', desc: '날씨, 환율 등 외부 서비스 데이터 수집' },
]

export function ChatbotToolsGuidePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 flex flex-col gap-10">

      {/* 헤더 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand-glass border border-brand-border">
            <Wrench className="size-5 text-brand-primary" />
          </div>
          <h1 className="text-xl font-bold ui-text-primary">도구 호출 (Tool Use) 가이드</h1>
        </div>
        <p className="text-sm ui-text-secondary leading-relaxed">
          AI가 사용자의 질문을 분석해 적절한 함수(도구)를 스스로 선택·실행하는 Function Calling 구조를 설명합니다.
          단순 대화를 넘어 <strong className="text-brand-primary">실제 시스템과 연동</strong>되는 챗봇을 만들 수 있습니다.
        </p>
      </div>

      {/* 흐름 다이어그램 */}
      <div className="ui-panel rounded-xl p-5 flex flex-col gap-2">
        <p className="text-xs font-bold ui-text-muted mb-2 uppercase tracking-wide">전체 흐름</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {['사용자 질문', '1차 GPT 요청 (stream:false)', 'GPT → tool_calls 반환', '함수 실행', 'SSE 전송', '2차 GPT 요청 (stream:true)', '최종 답변 스트리밍'].map((step, i, arr) => (
            <span key={i} className="flex items-center gap-2">
              <span className="rounded-md bg-brand-glass border border-brand-border px-2.5 py-1 text-xs font-medium text-brand-primary">
                {step}
              </span>
              {i < arr.length - 1 && <ChevronRight className="size-3.5 ui-text-muted shrink-0" />}
            </span>
          ))}
        </div>
      </div>

      {/* 구현 단계 */}
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-bold ui-text-primary">구현 단계</h2>
        {steps.map((step) => (
          <div key={step.title} className="ui-panel rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-brand-glass border border-brand-border shrink-0">
                <step.icon className="size-4 text-brand-primary" />
              </div>
              <p className="text-sm font-bold ui-text-primary">{step.title}</p>
            </div>
            <p className="text-xs ui-text-secondary leading-relaxed">{step.desc}</p>
            <pre className="text-[11px] ui-text-secondary bg-surface-muted rounded-lg p-3 overflow-x-auto leading-relaxed">
              {step.code}
            </pre>
          </div>
        ))}
      </div>

      {/* 활용 사례 */}
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-bold ui-text-primary">사내 시스템 활용 사례</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {useCases.map((uc) => (
            <div key={uc.title} className="ui-panel-soft rounded-xl p-4 flex items-start gap-3">
              <span className="text-xl shrink-0">{uc.icon}</span>
              <div>
                <p className="text-sm font-semibold ui-text-primary">{uc.title}</p>
                <p className="text-xs ui-text-muted mt-0.5">{uc.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 핵심 포인트 */}
      <div className="rounded-xl border border-brand-border bg-brand-glass p-5 flex flex-col gap-2">
        <p className="text-sm font-bold text-brand-primary">핵심 포인트</p>
        <ul className="text-xs ui-text-secondary leading-6 list-disc list-inside space-y-1">
          <li><code className="bg-surface-muted rounded px-1">description</code>이 GPT의 툴 선택 기준입니다 — 명확하게 작성할수록 정확도가 높아집니다.</li>
          <li>1차 요청은 반드시 <code className="bg-surface-muted rounded px-1">stream: false</code> — tool_calls JSON이 청크로 쪼개지면 파싱이 불가합니다.</li>
          <li>여러 툴을 배열에 담아 전달하면 GPT가 상황에 맞는 툴을 선택합니다.</li>
          <li>툴 결과는 SSE로 프론트에 전달 — Zustand 스토어로 툴별 UI를 독립적으로 제어합니다.</li>
        </ul>
      </div>

    </div>
  )
}
