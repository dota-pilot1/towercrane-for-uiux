import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Loader2, RotateCcw, Save, Send, Trash2 } from 'lucide-react'
import type {
  ApiBlockContent,
  ApiDocBlock,
  ApiDocEndpoint,
  ApiResponse,
  BodyType,
  HttpMethod,
  KeyValueItem,
} from '../../../entities/api-doc/model/types'
import {
  createDefaultApiBlockContent,
  isJsonString,
  parseApiBlockContent,
  prettyJson,
  resolveEnvVars,
} from '../../../entities/api-doc/model/types'
import { useSessionStore } from '../../../shared/store/session-store'
import { Button } from '../../../shared/ui/button'
import { CompactSelect } from '../../../shared/ui/compact-select'
import { useApiEnvStore } from '../model/api-env-store'

const METHOD_OPTIONS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const BODY_TYPES: BodyType[] = ['none', 'json', 'raw']

const METHOD_STYLE: Record<HttpMethod, CSSProperties> = {
  GET: {
    color: 'oklch(0.46 0.15 155)',
    backgroundColor: 'color-mix(in srgb, oklch(0.46 0.15 155) 10%, transparent)',
    borderColor: 'color-mix(in srgb, oklch(0.46 0.15 155) 30%, transparent)',
  },
  POST: {
    color: 'oklch(0.5 0.15 255)',
    backgroundColor: 'color-mix(in srgb, oklch(0.5 0.15 255) 10%, transparent)',
    borderColor: 'color-mix(in srgb, oklch(0.5 0.15 255) 30%, transparent)',
  },
  PUT: {
    color: 'oklch(0.55 0.14 75)',
    backgroundColor: 'color-mix(in srgb, oklch(0.55 0.14 75) 10%, transparent)',
    borderColor: 'color-mix(in srgb, oklch(0.55 0.14 75) 30%, transparent)',
  },
  PATCH: {
    color: 'oklch(0.52 0.16 300)',
    backgroundColor: 'color-mix(in srgb, oklch(0.52 0.16 300) 10%, transparent)',
    borderColor: 'color-mix(in srgb, oklch(0.52 0.16 300) 30%, transparent)',
  },
  DELETE: {
    color: 'var(--destructive)',
    backgroundColor: 'var(--color-danger-glass)',
    borderColor: 'color-mix(in srgb, var(--destructive) 35%, transparent)',
  },
}

function getStatusStyle(status: number): CSSProperties {
  if (status === 0) {
    return {
      color: 'var(--destructive)',
      backgroundColor: 'var(--color-danger-glass)',
      borderColor: 'color-mix(in srgb, var(--destructive) 35%, transparent)',
    }
  }
  if (status >= 200 && status < 300) {
    return {
      color: 'var(--primary)',
      backgroundColor: 'var(--color-brand-glass)',
      borderColor: 'var(--color-brand-border)',
    }
  }
  return {
    color: 'var(--foreground)',
    backgroundColor: 'var(--surface-muted)',
    borderColor: 'var(--surface-border-soft)',
  }
}

function countEnabled(items: KeyValueItem[]) {
  return items.filter((item) => item.enabled && item.key.trim()).length
}

