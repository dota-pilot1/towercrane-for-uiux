import { useMemo, useState } from 'react'
import {
  AudioLines,
  Bot,
  CheckCircle2,
  FileText,
  ListChecks,
  Mic2,
  PlugZap,
  Radio,
  Send,
  Settings2,
  ShieldOff,
  Square,
  TerminalSquare,
  Trash2,
  Wrench,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useRefreshSession } from '../../../shared/model/use-refresh-session'
import { useSessionStore } from '../../../shared/store/session-store'
import {
  useRealtimeChat,
  type RealtimeChatOptions,
  type RealtimeToolCallLog,
} from '../../../features/chatbot/model/use-realtime-chat'
import type { RealtimeToolExecuteResponse, RealtimeToolName } from '../../../entities/chatbot-realtime/api/realtime-api'
import { Select } from '../../../shared/ui/select'

const toolOptions: { name: RealtimeToolName; label: string; args: Record<string, unknown> }[] = [
  { name: 'get_my_tasks', label: '내 담당 업무', args: {} },
  { name: 'check_ai_service_request', label: 'AI 서비스 신청', args: {} },
  { name: 'search_knowledge', label: '지식 검색', args: { query: '챗봇 사용 방법' } },
]

const modelOptions = ['gpt-realtime-2', 'gpt-realtime-1.5', 'gpt-realtime', 'gpt-realtime-mini']
const voiceOptions = ['marin', 'cedar', 'alloy', 'verse', 'shimmer', 'sage']

const statusLabels: Record<string, string> = {
  idle: '대기',
  'requesting-permission': '마이크 권한 요청',
  connecting: '연결 중',
  connected: '연결됨',
  disconnecting: '해제 중',
  disconnected: '연결 해제',
  error: '오류',
  listening: '듣는 중',
  thinking: '응답 생성',
  speaking: '음성 출력',
  'tool-calling': '도구 호출',
}

