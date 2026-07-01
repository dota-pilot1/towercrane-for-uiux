import { useEffect, useMemo, useState } from "react";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { getToken } from "../../shared/api/client";
import {
  createDefaultApiBlockContent,
  isJsonString,
  parseApiBlockContent,
  prettyJson,
  resolveEnvVars,
  type ApiBlockContent,
  type ApiDocBlock,
  type ApiDocEndpoint,
  type ApiResponse,
  type BodyType,
  type HttpMethod,
  type KeyValueItem,
} from "../../features/api-doc/types";
import { useApiEnvStore } from "../../features/api-doc/api-env-store";

const METHOD_OPTIONS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const BODY_TYPES: BodyType[] = ["none", "json", "raw"];

const METHOD_BADGE: Record<HttpMethod, string> = {
  GET: "bg-emerald-100 text-emerald-700",
  POST: "bg-sky-100 text-sky-700",
  PUT: "bg-amber-100 text-amber-700",
  PATCH: "bg-purple-100 text-purple-700",
  DELETE: "bg-red-100 text-red-600",
};

function statusClass(status: number) {
  if (status === 0) return "bg-red-100 text-red-600";
  if (status >= 200 && status < 300) return "bg-emerald-100 text-emerald-700";
  return "bg-slate-200 text-slate-600";
}

function countEnabled(items: KeyValueItem[]) {
  return items.filter((item) => item.enabled && item.key.trim()).length;
}

const INPUT_CLASS =
  "min-w-0 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-800 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

