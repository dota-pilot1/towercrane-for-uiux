import { useEffect, useMemo, useState } from "react";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import {
  ChevronDown,
  ChevronUp,
  Check,
  ClipboardCheck,
  FileJson,
  FileText,
  Image as ImageIcon,
  Slash,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { getToken } from "../../shared/api/client";
import { CompactSelect } from "../../shared/ui/compact-select";
import { Button } from "../../shared/ui/button";
import { toast } from "../../shared/ui/Toast";
import { uploadImageToS3 } from "../../shared/ui/lexical/utils/upload-image";
import {
  createDefaultApiBlockContent,
  isJsonString,
  parseApiBlockContent,
  prettyJson,
  resolveEnvVars,
  type ApiBlockContent,
  type ApiDocBlock,
  type ApiDocEndpoint,
  type ApiQaChecklistItem,
  type ApiQaChecklistStatus,
  type ApiQaImage,
  type ApiQaStatus,
  type ApiResponse,
  type BodyType,
  type HttpMethod,
  type KeyValueItem,
} from "../../features/api-doc/types";
import { useApiEnvStore } from "../../features/api-doc/api-env-store";

const METHOD_OPTIONS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const BODY_TYPE_OPTIONS: Array<{
  type: BodyType;
  label: string;
  description: string;
  Icon: typeof Slash;
}> = [
  { type: "none", label: "No Body", description: "요청 본문 없음", Icon: Slash },
  { type: "json", label: "JSON", description: "application/json", Icon: FileJson },
  { type: "raw", label: "Raw Text", description: "그대로 전송", Icon: FileText },
];

const METHOD_BADGE: Record<HttpMethod, string> = {
  GET: "bg-emerald-100 text-emerald-700",
  POST: "bg-sky-100 text-sky-700",
  PUT: "bg-amber-100 text-amber-700",
  PATCH: "bg-purple-100 text-purple-700",
  DELETE: "bg-red-100 text-red-600",
};

const QA_STATUS_OPTIONS: Array<{ value: ApiQaStatus; label: string }> = [
  { value: "draft", label: "작성 중" },
  { value: "passed", label: "성공" },
  { value: "failed", label: "실패" },
  { value: "needs_check", label: "확인 필요" },
];

const QA_STATUS_CLASS: Record<ApiQaStatus, string> = {
  draft: "bg-surface-strong text-text-secondary",
  passed: "bg-brand-glass text-brand-primary",
  failed: "bg-danger-glass text-destructive",
  needs_check: "bg-surface-muted text-text-primary",
};

const QA_CHECK_STATUS_OPTIONS: Array<{
  value: ApiQaChecklistStatus;
  label: string;
}> = [
  { value: "unchecked", label: "미확인" },
  { value: "passed", label: "통과" },
  { value: "failed", label: "실패" },
  { value: "needs_check", label: "확인 필요" },
];

const QA_CHECK_STATUS_CLASS: Record<ApiQaChecklistStatus, string> = {
  unchecked: "bg-surface-strong text-text-secondary",
  passed: "bg-brand-glass text-brand-primary",
  failed: "bg-danger-glass text-destructive",
  needs_check: "bg-surface-muted text-text-primary",
};

function statusClass(status: number) {
  if (status === 0) return "bg-red-100 text-red-600";
  if (status >= 200 && status < 300) return "bg-emerald-100 text-emerald-700";
  return "bg-surface-strong text-text-secondary";
}

function countEnabled(items: KeyValueItem[]) {
  return items.filter((item) => item.enabled && item.key.trim()).length;
}

const INPUT_CLASS =
  "min-w-0 rounded-md border border-surface-border-soft bg-surface-raised px-2 py-1.5 text-[12px] text-text-primary outline-none focus:border-brand-border disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-muted";

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

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
    <div className="overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised">
      <div className="grid grid-cols-[36px_minmax(0,1fr)_minmax(0,1fr)_36px] items-center gap-2 border-b border-surface-border-soft bg-surface-muted px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
        <span />
        <span>{keyPlaceholder}</span>
        <span>{valuePlaceholder}</span>
        <span />
      </div>
      <div className="divide-y divide-surface-border-soft">
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
                  className="size-4 accent-brand-primary"
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
                  className="flex size-7 items-center justify-center rounded-md text-text-muted hover:bg-danger-glass hover:text-destructive"
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

function QaImageGrid({
  title,
  description,
  images,
  disabled,
  uploading,
  onUpload,
  onCaptionChange,
  onRemove,
}: {
  title: string;
  description: string;
  images: ApiQaImage[];
  disabled: boolean;
  uploading: boolean;
  onUpload: (file: File) => void;
  onCaptionChange: (id: string, caption: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="ui-panel-soft p-3">
      <div className="mb-2 flex items-center gap-2">
        <ImageIcon className="size-4 text-brand-primary" />
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-black text-text-primary">{title}</h4>
          <p className="text-[11px] text-text-muted">{description}</p>
        </div>
        <label
          className={
            "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-surface-border-soft bg-surface-muted px-2.5 text-[12px] font-bold text-text-primary shadow-sm " +
            (disabled || uploading
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer hover:bg-surface-strong")
          }
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Upload className="size-3.5" />
          )}
          업로드
          <input
            type="file"
            accept="image/*"
            disabled={disabled || uploading}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onUpload(file);
            }}
          />
        </label>
      </div>

      {images.length === 0 ? (
        <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-surface-border-soft bg-surface-muted text-text-muted">
          <ImageIcon className="size-6 opacity-50" />
          <p className="text-[12px]">이미지를 추가하세요.</p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised"
            >
              <div className="aspect-video bg-surface-muted">
                <img
                  src={image.url}
                  alt={image.caption || title}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex items-center gap-1.5 border-t border-surface-border-soft p-1.5">
                <input
                  value={image.caption}
                  disabled={disabled}
                  onChange={(event) => onCaptionChange(image.id, event.target.value)}
                  placeholder="이미지 설명"
                  className={INPUT_CLASS + " h-8 flex-1"}
                />
                {!disabled ? (
                  <button
                    title="이미지 삭제"
                    onClick={() => onRemove(image.id)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-danger-glass hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QaChecklist({
  items,
  disabled,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: ApiQaChecklistItem[];
  disabled: boolean;
  onAdd: (text: string) => void;
  onUpdate: (id: string, patch: Partial<ApiQaChecklistItem>) => void;
  onRemove: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onAdd(text);
    setDraft("");
  };

  return (
    <div className="ui-panel-soft p-3">
      <div className="mb-2 flex items-center gap-2">
        <ClipboardCheck className="size-4 text-brand-primary" />
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-black text-text-primary">체크리스트</h4>
          <p className="text-[11px] text-text-muted">
            검수 항목별로 통과, 실패, 확인 필요 상태를 기록합니다.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted px-3 py-6 text-center text-[12px] text-text-muted">
            체크 항목을 추가하세요.
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              className="grid gap-2 rounded-md border border-surface-border-soft bg-surface-raised p-2 md:grid-cols-[40px_minmax(0,1fr)_130px_32px]"
            >
              <span className="flex h-8 items-center justify-center rounded-md bg-surface-muted text-[11px] font-black text-text-muted">
                {index + 1}
              </span>
              <input
                value={item.text}
                disabled={disabled}
                onChange={(event) => onUpdate(item.id, { text: event.target.value })}
                className={INPUT_CLASS + " h-8 w-full"}
              />
              <CompactSelect
                value={item.status}
                disabled={disabled}
                onChange={(event) =>
                  onUpdate(item.id, { status: event.target.value as ApiQaChecklistStatus })
                }
                wrapperClassName="w-full"
                className={
                  "h-8 min-h-8 text-[12px] font-bold " +
                  QA_CHECK_STATUS_CLASS[item.status]
                }
              >
                {QA_CHECK_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CompactSelect>
              {!disabled ? (
                <button
                  title="체크 항목 삭제"
                  onClick={() => onRemove(item.id)}
                  className="flex size-8 items-center justify-center rounded-md text-text-muted hover:bg-danger-glass hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : (
                <span />
              )}
            </div>
          ))
        )}
      </div>

      {!disabled ? (
        <div className="mt-2 flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) submit();
            }}
            placeholder="체크 항목 추가"
            className={INPUT_CLASS + " h-9 flex-1"}
          />
          <Button onClick={submit} className="h-9 gap-1.5 text-[12px]">
            <Plus className="size-3.5" />
            추가
          </Button>
        </div>
      ) : null}
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
  initialView = "request",
}: {
  endpoint: ApiDocEndpoint | null;
  blocks: ApiDocBlock[];
  isAdmin: boolean;
  isBlocksLoading: boolean;
  isSaving: boolean;
  onSave: (content: ApiBlockContent) => void;
  onOpenEnv: () => void;
  initialView?: "request" | "qa";
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
  const [qaUploading, setQaUploading] = useState<"reference" | "result" | null>(null);
  const [activeView, setActiveView] = useState<"request" | "qa">(initialView);
  const [activeTab, setActiveTab] = useState<"params" | "headers" | "body">("params");
  const [responseTab, setResponseTab] = useState<"body" | "headers">("body");
  const [responseExpanded, setResponseExpanded] = useState(false);

  useEffect(() => {
    setContent(parseApiBlockContent(blocks, endpoint));
    setResponse(null);
    setActiveView(initialView);
    setActiveTab("params");
    setResponseExpanded(false);
  }, [blocks, endpoint, initialView]);

  const envVars = getActiveVarsMap();
  const resolvedUrl = resolveEnvVars(content.url, envVars);
  const hasEnvVar = content.url.includes("{{");

  const patch = (partial: Partial<ApiBlockContent>) =>
    setContent((prev) => ({ ...prev, ...partial }));
  const updateBody = (partial: Partial<ApiBlockContent["body"]>) =>
    setContent((prev) => ({ ...prev, body: { ...prev.body, ...partial } }));
  const updateQa = (partial: Partial<ApiBlockContent["qa"]>) =>
    setContent((prev) => ({ ...prev, qa: { ...prev.qa, ...partial } }));

  const uploadQaImage = async (kind: "reference" | "result", file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    setQaUploading(kind);
    try {
      const url = await uploadImageToS3(file);
      const image: ApiQaImage = { id: createId(), url, caption: file.name };
      setContent((prev) => ({
        ...prev,
        qa: {
          ...prev.qa,
          [kind === "reference" ? "referenceImages" : "resultImages"]: [
            ...(kind === "reference"
              ? prev.qa.referenceImages
              : prev.qa.resultImages),
            image,
          ],
        },
      }));
      toast.success("이미지를 추가했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.");
    } finally {
      setQaUploading(null);
    }
  };

  const updateQaImage = (
    kind: "reference" | "result",
    id: string,
    patch: Partial<ApiQaImage>,
  ) => {
    const key = kind === "reference" ? "referenceImages" : "resultImages";
    updateQa({
      [key]: content.qa[key].map((image) =>
        image.id === id ? { ...image, ...patch } : image,
      ),
    });
  };

  const removeQaImage = (kind: "reference" | "result", id: string) => {
    const key = kind === "reference" ? "referenceImages" : "resultImages";
    updateQa({ [key]: content.qa[key].filter((image) => image.id !== id) });
  };

  const addQaChecklistItem = (text: string) => {
    updateQa({
      checklist: [
        ...content.qa.checklist,
        { id: createId(), text, status: "unchecked", resultImageIds: [] },
      ],
    });
  };

  const updateQaChecklistItem = (
    id: string,
    patch: Partial<ApiQaChecklistItem>,
  ) => {
    updateQa({
      checklist: content.qa.checklist.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  };

  const removeQaChecklistItem = (id: string) => {
    updateQa({ checklist: content.qa.checklist.filter((item) => item.id !== id) });
  };

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
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-surface-muted text-center">
        <span className="text-4xl">🧪</span>
        <span className="text-[14px] text-text-muted">
          왼쪽에서 요청을 선택하세요.
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-muted">
      {/* 상단 바 */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-surface-border-soft bg-surface-raised px-4 py-2.5">
        <span
          className={
            "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-black " +
            METHOD_BADGE[endpoint.method]
          }
        >
          {endpoint.method}
        </span>
        <p className="min-w-0 flex-1 truncate text-[14px] font-black text-text-primary">
          {endpoint.title}
        </p>
        <div data-actions className="flex rounded-md border border-surface-border-soft bg-surface-muted p-0.5">
          {(["request", "qa"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={
                "flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-[12px] font-bold transition-colors " +
                (activeView === view
                  ? "bg-surface-raised text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-secondary")
              }
            >
              {view === "qa" ? <ClipboardCheck className="size-3.5" /> : null}
              {view === "request" ? "요청" : "개발 QA"}
            </button>
          ))}
        </div>
        <CompactSelect
          value={activeEnvId}
          onChange={(e) => setActiveEnv(e.target.value)}
          wrapperClassName="w-auto"
          className="h-8 min-h-8 pr-7 text-[12px] font-bold"
        >
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </CompactSelect>
        <Button variant="secondary" size="sm" className="h-8 text-[12px]" onClick={onOpenEnv}>
          환경
        </Button>
        <Button
          variant="secondary"
          size="sm-icon"
          className="size-8"
          title="초기화"
          onClick={handleReset}
        >
          <RotateCcw className="size-3.5" />
        </Button>
        {isAdmin ? (
          <Button
            size="sm"
            className="h-8 gap-1.5 text-[12px]"
            disabled={isSaving || isBlocksLoading}
            onClick={() => onSave(content)}
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            저장
          </Button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* 요청 편집 영역 */}
        {!responseExpanded && activeView === "request" ? (
          <div className="shrink-0 space-y-3 p-3">
            <div className="rounded-lg border border-surface-border-soft bg-surface-raised p-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <CompactSelect
                  value={content.method}
                  disabled={!isAdmin}
                  onChange={(e) => patch({ method: e.target.value as HttpMethod })}
                  wrapperClassName="w-full lg:w-28"
                  className="text-[12px] font-black"
                >
                  {METHOD_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </CompactSelect>
                <input
                  value={content.url}
                  disabled={!isAdmin}
                  placeholder="{{API_BASE}}/endpoint"
                  onChange={(e) => patch({ url: e.target.value })}
                  className={INPUT_CLASS + " h-9 flex-1 font-mono"}
                />
                <label className="flex h-9 shrink-0 items-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-3 text-[12px] font-semibold text-text-secondary">
                  <input
                    type="checkbox"
                    checked={content.authEnabled}
                    disabled={!isAdmin}
                    onChange={(e) => patch({ authEnabled: e.target.checked })}
                    className="size-4 accent-brand-primary"
                  />
                  Auth
                </label>
                <Button
                  onClick={handleSend}
                  disabled={isSending || !content.url.trim()}
                  className="h-9 gap-1.5 text-[13px] lg:w-28"
                >
                  {isSending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Send
                </Button>
              </div>
              {hasEnvVar ? (
                <p className="mt-2 truncate rounded-md border border-surface-border-soft bg-surface-muted px-3 py-1.5 font-mono text-[11px] text-text-muted">
                  {resolvedUrl}
                </p>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-lg border border-surface-border-soft bg-surface-raised">
              <div className="flex items-center gap-4 border-b border-surface-border-soft bg-surface-muted px-3">
                {tabMeta.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={
                      "relative flex items-center gap-1.5 py-2.5 text-[11.5px] font-semibold tracking-tight transition-colors " +
                      (activeTab === tab.id
                        ? "text-text-primary"
                        : "text-text-muted hover:text-text-secondary")
                    }
                  >
                    {tab.label}
                    {tab.count > 0 ? (
                      <span
                        className={
                          "flex h-4 min-w-4 items-center justify-center rounded px-1 text-[10px] font-bold leading-none " +
                          (activeTab === tab.id
                            ? "bg-brand-glass text-brand-primary"
                            : "bg-surface-strong text-text-muted")
                        }
                      >
                        {tab.count}
                      </span>
                    ) : null}
                    <span
                      className={
                        "absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-brand-primary transition-opacity " +
                        (activeTab === tab.id ? "opacity-100" : "opacity-0")
                      }
                    />
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
                    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="요청 Body 형식">
                      {BODY_TYPE_OPTIONS.map(({ type, label, description, Icon }) => {
                        const active = content.body.type === type;
                        return (
                          <label
                            key={type}
                            className={
                              "relative flex min-h-14 items-center gap-2.5 rounded-md border px-3 py-2 text-left transition-colors " +
                              (active
                                ? "border-brand-border bg-brand-glass text-brand-strong shadow-sm"
                                : "border-surface-border-soft bg-surface-raised text-text-secondary hover:border-surface-border hover:bg-surface-muted") +
                              (isAdmin ? " cursor-pointer" : " cursor-not-allowed opacity-70")
                            }
                          >
                            <input
                              type="radio"
                              className="sr-only"
                              value={type}
                              checked={active}
                              disabled={!isAdmin}
                              onChange={() => updateBody({ type })}
                            />
                            <span
                              className={
                                "flex size-8 shrink-0 items-center justify-center rounded-md border " +
                                (active
                                  ? "border-brand-border bg-brand-primary text-white"
                                  : "border-surface-border-soft bg-surface-muted text-text-muted")
                              }
                            >
                              <Icon className="size-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[12px] font-black leading-4">{label}</span>
                              <span className="block truncate text-[10px] font-semibold leading-4 opacity-75">{description}</span>
                            </span>
                            {active ? (
                              <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white">
                                <Check className="size-3.5" />
                              </span>
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                    {content.body.type === "none" ? (
                      <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted px-4 py-8 text-[13px] text-text-muted">
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

        {!responseExpanded && activeView === "qa" ? (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            <div className="ui-panel-soft p-3">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <ClipboardCheck className="size-4 text-brand-primary" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[14px] font-black text-text-primary">
                    개발 QA 문서
                  </h3>
                  <p className="text-[12px] text-text-muted">
                    개발 완료 후 검수할 주제, 참고 이미지, 체크리스트와 결과 이미지를 기록합니다.
                  </p>
                </div>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[11px] font-black " +
                    QA_STATUS_CLASS[content.qa.status]
                  }
                >
                  {QA_STATUS_OPTIONS.find((option) => option.value === content.qa.status)?.label}
                </span>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
                <label className="block min-w-0">
                  <span className="mb-1 block text-[12px] font-bold text-text-secondary">
                    테스트 주제
                  </span>
                  <input
                    value={content.qa.title}
                    disabled={!isAdmin}
                    onChange={(e) => updateQa({ title: e.target.value })}
                    placeholder="예: 회원가입 완료 후 로그인까지 정상 동작한다"
                    className={INPUT_CLASS + " h-9 w-full"}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[12px] font-bold text-text-secondary">
                    상태
                  </span>
                  <CompactSelect
                    value={content.qa.status}
                    disabled={!isAdmin}
                    onChange={(e) => updateQa({ status: e.target.value as ApiQaStatus })}
                    wrapperClassName="w-full"
                    className="h-9 min-h-9 text-[12px] font-bold"
                  >
                    {QA_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </CompactSelect>
                </label>
              </div>

              <label className="mt-3 block min-w-0">
                <span className="mb-1 block text-[12px] font-bold text-text-secondary">
                  테스트 범위
                </span>
                <textarea
                  value={content.qa.scope}
                  disabled={!isAdmin}
                  onChange={(e) => updateQa({ scope: e.target.value })}
                  rows={3}
                  placeholder="검수 대상 화면, API, 조건, 제외 범위를 적습니다."
                  className={INPUT_CLASS + " min-h-20 w-full resize-y py-2 leading-5"}
                />
              </label>
            </div>

            <QaImageGrid
              title="참고 이미지"
              description="기획 화면, 요구사항 캡처, 기존 정상 화면 등을 첨부합니다."
              images={content.qa.referenceImages}
              disabled={!isAdmin}
              uploading={qaUploading === "reference"}
              onUpload={(file) => void uploadQaImage("reference", file)}
              onCaptionChange={(id, caption) =>
                updateQaImage("reference", id, { caption })
              }
              onRemove={(id) => removeQaImage("reference", id)}
            />

            <QaChecklist
              items={content.qa.checklist}
              disabled={!isAdmin}
              onAdd={addQaChecklistItem}
              onUpdate={updateQaChecklistItem}
              onRemove={removeQaChecklistItem}
            />

            <QaImageGrid
              title="결과 이미지"
              description="실패 화면, 수정 후 정상 화면, 검수 완료 캡처를 첨부합니다."
              images={content.qa.resultImages}
              disabled={!isAdmin}
              uploading={qaUploading === "result"}
              onUpload={(file) => void uploadQaImage("result", file)}
              onCaptionChange={(id, caption) =>
                updateQaImage("result", id, { caption })
              }
              onRemove={(id) => removeQaImage("result", id)}
            />

            <div className="grid gap-3 lg:grid-cols-2">
              <label className="block min-w-0">
                <span className="mb-1 block text-[12px] font-bold text-text-secondary">
                  이슈 메모
                </span>
                <textarea
                  value={content.qa.issueNotes}
                  disabled={!isAdmin}
                  onChange={(e) => updateQa({ issueNotes: e.target.value })}
                  rows={6}
                  placeholder="실패 원인, 재현 조건, 담당자에게 전달할 내용을 적습니다."
                  className={INPUT_CLASS + " min-h-32 w-full resize-y py-2 leading-5"}
                />
              </label>
              <label className="block min-w-0">
                <span className="mb-1 block text-[12px] font-bold text-text-secondary">
                  후속 조치
                </span>
                <textarea
                  value={content.qa.notes}
                  disabled={!isAdmin}
                  onChange={(e) => updateQa({ notes: e.target.value })}
                  rows={6}
                  placeholder="수정 요청, 재검수 일정, 관련 업무/이슈 링크를 적습니다."
                  className={INPUT_CLASS + " min-h-32 w-full resize-y py-2 leading-5"}
                />
              </label>
            </div>
          </div>
        ) : null}

        {/* 응답 영역 */}
        {activeView === "request" ? (
        <div className="mx-3 mb-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-surface-border-soft bg-surface-raised">
          <div className="flex flex-wrap items-center gap-2 border-b border-surface-border-soft bg-surface-muted px-3 py-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">
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
                <span className="rounded-full bg-surface-strong px-2 py-0.5 font-mono text-[11px] text-text-secondary">
                  {response.durationMs}ms
                </span>
                <div className="ml-auto flex rounded-md border border-surface-border-soft bg-surface-muted p-0.5">
                  {(["body", "headers"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setResponseTab(tab)}
                      className={
                        "rounded-sm px-2 py-0.5 text-[11px] font-bold " +
                        (responseTab === tab
                          ? "bg-surface-raised text-text-primary"
                          : "text-text-muted")
                      }
                    >
                      {tab === "body" ? "Body" : "Headers"}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <span className="ml-auto text-[12px] text-text-muted">
                Send 버튼을 눌러 요청하세요.
              </span>
            )}
            <button
              onClick={() => setResponseExpanded((v) => !v)}
              title={responseExpanded ? "요청 영역 보기" : "응답 확대"}
              className="flex size-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text-secondary"
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
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-text-muted">
                <Loader2 className="size-6 animate-spin" />
                <p className="text-[12px]">요청 중…</p>
              </div>
            ) : !response ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-text-muted">
                <Send className="size-6 opacity-40" />
                <p className="text-[12px]">아직 요청이 없습니다.</p>
              </div>
            ) : responseTab === "body" ? (
              <pre
                className={
                  "whitespace-pre-wrap break-all font-mono text-[12px] leading-5 " +
                  (response.status === 0 ? "text-destructive" : "text-text-secondary")
                }
              >
                {isJsonString(response.body)
                  ? prettyJson(response.body)
                  : response.body || "(빈 응답)"}
              </pre>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(response.headers).length === 0 ? (
                  <p className="text-[12px] text-text-muted">응답 헤더가 없습니다.</p>
                ) : (
                  Object.entries(response.headers).map(([key, value]) => (
                    <div
                      key={key}
                      className="grid gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-3 py-1.5 font-mono text-[11px] md:grid-cols-[180px_minmax(0,1fr)]"
                    >
                      <span className="break-all text-text-muted">{key}</span>
                      <span className="break-all text-text-secondary">{value}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        ) : null}
      </div>
    </div>
  );
}

export default ApiTesterPanel;