function StatusPill({ label, active }: { label: string; active?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${
      active
        ? 'border-brand-border bg-brand-glass text-brand-primary'
        : 'border-surface-border-soft bg-surface-muted ui-text-muted'
    }`}>
      <span className={`size-2 rounded-full ${active ? 'bg-brand-primary' : 'bg-surface-border'}`} />
      {label}
    </span>
  )
}

function ToolLogItem({ log, onInject }: { log: RealtimeToolCallLog; onInject: (result: RealtimeToolExecuteResponse) => void }) {
  return (
    <div className="rounded-md border border-surface-border-soft bg-surface-muted p-3">
      <div className="flex items-center gap-2">
        <Wrench className="size-3.5 text-brand-primary" />
        <p className="min-w-0 flex-1 truncate text-xs font-bold ui-text-primary">{log.name}</p>
        <span className="rounded border border-surface-border-soft px-1.5 py-0.5 text-[10px] ui-text-muted">
          {log.status}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 ui-text-secondary">
        {log.resultSummary ?? log.errorMessage ?? '실행 중입니다.'}
      </p>
      <pre className="mt-2 max-h-28 overflow-auto rounded bg-surface-raised p-2 text-[11px] ui-text-muted">
        {JSON.stringify(log.arguments, null, 2)}
      </pre>
      {log.result && (
        <button
          type="button"
          onClick={() => onInject(log.result!)}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-2.5 py-1.5 text-xs font-bold text-brand-primary"
        >
          <Send className="size-3.5" />
          세션 주입
        </button>
      )}
    </div>
  )
}

export function ChatbotRealtimePage() {
  useRefreshSession()
  const aiAccess = useSessionStore((s) => s.aiAccess)
  const userRole = useSessionStore((s) => s.userRole)
  const navigate = useNavigate()
  const realtime = useRealtimeChat()
  const [input, setInput] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const [manualTool, setManualTool] = useState<RealtimeToolName>('get_my_tasks')
  const [manualArgs, setManualArgs] = useState('{}')
  const [manualError, setManualError] = useState<string | null>(null)

  const selectedTool = useMemo(
    () => toolOptions.find((tool) => tool.name === manualTool) ?? toolOptions[0],
    [manualTool],
  )

  if (!aiAccess && userRole !== 'admin') {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <div className="ui-panel flex max-w-md flex-col items-center gap-4 rounded-lg p-10 text-center">
          <div className="flex size-14 items-center justify-center rounded-lg border border-surface-border bg-surface-muted">
            <ShieldOff className="size-7 ui-text-muted" />
          </div>
          <div>
            <p className="text-base font-bold ui-text-primary">AI 서비스 접근 권한이 없습니다</p>
            <p className="mt-1.5 text-sm leading-relaxed ui-text-muted">
              Realtime 챗봇 사용을 위해 AI 서비스 신청 후 승인을 받아야 합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: '/ai-service-request' })}
            className="inline-flex items-center gap-2 rounded-md border border-brand-border bg-brand-glass px-4 py-2 text-sm font-bold text-brand-primary"
          >
            <FileText className="size-4" />
            서비스 신청
          </button>
        </div>
      </div>
    )
  }

  const updateOption = <K extends keyof RealtimeChatOptions>(
    key: K,
    value: RealtimeChatOptions[K],
  ) => {
    realtime.setOptions({ ...realtime.options, [key]: value })
  }

  const handleSend = () => {
    if (!realtime.isConnected) return
    realtime.sendText(input)
    setInput('')
  }

  const handleManualTool = async () => {
    setManualError(null)
    try {
      const parsed = JSON.parse(manualArgs || '{}') as Record<string, unknown>
      await realtime.executeManualTool(manualTool, parsed)
    } catch (error) {
      setManualError(error instanceof Error ? error.message : 'JSON 또는 도구 실행 오류입니다.')
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-120px)] max-w-[1680px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="ui-icon-button-brand rounded-md p-2.5">
            <Mic2 className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold ui-text-primary">Realtime GPT 통합 채팅</h1>
            <p className="text-xs ui-text-secondary">
              WebRTC 음성 입출력 · 텍스트 채팅 · Tool Use · {realtime.sessionModel ?? realtime.options.model}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill label={statusLabels[realtime.status]} active={realtime.isConnected} />
          <StatusPill label={statusLabels[realtime.turnStatus]} active={realtime.turnStatus !== 'idle'} />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(380px,1.25fr)_360px_minmax(360px,0.95fr)]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-raised">
          <div className="flex items-center justify-between gap-3 border-b border-surface-border bg-surface-strong px-4 py-3">
            <div>
              <p className="text-sm font-semibold ui-text-primary">대화</p>
              <p className="mt-1 text-xs ui-text-muted">텍스트와 음성 transcript가 같은 목록에 누적됩니다.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={realtime.clearMessages}
                disabled={realtime.messages.length === 0 && !realtime.errorMessage}
                className="ui-icon-button rounded-md p-2 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="대화 내용 지우기"
                title="대화 내용 지우기"
              >
                <Trash2 className="size-4" />
              </button>
              <Radio className="size-4 text-brand-primary" />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {realtime.messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex size-20 items-center justify-center rounded-full border border-brand-border bg-brand-glass">
                  <AudioLines className="size-9 text-brand-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold ui-text-primary">Realtime 연결 준비</p>
                  <p className="mt-2 max-w-md text-sm leading-6 ui-text-secondary">
                    연결 후 텍스트를 보내거나 마이크로 말하면 GPT 응답과 도구 호출 로그가 표시됩니다.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {realtime.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[82%] rounded-lg border px-4 py-3 ${
                      message.role === 'user'
                        ? 'ml-auto border-brand-border bg-brand-glass'
                        : 'mr-auto border-surface-border-soft bg-surface-muted'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      {message.role === 'user' ? <Mic2 className="size-3.5 text-brand-primary" /> : <Bot className="size-3.5 text-brand-primary" />}
                      <span className="text-[11px] font-bold ui-text-muted">
                        {message.role} · {message.inputMode}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6 ui-text-primary">{message.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {realtime.errorMessage && (
            <div className="border-t border-surface-border bg-surface-muted px-4 py-2 text-xs ui-text-secondary">
              {realtime.errorMessage}
            </div>
          )}

          <div className="border-t border-surface-border bg-background p-3">
            <audio ref={realtime.setAudioElement} autoPlay />
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {!realtime.isConnected ? (
                <button
                  type="button"
                  onClick={realtime.connect}
                  disabled={realtime.status === 'connecting' || realtime.status === 'requesting-permission'}
                  className="inline-flex items-center gap-2 rounded-md border border-brand-border bg-brand-glass px-4 py-2 text-sm font-bold text-brand-primary disabled:opacity-60"
                >
                  <PlugZap className="size-4" />
                  연결
                </button>
              ) : (
                <button
                  type="button"
                  onClick={realtime.disconnect}
                  className="inline-flex items-center gap-2 rounded-md border border-surface-border bg-surface-muted px-4 py-2 text-sm font-bold ui-text-primary"
                >
                  <Square className="size-4" />
                  해제
                </button>
              )}
              <span className="text-xs ui-text-muted">마이크는 연결 시 브라우저 권한을 요청합니다.</span>
            </div>
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={(event) => {
                  const nativeEvent = event.nativeEvent as KeyboardEvent & { isComposing?: boolean }
                  if (event.key === 'Enter' && (isComposing || nativeEvent.isComposing)) {
                    return
                  }
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    handleSend()
                  }
                }}
                placeholder={realtime.isConnected ? '업무 질문을 입력하세요...' : '먼저 Realtime 세션을 연결하세요'}
                className="ui-input min-h-12 flex-1 resize-none px-3 py-3 text-sm"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!realtime.isConnected || !input.trim()}
                className="inline-flex size-12 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary disabled:border-surface-border disabled:bg-surface-muted disabled:text-text-muted"
                aria-label="메시지 전송"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border bg-surface-strong px-4 py-3">
            <div className="flex items-center gap-2">
              <Settings2 className="size-4 text-brand-primary" />
              <p className="text-sm font-semibold ui-text-primary">Options</p>
            </div>
            <p className="mt-1 text-xs ui-text-muted">연결 전 설정을 바꾸고 새 세션에 적용합니다.</p>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold ui-text-muted">Model</span>
              <Select
                value={realtime.options.model}
                onChange={(event) => updateOption('model', event.target.value)}
                className="!h-10 !px-3 !text-sm"
              >
                {modelOptions.map((model) => <option key={model}>{model}</option>)}
              </Select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold ui-text-muted">Voice</span>
              <Select
                value={realtime.options.voice}
                onChange={(event) => updateOption('voice', event.target.value)}
                className="!h-10 !px-3 !text-sm"
              >
                {voiceOptions.map((voice) => <option key={voice}>{voice}</option>)}
              </Select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold ui-text-muted">Language</span>
                <Select
                  value={realtime.options.language}
                  onChange={(event) => updateOption('language', event.target.value)}
                  className="!h-10 !px-3 !text-sm"
                >
                  <option value="ko">ko</option>
                  <option value="en">en</option>
                  <option value="auto">auto</option>
                </Select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold ui-text-muted">Mode</span>
                <Select
                  value={realtime.options.responseMode}
                  onChange={(event) => updateOption('responseMode', event.target.value as RealtimeChatOptions['responseMode'])}
                  className="!h-10 !px-3 !text-sm"
                >
                  <option value="text_audio">text+audio</option>
                  <option value="text_only">text only</option>
                  <option value="audio_only">audio only</option>
                </Select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold ui-text-muted">Turn</span>
                <Select
                  value={realtime.options.turnMode}
                  onChange={(event) => updateOption('turnMode', event.target.value as RealtimeChatOptions['turnMode'])}
                  className="!h-10 !px-3 !text-sm"
                >
                  <option value="server_vad">server_vad</option>
                  <option value="push_to_talk">push_to_talk</option>
                </Select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold ui-text-muted">Length</span>
                <Select
                  value={realtime.options.responseLength}
                  onChange={(event) => updateOption('responseLength', event.target.value as RealtimeChatOptions['responseLength'])}
                  className="!h-10 !px-3 !text-sm"
                >
                  <option value="default">기본</option>
                  <option value="short">짧게</option>
                  <option value="long">길게</option>
                </Select>
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold ui-text-muted">Difficulty</span>
              <Select
                value={realtime.options.difficulty}
                onChange={(event) => updateOption('difficulty', event.target.value as RealtimeChatOptions['difficulty'])}
                className="!h-10 !px-3 !text-sm"
              >
                <option value="beginner">초급</option>
                <option value="intermediate">중급</option>
                <option value="advanced">고급</option>
              </Select>
            </label>

            <label className="flex min-h-0 flex-1 flex-col gap-1.5">
              <span className="text-xs font-semibold ui-text-muted">Instructions</span>
              <textarea
                value={realtime.options.instructions}
                onChange={(event) => updateOption('instructions', event.target.value)}
                placeholder="예: 답변을 업무 담당자 관점으로 짧게 정리해줘"
                className="ui-input min-h-32 resize-none px-3 py-2 text-sm leading-6"
              />
            </label>
          </div>
        </aside>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border bg-surface-strong px-4 py-3">
            <div className="flex items-center gap-2">
              <TerminalSquare className="size-4 text-brand-primary" />
              <p className="text-sm font-semibold ui-text-primary">Function Test</p>
            </div>
            <p className="mt-1 text-xs ui-text-muted">도구를 직접 실행하고 연결된 세션에 결과를 주입합니다.</p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            <div className="rounded-md border border-surface-border-soft bg-surface-muted p-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold ui-text-muted">Tool</span>
                <Select
                  value={manualTool}
                  onChange={(event) => {
                    const next = event.target.value as RealtimeToolName
                    const preset = toolOptions.find((tool) => tool.name === next)
                    setManualTool(next)
                    setManualArgs(JSON.stringify(preset?.args ?? {}, null, 2))
                  }}
                  className="!h-10 !px-3 !text-sm"
                  wrapperClassName="w-full"
                >
                  {toolOptions.map((tool) => (
                    <option key={tool.name} value={tool.name}>{tool.label}</option>
                  ))}
                </Select>
              </label>
              <label className="mt-3 flex flex-col gap-1.5">
                <span className="text-xs font-semibold ui-text-muted">Arguments JSON</span>
                <textarea
                  value={manualArgs}
                  onChange={(event) => setManualArgs(event.target.value)}
                  className="ui-input min-h-28 resize-none px-3 py-2 font-mono text-xs leading-5"
                />
              </label>
              {manualError && <p className="mt-2 text-xs ui-text-secondary">{manualError}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setManualArgs(JSON.stringify(selectedTool.args, null, 2))}
                  className="inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-xs font-bold ui-text-primary"
                >
                  <ListChecks className="size-3.5" />
                  Preset
                </button>
                <button
                  type="button"
                  onClick={handleManualTool}
                  className="inline-flex items-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-3 py-2 text-xs font-bold text-brand-primary"
                >
                  <CheckCircle2 className="size-3.5" />
                  실행
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <p className="text-xs font-bold uppercase ui-text-muted">Tool call log</p>
              {realtime.toolLogs.length === 0 ? (
                <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4 text-center text-xs ui-text-muted">
                  아직 도구 호출이 없습니다.
                </div>
              ) : realtime.toolLogs.map((log) => (
                <ToolLogItem key={log.id} log={log} onInject={realtime.injectToolResult} />
              ))}
            </div>

            <div className="flex min-h-0 flex-col gap-3">
              <p className="text-xs font-bold uppercase ui-text-muted">Realtime events</p>
              <div className="max-h-64 overflow-y-auto rounded-md border border-surface-border-soft bg-surface-muted">
                {realtime.eventLogs.length === 0 ? (
                  <p className="p-4 text-center text-xs ui-text-muted">이벤트 대기 중</p>
                ) : realtime.eventLogs.slice(0, 20).map((event) => (
                  <div key={event.id} className="border-b border-surface-border-soft px-3 py-2 last:border-b-0">
                    <p className="truncate text-xs font-semibold ui-text-primary">{event.type}</p>
                    <p className="mt-0.5 text-[11px] ui-text-muted">{event.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