function KeyValueTable({
  items,
  onChange,
  disabled,
  keyPlaceholder,
  valuePlaceholder,
}: {
  items: KeyValueItem[];
  onChange: (items: KeyValueItem[]) => void;
  disabled: boolean;
  keyPlaceholder: string;
  valuePlaceholder: string;
}) {
  const rows: KeyValueItem[] = [...items, { key: "", value: "", enabled: true }];

  const updateRow = (index: number, patch: Partial<KeyValueItem>) => {
    if (index === items.length) {
      onChange([...items, { key: "", value: "", enabled: true, ...patch }]);
      return;
    }
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeRow = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="grid grid-cols-[36px_minmax(0,1fr)_minmax(0,1fr)_36px] items-center gap-2 border-b border-slate-100 bg-slate-50 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <span />
        <span>{keyPlaceholder}</span>
        <span>{valuePlaceholder}</span>
        <span />
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row, index) => {
          const isPhantom = index === items.length;
          return (
            <div
              key={index}
              className="grid grid-cols-[36px_minmax(0,1fr)_minmax(0,1fr)_36px] items-center gap-2 px-2 py-1.5"
            >
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  disabled={disabled || isPhantom}
                  onChange={(e) => updateRow(index, { enabled: e.target.checked })}
                  className="size-4 accent-emerald-500"
                />
              </div>
              <input
                value={row.key}
                disabled={disabled}
                placeholder={isPhantom ? `새 ${keyPlaceholder}` : keyPlaceholder}
                onChange={(e) => updateRow(index, { key: e.target.value })}
                className={INPUT_CLASS + " font-mono"}
              />
              <input
                value={row.value}
                disabled={disabled}
                placeholder={isPhantom ? `새 ${valuePlaceholder}` : valuePlaceholder}
                onChange={(e) => updateRow(index, { value: e.target.value })}
                className={INPUT_CLASS + " font-mono"}
              />
              {!isPhantom && !disabled ? (
                <button
                  onClick={() => removeRow(index)}
                  title="행 삭제"
                  className="flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : (
                <span />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ApiTesterPanel({
  endpoint,
  blocks,
  isAdmin,
  isBlocksLoading,
  isSaving,
  onSave,
  onOpenEnv,
}: {
  endpoint: ApiDocEndpoint | null;
  blocks: ApiDocBlock[];
  isAdmin: boolean;
  isBlocksLoading: boolean;
  isSaving: boolean;
  onSave: (content: ApiBlockContent) => void;
  onOpenEnv: () => void;
}) {
  const environments = useApiEnvStore((s) => s.environments);
  const activeEnvId = useApiEnvStore((s) => s.activeEnvId);
  const setActiveEnv = useApiEnvStore((s) => s.setActiveEnv);
  const getActiveVarsMap = useApiEnvStore((s) => s.getActiveVarsMap);

  const [content, setContent] = useState<ApiBlockContent>(() =>
    parseApiBlockContent(blocks, endpoint),
  );
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"params" | "headers" | "body">("params");
  const [responseTab, setResponseTab] = useState<"body" | "headers">("body");
  const [responseExpanded, setResponseExpanded] = useState(false);

  useEffect(() => {
    setContent(parseApiBlockContent(blocks, endpoint));
    setResponse(null);
    setActiveTab("params");
    setResponseExpanded(false);
  }, [blocks, endpoint]);

  const envVars = getActiveVarsMap();
  const resolvedUrl = resolveEnvVars(content.url, envVars);
  const hasEnvVar = content.url.includes("{{");

  const patch = (partial: Partial<ApiBlockContent>) =>
    setContent((prev) => ({ ...prev, ...partial }));
  const updateBody = (partial: Partial<ApiBlockContent["body"]>) =>
    setContent((prev) => ({ ...prev, body: { ...prev.body, ...partial } }));

  const handleReset = () => {
    if (!endpoint) return;
    if (!window.confirm("현재 입력한 요청 설정을 초기화할까요?")) return;
    setContent(createDefaultApiBlockContent(endpoint));
    setResponse(null);
    setActiveTab("params");
  };

  const handleSend = async () => {
    if (!content.url.trim()) return;
    setIsSending(true);
    setResponse(null);

    const vars = getActiveVarsMap();
    const resolved = resolveEnvVars(content.url, vars);
    const start = Date.now();

    let url: URL;
    try {
      url = new URL(resolved);
    } catch {
      setResponse({
        status: 0,
        statusText: "Invalid URL",
        headers: {},
        body: `유효하지 않은 URL입니다: ${resolved}`,
        durationMs: 0,
        timestamp: new Date().toISOString(),
      });
      setIsSending(false);
      return;
    }

    content.params
      .filter((p) => p.enabled && p.key.trim())
      .forEach((p) => url.searchParams.append(p.key, resolveEnvVars(p.value, vars)));

    const headers: Record<string, string> = {};
    content.headers
      .filter((h) => h.enabled && h.key.trim())
      .forEach((h) => {
        headers[h.key] = resolveEnvVars(h.value, vars);
      });

    if (
      content.body.type === "json" &&
      !headers["Content-Type"] &&
      !headers["content-type"]
    ) {
      headers["Content-Type"] = "application/json";
    }

    const envToken = vars.TOKEN?.trim();
    const authToken = envToken || getToken();
    if (
      content.authEnabled &&
      authToken &&
      !headers.Authorization &&
      !headers.authorization
    ) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const body =
      content.method !== "GET" && content.body.type !== "none"
        ? resolveEnvVars(content.body.content, vars)
        : undefined;

    try {
      const res = await tauriFetch(url.toString(), {
        method: content.method,
        headers,
        body,
      });
      const text = await res.text();
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body: text,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      });
      setResponseTab("body");
    } catch (error) {
      setResponse({
        status: 0,
        statusText: "Network Error",
        headers: {},
        body: error instanceof Error ? error.message : "요청에 실패했습니다.",
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      });
      setResponseTab("body");
    } finally {
      setIsSending(false);
    }
  };

  const tabMeta = useMemo(
    () => [
      { id: "params" as const, label: "Params", count: countEnabled(content.params) },
      { id: "headers" as const, label: "Headers", count: countEnabled(content.headers) },
      { id: "body" as const, label: "Body", count: content.body.type === "none" ? 0 : 1 },
    ],
    [content.body.type, content.headers, content.params],
  );

  if (!endpoint) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-slate-50 text-center">
        <span className="text-4xl">🧪</span>
        <span className="text-[14px] text-slate-400">
          왼쪽에서 요청을 선택하세요.
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      {/* 상단 바 */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5">
        <span
          className={
            "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-black " +
            METHOD_BADGE[endpoint.method]
          }
        >
          {endpoint.method}
        </span>
        <p className="min-w-0 flex-1 truncate text-[14px] font-black text-slate-800">
          {endpoint.title}
        </p>
        <select
          value={activeEnvId}
          onChange={(e) => setActiveEnv(e.target.value)}
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[12px] font-bold text-slate-600 outline-none focus:border-emerald-500"
        >
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </select>
        <button
          onClick={onOpenEnv}
          className="h-8 rounded-md bg-slate-100 px-3 text-[12px] font-bold text-slate-600 hover:bg-slate-200"
        >
          환경
        </button>
        <button
          onClick={handleReset}
          title="초기화"
          className="flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
        >
          <RotateCcw className="size-4" />
        </button>
        {isAdmin ? (
          <button
            onClick={() => onSave(content)}
            disabled={isSaving || isBlocksLoading}
            className="flex h-8 items-center gap-1.5 rounded-md bg-emerald-500 px-3 text-[12px] font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            저장
          </button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* 요청 편집 영역 */}
        {!responseExpanded ? (
          <div className="shrink-0 space-y-3 p-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <select
                  value={content.method}
                  disabled={!isAdmin}
                  onChange={(e) => patch({ method: e.target.value as HttpMethod })}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-[12px] font-black text-slate-700 outline-none focus:border-emerald-500 disabled:bg-slate-50 lg:w-28"
                >
                  {METHOD_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  value={content.url}
                  disabled={!isAdmin}
                  placeholder="{{API_BASE}}/endpoint"
                  onChange={(e) => patch({ url: e.target.value })}
                  className={INPUT_CLASS + " h-9 flex-1 font-mono"}
                />
                <label className="flex h-9 shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-[12px] font-semibold text-slate-500">
                  <input
                    type="checkbox"
                    checked={content.authEnabled}
                    disabled={!isAdmin}
                    onChange={(e) => patch({ authEnabled: e.target.checked })}
                    className="size-4 accent-emerald-500"
                  />
                  Auth
                </label>
                <button
                  onClick={handleSend}
                  disabled={isSending || !content.url.trim()}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-emerald-500 px-4 text-[13px] font-bold text-white hover:bg-emerald-600 disabled:opacity-50 lg:w-28"
                >
                  {isSending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Send
                </button>
              </div>
              {hasEnvVar ? (
                <p className="mt-2 truncate rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-[11px] text-slate-400">
                  {resolvedUrl}
                </p>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex border-b border-slate-100 bg-slate-50 px-2 pt-1.5">
                {tabMeta.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={
                      "rounded-t-md px-3 py-2 text-[12px] font-bold " +
                      (activeTab === tab.id
                        ? "border-b-2 border-emerald-500 text-slate-800"
                        : "text-slate-400 hover:text-slate-600")
                    }
                  >
                    {tab.label}
                    {tab.count > 0 ? (
                      <span className="ml-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-600">
                        {tab.count}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
              <div className="p-3">
                {activeTab === "params" ? (
                  <KeyValueTable
                    items={content.params}
                    onChange={(params) => patch({ params })}
                    disabled={!isAdmin}
                    keyPlaceholder="Parameter"
                    valuePlaceholder="Value"
                  />
                ) : null}
                {activeTab === "headers" ? (
                  <KeyValueTable
                    items={content.headers}
                    onChange={(headers) => patch({ headers })}
                    disabled={!isAdmin}
                    keyPlaceholder="Header"
                    valuePlaceholder="Value"
                  />
                ) : null}
                {activeTab === "body" ? (
                  <div className="space-y-3">
                    <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
                      {BODY_TYPES.map((type) => (
                        <label
                          key={type}
                          className={
                            "rounded-sm px-3 py-1 text-[12px] font-bold " +
                            (content.body.type === type
                              ? "bg-white text-slate-800 shadow-sm"
                              : "text-slate-400") +
                            (isAdmin ? " cursor-pointer" : " cursor-not-allowed opacity-70")
                          }
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
                    {content.body.type === "none" ? (
                      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-[13px] text-slate-400">
                        Body를 포함하지 않는 요청입니다.
                      </div>
                    ) : (
                      <textarea
                        value={content.body.content}
                        disabled={!isAdmin}
                        onChange={(e) => updateBody({ content: e.target.value })}
                        spellCheck={false}
                        rows={9}
                        placeholder={
                          content.body.type === "json"
                            ? '{\n  "key": "value"\n}'
                            : "Raw body content"
                        }
                        className={INPUT_CLASS + " min-h-44 w-full resize-y py-2 font-mono leading-5"}
                      />
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* 응답 영역 */}
        <div className="mx-3 mb-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Response
            </span>
            {response ? (
              <>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[11px] font-black " +
                    statusClass(response.status)
                  }
                >
                  {response.status === 0
                    ? "Network Error"
                    : `${response.status} ${response.statusText}`}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-500">
                  {response.durationMs}ms
                </span>
                <div className="ml-auto flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                  {(["body", "headers"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setResponseTab(tab)}
                      className={
                        "rounded-sm px-2 py-0.5 text-[11px] font-bold " +
                        (responseTab === tab
                          ? "bg-white text-slate-800"
                          : "text-slate-400")
                      }
                    >
                      {tab === "body" ? "Body" : "Headers"}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <span className="ml-auto text-[12px] text-slate-400">
                Send 버튼을 눌러 요청하세요.
              </span>
            )}
            <button
              onClick={() => setResponseExpanded((v) => !v)}
              title={responseExpanded ? "요청 영역 보기" : "응답 확대"}
              className="flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              {responseExpanded ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronUp className="size-3.5" />
              )}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {isSending ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="size-6 animate-spin" />
                <p className="text-[12px]">요청 중…</p>
              </div>
            ) : !response ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
                <Send className="size-6 opacity-40" />
                <p className="text-[12px]">아직 요청이 없습니다.</p>
              </div>
            ) : responseTab === "body" ? (
              <pre
                className={
                  "whitespace-pre-wrap break-all font-mono text-[12px] leading-5 " +
                  (response.status === 0 ? "text-red-600" : "text-slate-700")
                }
              >
                {isJsonString(response.body)
                  ? prettyJson(response.body)
                  : response.body || "(빈 응답)"}
              </pre>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(response.headers).length === 0 ? (
                  <p className="text-[12px] text-slate-400">응답 헤더가 없습니다.</p>
                ) : (
                  Object.entries(response.headers).map(([key, value]) => (
                    <div
                      key={key}
                      className="grid gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5 font-mono text-[11px] md:grid-cols-[180px_minmax(0,1fr)]"
                    >
                      <span className="break-all text-slate-400">{key}</span>
                      <span className="break-all text-slate-700">{value}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApiTesterPanel;
