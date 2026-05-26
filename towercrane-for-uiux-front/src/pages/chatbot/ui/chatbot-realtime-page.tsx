import { useState } from 'react'
import {
  AudioLines,
  Bot,
  FileText,
  Mic2,
  PlugZap,
  Radio,
  Send,
  Settings2,
  ShieldOff,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useRefreshSession } from '../../../shared/model/use-refresh-session'
import { useSessionStore } from '../../../shared/store/session-store'
import {
  useRealtimeChat,
  type RealtimeChatOptions,
} from '../../../features/chatbot/model/use-realtime-chat'
import { Select } from '../../../shared/ui/select'
import { ActionIconButton } from '../../../shared/ui/action-icon-button'
import { AiServiceFormForToolCall } from './ai-service-form-for-tool-call'

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
    <span className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold ${
      active
        ? 'border-brand-border bg-brand-glass text-brand-primary'
        : 'border-surface-border-soft bg-surface-muted ui-text-muted'
    }`}>
      <span className={`size-2 rounded-full ${active ? 'bg-brand-primary' : 'bg-surface-border'}`} />
      {label}
    </span>
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
  const [optionsOpen, setOptionsOpen] = useState(false)

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
          <button
            type="button"
            onClick={() => setOptionsOpen(true)}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-surface-border bg-surface-raised px-3 text-xs font-semibold ui-text-primary hover:bg-surface-muted"
          >
            <Settings2 className="size-3.5" />
            Options
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-2">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-raised">
          <div className="flex items-center justify-between gap-3 border-b border-surface-border bg-surface-strong px-4 py-3">
            <div>
              <p className="text-sm font-semibold ui-text-primary">대화</p>
              <p className="mt-1 text-xs ui-text-muted">텍스트와 음성 transcript가 같은 목록에 누적됩니다.</p>
            </div>
            <div className="flex items-center gap-2">
              <ActionIconButton
                icon={Trash2}
                onClick={realtime.clearMessages}
                disabled={realtime.messages.length === 0 && !realtime.errorMessage}
                aria-label="대화 내용 지우기"
                title="대화 내용 지우기"
                className="rounded-md"
              />
              <div className={`relative flex size-9 items-center justify-center rounded-md border ${
                realtime.isConnected
                  ? 'border-emerald-400/50 bg-emerald-50/50 dark:bg-emerald-900/10'
                  : 'border-surface-border bg-surface-muted'
              }`}>
                {realtime.isConnected && (
                  <>
                    <span className="absolute inset-0 rounded-md bg-emerald-500/20 animate-ping" />
                    <span className="absolute inset-0 rounded-md bg-emerald-500/10 animate-pulse" />
                  </>
                )}
                <Radio className={`relative size-4 ${realtime.isConnected ? 'text-emerald-500' : 'ui-text-muted'}`} />
              </div>
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

        <AiServiceFormForToolCall
          activePanelTool={realtime.activePanelTool}
          panelData={realtime.panelData}
          onClose={realtime.closePanel}
          onOpen={realtime.openPanel}
        />
      </div>

      {optionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOptionsOpen(false)}
          />
          <div className="relative z-10 flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden rounded-lg border border-surface-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-border bg-surface-strong px-4 py-3">
              <div className="flex items-center gap-2">
                <Settings2 className="size-4 text-brand-primary" />
                <p className="text-sm font-semibold ui-text-primary">Options</p>
              </div>
              <button
                type="button"
                onClick={() => setOptionsOpen(false)}
                className="ui-icon-button rounded-md p-1.5"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
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

              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-xs font-semibold ui-text-muted">Instructions</span>
                <textarea
                  value={realtime.options.instructions}
                  onChange={(event) => updateOption('instructions', event.target.value)}
                  placeholder="예: 답변을 업무 담당자 관점으로 짧게 정리해줘"
                  className="ui-input min-h-32 flex-1 resize-none px-3 py-2 text-sm leading-6"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