function KeyValueTable({
  items,
  onChange,
  disabled,
  keyPlaceholder,
  valuePlaceholder,
}: {
  items: KeyValueItem[]
  onChange: (items: KeyValueItem[]) => void
  disabled: boolean
  keyPlaceholder: string
  valuePlaceholder: string
}) {
  const rows: KeyValueItem[] = [...items, { key: '', value: '', enabled: true }]

  const updateRow = (index: number, patch: Partial<KeyValueItem>) => {
    if (index === items.length) {
      onChange([...items, { key: '', value: '', enabled: true, ...patch }])
      return
    }
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)))
  }

  const removeRow = (index: number) => {
    onChange(items.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <div className="text-sm">
      <div className="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_32px] gap-2 border-b border-surface-border-soft pb-2 text-[11px] font-bold uppercase tracking-widest text-text-muted">
        <span />
        <span>{keyPlaceholder}</span>
        <span>{valuePlaceholder}</span>
        <span />
      </div>
      <div className="divide-y divide-[var(--surface-border-soft)]">
        {rows.map((row, index) => {
          const isPhantom = index === items.length
          return (
            <div
              key={`${row.key}-${index}`}
              className="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_32px] items-center gap-2 py-2"
            >
              <input
                type="checkbox"
                checked={row.enabled}
                disabled={disabled || isPhantom}
                onChange={(event) => updateRow(index, { enabled: event.target.checked })}
                className="size-4 accent-[var(--primary)] disabled:cursor-not-allowed"
                aria-label={`${keyPlaceholder} 활성화`}
              />
              <input
                value={row.key}
                disabled={disabled}
                placeholder={isPhantom ? `새 ${keyPlaceholder}` : keyPlaceholder}
                onChange={(event) => updateRow(index, { key: event.target.value })}
                className="ui-input font-mono text-xs"
              />
              <input
                value={row.value}
                disabled={disabled}
                placeholder={isPhantom ? `새 ${valuePlaceholder}` : valuePlaceholder}
                onChange={(event) => updateRow(index, { value: event.target.value })}
                className="ui-input font-mono text-xs"
              />
              {!isPhantom && !disabled ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm-icon"
                  tone="danger"
                  onClick={() => removeRow(index)}
                  aria-label="행 삭제"
                  title="행 삭제"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : (
                <span />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ApiTesterPanel({
  endpoint,
  blocks,
  isAdmin,
  isBlocksLoading,
  isSaving,
  onSave,
  onOpenEnv,
}: {
  endpoint: ApiDocEndpoint | null
  blocks: ApiDocBlock[]
  isAdmin: boolean
  isBlocksLoading: boolean
  isSaving: boolean
  onSave: (content: ApiBlockContent) => void
  onOpenEnv: () => void
}) {
  const token = useSessionStore((state) => state.token)
  const environments = useApiEnvStore((state) => state.environments)
  const activeEnvId = useApiEnvStore((state) => state.activeEnvId)
  const setActiveEnv = useApiEnvStore((state) => state.setActiveEnv)
  const getActiveVarsMap = useApiEnvStore((state) => state.getActiveVarsMap)

  const [content, setContent] = useState<ApiBlockContent>(() => parseApiBlockContent(blocks, endpoint))
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body'>('params')
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body')

  useEffect(() => {
    setContent(parseApiBlockContent(blocks, endpoint))
    setResponse(null)
    setActiveTab('params')
  }, [blocks, endpoint])

  const envVars = getActiveVarsMap()
  const resolvedUrl = resolveEnvVars(content.url, envVars)
  const hasEnvVar = content.url.includes('{{')

  const patch = (partial: Partial<ApiBlockContent>) => {
    setContent((prev) => ({ ...prev, ...partial }))
  }

  const updateBody = (partial: Partial<ApiBlockContent['body']>) => {
    setContent((prev) => ({
      ...prev,
      body: {
        ...prev.body,
        ...partial,
      },
    }))
  }

  const handleReset = () => {
    if (!endpoint) return
    if (!window.confirm('현재 입력한 요청 설정을 초기화할까요?')) return
    setContent(createDefaultApiBlockContent(endpoint))
    setResponse(null)
    setActiveTab('params')
  }

  const handleSend = async () => {
    if (!content.url.trim()) return
    setIsSending(true)
    setResponse(null)

    const vars = getActiveVarsMap()
    const resolved = resolveEnvVars(content.url, vars)
    const start = Date.now()

    let url: URL
    try {
      url = new URL(resolved)
    } catch {
      setResponse({
        status: 0,
        statusText: 'Invalid URL',
        headers: {},
        body: `유효하지 않은 URL입니다: ${resolved}`,
        durationMs: 0,
        timestamp: new Date().toISOString(),
      })
      setIsSending(false)
      return
    }

    content.params
      .filter((param) => param.enabled && param.key.trim())
      .forEach((param) => {
        url.searchParams.append(param.key, resolveEnvVars(param.value, vars))
      })

    const headers: Record<string, string> = {}
    content.headers
      .filter((header) => header.enabled && header.key.trim())
      .forEach((header) => {
        headers[header.key] = resolveEnvVars(header.value, vars)
      })

    if (content.body.type === 'json' && !headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json'
    }

    const envToken = vars.TOKEN?.trim()
    const authToken = envToken || token
    if (content.authEnabled && authToken && !headers.Authorization && !headers.authorization) {
      headers.Authorization = `Bearer ${authToken}`
    }

    const body =
      content.method !== 'GET' && content.body.type !== 'none'
        ? resolveEnvVars(content.body.content, vars)
        : undefined

    try {
      const fetchResponse = await fetch(url.toString(), {
        method: content.method,
        headers,
        body,
      })
      const text = await fetchResponse.text()
      const responseHeaders: Record<string, string> = {}
      fetchResponse.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })
      setResponse({
        status: fetchResponse.status,
        statusText: fetchResponse.statusText,
        headers: responseHeaders,
        body: text,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
      setResponseTab('body')
    } catch (error) {
      setResponse({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: error instanceof Error ? error.message : '요청에 실패했습니다.',
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
      setResponseTab('body')
    } finally {
      setIsSending(false)
    }
  }

  const tabMeta = useMemo(
    () => [
      { id: 'params' as const, label: 'Params', count: countEnabled(content.params) },
      { id: 'headers' as const, label: 'Headers', count: countEnabled(content.headers) },
      { id: 'body' as const, label: 'Body', count: content.body.type === 'none' ? 0 : 1 },
    ],
    [content.body.type, content.headers, content.params],
  )

  if (!endpoint) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-md border border-dashed border-surface-border-soft bg-surface-muted text-center">
        <div>
          <p className="text-sm font-bold text-text-primary">엔드포인트를 선택하세요</p>
          <p className="mt-1 text-xs text-text-muted">왼쪽 목록에서 요청할 API를 고르면 테스터가 열립니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised shadow-sm">
      <div className="flex shrink-0 flex-col gap-3 border-b border-surface-border-soft bg-surface-muted/50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex rounded-md border px-2 py-1 text-[11px] font-black"
              style={METHOD_STYLE[endpoint.method]}
            >
              {endpoint.method}
            </span>
            <p className="truncate text-sm font-black text-text-primary">{endpoint.title}</p>
          </div>
          <p className="mt-1 truncate font-mono text-[11px] text-text-muted">{endpoint.path || '경로 미지정'}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CompactSelect
            value={activeEnvId}
            onChange={(event) => setActiveEnv(event.target.value)}
            wrapperClassName="w-28"
            aria-label="환경 선택"
          >
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </CompactSelect>
          <Button type="button" variant="secondary" size="sm" className="h-9 px-3" onClick={onOpenEnv}>
            환경
          </Button>
          <Button type="button" variant="ghost" size="sm-icon" className="h-9 w-9" onClick={handleReset} title="초기화" aria-label="초기화">
            <RotateCcw className="size-4" />
          </Button>
          {isAdmin ? (
            <Button type="button" size="sm" className="h-9 px-3" onClick={() => onSave(content)} disabled={isSaving || isBlocksLoading}>
              {isSaving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Save className="mr-1.5 size-3.5" />}
              저장
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-background">
        <div className="flex min-h-full flex-col gap-3 p-4">
          <div className="rounded-md border border-surface-border-soft bg-surface-raised p-3 shadow-sm">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <CompactSelect
                value={content.method}
                disabled={!isAdmin}
                onChange={(event) => patch({ method: event.target.value as HttpMethod })}
                wrapperClassName="w-full lg:w-28"
                className="font-black"
                style={METHOD_STYLE[content.method]}
                aria-label="HTTP 메서드"
              >
                {METHOD_OPTIONS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </CompactSelect>
              <input
                value={content.url}
                disabled={!isAdmin}
                placeholder="{{API_BASE}}/endpoint"
                onChange={(event) => patch({ url: event.target.value })}
                className="ui-input min-w-0 flex-1 font-mono text-xs"
              />
              <label className="flex h-9 shrink-0 items-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-3 text-xs font-semibold text-text-secondary">
                <input
                  type="checkbox"
                  checked={content.authEnabled}
                  disabled={!isAdmin}
                  onChange={(event) => patch({ authEnabled: event.target.checked })}
                  className="size-4 accent-[var(--primary)]"
                />
                Auth
              </label>
              <Button type="button" onClick={handleSend} disabled={isSending || !content.url.trim()} className="h-9 px-4 py-0 lg:w-28">
                {isSending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Send className="mr-1.5 size-4" />}
                Send
              </Button>
            </div>
            {hasEnvVar ? (
              <p className="mt-2 truncate rounded-md border border-surface-border-soft bg-surface-muted px-3 py-1.5 font-mono text-[11px] text-text-muted">
                {resolvedUrl}
              </p>
            ) : null}
          </div>

          <div className="min-h-[230px] rounded-md border border-surface-border-soft bg-surface-raised shadow-sm">
            <div className="flex border-b border-surface-border-soft bg-surface-muted/50 px-3 pt-2">
              {tabMeta.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-t-md px-3 py-2 text-xs font-bold transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-brand-border text-text-primary'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 ? (
                    <span className="ml-1 rounded-full bg-brand-glass px-1.5 py-0.5 text-[10px] text-brand-primary">
                      {tab.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="p-4">
              {activeTab === 'params' ? (
                <KeyValueTable
                  items={content.params}
                  onChange={(params) => patch({ params })}
                  disabled={!isAdmin}
                  keyPlaceholder="Parameter"
                  valuePlaceholder="Value"
                />
              ) : null}
              {activeTab === 'headers' ? (
                <KeyValueTable
                  items={content.headers}
                  onChange={(headers) => patch({ headers })}
                  disabled={!isAdmin}
                  keyPlaceholder="Header"
                  valuePlaceholder="Value"
                />
              ) : null}
              {activeTab === 'body' ? (
                <div className="space-y-3">
                  <div className="inline-flex rounded-md border border-surface-border-soft bg-surface-muted p-1">
                    {BODY_TYPES.map((type) => (
                      <label
                        key={type}
                        className={`rounded-sm px-3 py-1 text-xs font-bold transition-colors ${
                          content.body.type === type
                            ? 'bg-surface-raised text-text-primary shadow-sm'
                            : 'text-text-muted'
                        } ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                      >
                        <input
                          type="radio"
                          className="hidden"
                          value={type}
                          checked={content.body.type === type}
                          disabled={!isAdmin}
                          onChange={() => updateBody({ type })}
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                  {content.body.type === 'none' ? (
                    <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted px-4 py-8 text-sm text-text-muted">
                      Body를 포함하지 않는 요청입니다.
                    </div>
                  ) : (
                    <textarea
                      value={content.body.content}
                      disabled={!isAdmin}
                      onChange={(event) => updateBody({ content: event.target.value })}
                      spellCheck={false}
                      rows={9}
                      placeholder={content.body.type === 'json' ? '{\n  "key": "value"\n}' : 'Raw body content'}
                      className="ui-input min-h-44 resize-y py-3 font-mono text-xs leading-5"
                    />
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="min-h-[240px] flex-1 rounded-md border border-surface-border-soft bg-surface-raised shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-surface-border-soft bg-surface-muted/50 px-4 py-2.5">
              <span className="text-[11px] font-black uppercase tracking-widest text-text-muted">Response</span>
              {response ? (
                <>
                  <span
                    className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black"
                    style={getStatusStyle(response.status)}
                  >
                    {response.status === 0 ? 'Network Error' : `${response.status} ${response.statusText}`}
                  </span>
                  <span className="rounded-full border border-surface-border-soft bg-surface-muted px-2 py-0.5 font-mono text-[11px] text-text-muted">
                    {response.durationMs}ms
                  </span>
                  <span className="ml-auto text-[11px] text-text-muted">
                    {new Date(response.timestamp).toLocaleTimeString()}
                  </span>
                  <div className="flex rounded-md border border-surface-border-soft bg-surface-muted p-0.5">
                    {(['body', 'headers'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setResponseTab(tab)}
                        className={`rounded-sm px-2.5 py-1 text-[11px] font-bold ${
                          responseTab === tab ? 'bg-surface-raised text-text-primary' : 'text-text-muted'
                        }`}
                      >
                        {tab === 'body' ? 'Body' : 'Headers'}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <span className="ml-auto text-xs text-text-muted">Send 버튼을 눌러 요청하세요.</span>
              )}
            </div>
            <div className="min-h-[190px] p-4">
              {isSending ? (
                <div className="flex h-44 flex-col items-center justify-center gap-3 text-text-muted">
                  <Loader2 className="size-6 animate-spin" />
                  <p className="text-xs">요청 중...</p>
                </div>
              ) : null}
              {!response && !isSending ? (
                <div className="flex h-44 flex-col items-center justify-center gap-3 text-text-muted">
                  <Send className="size-7 opacity-40" />
                  <p className="text-xs">아직 요청이 없습니다.</p>
                </div>
              ) : null}
              {response && responseTab === 'body' ? (
                <pre className={`whitespace-pre-wrap break-all font-mono text-xs leading-5 ${response.status === 0 ? 'text-destructive' : 'text-text-primary'}`}>
                  {isJsonString(response.body) ? prettyJson(response.body) : response.body}
                </pre>
              ) : null}
              {response && responseTab === 'headers' ? (
                <div className="space-y-1.5">
                  {Object.entries(response.headers).length === 0 ? (
                    <p className="text-xs text-text-muted">응답 헤더가 없습니다.</p>
                  ) : (
                    Object.entries(response.headers).map(([key, value]) => (
                      <div
                        key={key}
                        className="grid gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 font-mono text-xs text-text-secondary md:grid-cols-[180px_minmax(0,1fr)]"
                      >
                        <span className="break-all text-text-muted">{key}</span>
                        <span className="break-all text-text-primary">{value}</span>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
