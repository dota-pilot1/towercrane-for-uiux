import { AudioLines, BookOpen, ChevronRight, Mic2, Radio, Server, Wrench } from 'lucide-react'

const steps = [
  {
    icon: Server,
    title: '1. 세션 API',
    desc: '브라우저에 OpenAI API key를 노출하지 않고 백엔드에서 Realtime 세션을 생성합니다.',
  },
  {
    icon: Radio,
    title: '2. WebRTC 연결',
    desc: '마이크 입력 track과 GPT remote audio stream을 RTCPeerConnection에 연결합니다.',
  },
  {
    icon: AudioLines,
    title: '3. 이벤트 파싱',
    desc: 'session, speech, response, error 이벤트를 transcript와 상태 UI로 변환합니다.',
  },
  {
    icon: Wrench,
    title: '4. 도구 호출',
    desc: 'function_call item을 감지하고 6단계 tool executor 결과를 function_call_output으로 돌려줍니다.',
  },
]

export function ChatbotRealtimeGuidePage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border border-brand-border bg-brand-glass">
            <BookOpen className="size-5 text-brand-primary" />
          </div>
          <h1 className="text-xl font-bold ui-text-primary">실시간 음성 가이드</h1>
        </div>
        <p className="text-sm leading-6 ui-text-secondary">
          Realtime GPT 음성 챗봇은 WebRTC 음성 세션 위에 Tool Use를 얹는 7단계 실습입니다.
          `/chatbot/tools`의 도구 정의와 실행 함수는 공유하고, Realtime 전용 페이지와 훅은 분리합니다.
        </p>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-raised p-5">
        <p className="mb-3 text-xs font-bold uppercase ui-text-muted">전체 흐름</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {['마이크 입력', 'WebRTC', 'Realtime API', 'function_call', '서버 도구 실행', '음성 답변'].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span className="rounded-md border border-brand-border bg-brand-glass px-2.5 py-1 text-xs font-medium text-brand-primary">
                {step}
              </span>
              {i < arr.length - 1 && <ChevronRight className="size-3.5 shrink-0 ui-text-muted" />}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-bold ui-text-primary">구현 단계</h2>
        {steps.map((step) => (
          <div key={step.title} className="rounded-lg border border-surface-border bg-surface-raised p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass">
                <step.icon className="size-4 text-brand-primary" />
              </div>
              <p className="text-sm font-bold ui-text-primary">{step.title}</p>
            </div>
            <p className="mt-2 text-xs leading-6 ui-text-secondary">{step.desc}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-brand-border bg-brand-glass p-5">
        <div className="flex items-center gap-2">
          <Mic2 className="size-4 text-brand-primary" />
          <p className="text-sm font-bold text-brand-primary">분리 기준</p>
        </div>
        <p className="mt-2 text-xs leading-6 ui-text-secondary">
          6단계 훅은 REST/SSE 흐름이므로 재사용하지 않습니다. 7단계는 WebRTC data channel과 Realtime session event를 기준으로 새 훅을 만듭니다.
        </p>
      </div>
    </div>
  )
}
