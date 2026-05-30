import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Check, Copy, Download, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import type {
  ApiDocImportCollection,
  ApiDocImportExportFile,
} from "../../../entities/api-doc/model/import-export-types";
import { API_BASE_URL } from "../../../shared/api/http";
import {
  createApiDocExportFileName,
  downloadJsonFile,
  readJsonFile,
} from "../lib/api-doc-json-file";
import { useExportApiDoc, useImportApiDoc } from "../model/use-api-doc-queries";

const IMPORT_ENDPOINT = `${API_BASE_URL}/api-doc/import`;

// 에이전트(Codex/Claude Code)가 그대로 실행할 수 있는 cURL 예제.
// payload.json = "업로드 스펙" 탭의 예제와 동일한 형식.
const CURL_EXAMPLE = `# 1) payload.json 작성 (아래 '업로드 스펙' 탭의 구조 그대로)
# 2) 로그인 후 발급된 토큰으로 아래 요청 실행

curl -X POST "${IMPORT_ENDPOINT}" \\
  -H "Authorization: Bearer <YOUR_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d @payload.json`;

const FIELD_GUIDE: { name: string; desc: string }[] = [
  { name: "version", desc: "파일 버전. 신규 파일은 2로 둡니다." },
  { name: "source", desc: 'Agent 업로드용 고정값 "towercrane-api-spec".' },
  { name: "workspaces[].name", desc: "도메인 또는 워크스페이스 이름." },
  { name: "workspaces[].description", desc: "도메인 설명. 비워도 됩니다." },
  { name: "workspaces[].icon", desc: "표시 아이콘 이름. 모르면 생략 가능합니다." },
  { name: "workspaces[].collections[].name", desc: "컬렉션(1차 카테고리) 이름." },
  { name: "endpoints[].title", desc: "API 항목 이름." },
  { name: "endpoints[].method", desc: "GET · POST · PUT · PATCH · DELETE 중 하나." },
  { name: "endpoints[].path", desc: "표시용 서버 path (예: /api/users)." },
  { name: "request.method", desc: "실행할 HTTP 메서드. 보통 endpoints[].method와 동일합니다." },
  { name: "request.url", desc: "Postman Lite 실행 URL. 보통 {{API_BASE}} + path." },
  { name: "request.authEnabled", desc: "인증 토큰 자동 첨부 여부 (true/false)." },
  { name: "request.headers / params", desc: "{ key, value, enabled, description } 객체 배열." },
  { name: "request.body.type", desc: '"none" · "json" · "raw".' },
  { name: "request.body.content", desc: "본문 문자열. json이면 valid JSON을 문자열로 넣습니다." },
  { name: "request.description", desc: "요청 설명. 비워도 됩니다." },
];

const METHOD_EXAMPLES = [
  {
    key: "post",
    label: "POST",
    text: `http method: POST
url: http://xxx/api/reservations
body:
"""
{
  "customer": {
    "name": "홍길동",
    "phone": "010-1234-5678",
    "email": "hong@example.com"
  },
  "service": {
    "id": 12,
    "name": "프리미엄 상담",
    "durationMinutes": 60
  },
  "schedule": {
    "reservedAt": "2026-06-01T10:00:00+09:00",
    "timezone": "Asia/Seoul"
  },
  "staffId": 3,
  "payment": {
    "method": "CARD",
    "amount": 50000,
    "currency": "KRW"
  },
  "memo": "첫 방문 고객. 알림톡 발송 필요",
  "notification": {
    "sendKakao": true,
    "sendSms": false
  },
  "metadata": {
    "source": "agent-upload",
    "campaignCode": "MVP_TEST"
  }
}
"""`,
  },
  {
    key: "read",
    label: "READ",
    text: `http method: GET
url: http://xxx/api/reservations?page=1&size=20
body:
""`,
  },
  {
    key: "delete",
    label: "DELETE",
    text: `http method: DELETE
url: http://xxx/api/reservations/{reservationId}
body:
"""
{
  "reason": "고객 요청",
  "requestedBy": "admin",
  "notifyCustomer": true,
  "refund": {
    "required": true,
    "amount": 50000,
    "method": "ORIGINAL_PAYMENT"
  }
}
"""`,
  },
  {
    key: "patch",
    label: "PATCH",
    text: `http method: PATCH
url: http://xxx/api/reservations/{reservationId}/status
body:
"""
{
  "status": "CANCELED",
  "reason": "고객 요청",
  "changedBy": "admin",
  "notifyCustomer": true,
  "changes": {
    "reservedAt": {
      "before": "2026-06-01T10:00:00+09:00",
      "after": null
    },
    "staffId": {
      "before": 3,
      "after": null
    }
  },
  "audit": {
    "requestId": "req_20260601_001",
    "source": "console"
  }
}
"""`,
  },
  {
    key: "put",
    label: "PUT",
    text: `http method: PUT
url: http://xxx/api/reservations/{reservationId}
body:
"""
{
  "customer": {
    "name": "홍길동",
    "phone": "010-9999-8888",
    "email": "hong.updated@example.com"
  },
  "service": {
    "id": 15,
    "name": "VIP 상담",
    "durationMinutes": 90
  },
  "schedule": {
    "reservedAt": "2026-06-02T14:00:00+09:00",
    "timezone": "Asia/Seoul"
  },
  "staffId": 7,
  "status": "CONFIRMED",
  "payment": {
    "method": "CARD",
    "amount": 80000,
    "currency": "KRW",
    "paid": true
  },
  "memo": "예약 전체 수정",
  "notification": {
    "sendKakao": true,
    "sendSms": true
  }
}
"""`,
  },
] as const;

function getImportCollections(data: ApiDocImportExportFile): ApiDocImportCollection[] {
  if (data.version === 1) return data.collections;
  return data.workspaces.flatMap((workspace) => workspace.collections);
}

function getImportSummary(data: ApiDocImportExportFile) {
  const collections = getImportCollections(data);
  return {
    workspaceCount: data.version === 1 ? 0 : data.workspaces.length,
    collectionCount: collections.length,
    endpointCount: collections.reduce(
      (sum, collection) => sum + (collection.endpoints?.length ?? 0),
      0,
    ),
  };
}

function createConfirmMessage(data: ApiDocImportExportFile) {
  const { workspaceCount, collectionCount, endpointCount } =
    getImportSummary(data);
  if (data.version === 1) {
    return `${collectionCount}개 컬렉션, ${endpointCount}개 API를 기존 목록에 추가할까요?`;
  }
  return `${workspaceCount}개 워크스페이스, ${collectionCount}개 컬렉션, ${endpointCount}개 API를 추가할까요?`;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label}을(를) 복사했습니다.`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("복사하지 못했습니다.");
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-surface-border-soft bg-surface-muted px-2.5 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-strong hover:text-text-primary"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "복사됨" : "복사"}
    </button>
  );
}

type HelpTab = "format" | "api";
type MethodExampleKey = (typeof METHOD_EXAMPLES)[number]["key"];

function ImportHelpDialog({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<HelpTab>("format");
  const [methodTab, setMethodTab] = useState<MethodExampleKey>("post");
  const activeMethodExample =
    METHOD_EXAMPLES.find((item) => item.key === methodTab) ?? METHOD_EXAMPLES[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tabs: { key: HelpTab; label: string }[] = [
    { key: "format", label: "업로드 스펙" },
    { key: "api", label: "Agent 직접 호출" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--text-primary)_35%,transparent)] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="가져오기 형식 안내"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft px-5 pt-4">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-text-primary">Agent용 Postman 업로드 스펙</h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              Codex/Claude가 이 JSON 스펙을 만들거나 import API를 직접 호출해서 여러 API를 한 번에 등록합니다.
            </p>
            <div className="mt-3 flex gap-1">
              {tabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`-mb-px border-b-2 px-3 py-2 text-xs font-bold transition-colors ${
                    tab === item.key
                      ? "border-brand-primary text-text-primary"
                      : "border-transparent text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="mt-1 rounded-md p-1.5 text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary"
          >
            <X className="size-4" />
          </button>
        </div>

        {tab === "format" ? (
          <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-2">
            <div className="overflow-y-auto border-b border-surface-border-soft p-5 md:border-b-0 md:border-r">
              <h3 className="text-xs font-bold text-text-primary">Agent 파일 업로드 방식</h3>
              <ol className="mt-2 space-y-1.5 text-xs leading-5 text-text-secondary">
                <li>1. 우측 HTTP 메서드 예시를 참고해서 API 요청 목록을 만듭니다.</li>
                <li>2. Codex/Claude Code에 원하는 도메인 API 목록을 이 형식으로 만들게 합니다.</li>
                <li>
                  3. 받은 내용을 <code className="rounded bg-surface-muted px-1">.json</code> 파일로
                  저장합니다.
                </li>
                <li>4. “가져오기” 버튼으로 업로드하면 워크스페이스·컬렉션·API가 한 번에 추가됩니다.</li>
              </ol>

              <h3 className="mt-5 text-xs font-bold text-text-primary">필드 설명</h3>
              <dl className="mt-2 space-y-1.5">
                {FIELD_GUIDE.map((item) => (
                  <div key={item.name} className="text-xs leading-5">
                    <dt className="inline font-mono font-semibold text-text-primary">{item.name}</dt>
                    <dd className="inline text-text-secondary"> — {item.desc}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex min-h-0 flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-text-primary">HTTP 메서드별 요청 예시</h3>
                  <p className="mt-1 text-xs leading-5 text-text-secondary">
                    아래 형식으로 요청 정보를 주면 Agent가 업로드용 JSON 스펙으로 변환합니다.
                  </p>
                </div>
                <CopyButton
                  text={activeMethodExample.text}
                  label={`${activeMethodExample.label} 예시`}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {METHOD_EXAMPLES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMethodTab(item.key)}
                    className={`h-8 rounded-md border px-3 text-xs font-black transition-colors ${
                      methodTab === item.key
                        ? "border-brand-border bg-brand-glass text-brand-primary"
                        : "border-surface-border-soft bg-surface-muted text-text-secondary hover:bg-surface-strong hover:text-text-primary"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-text-secondary">
                READ는 실제 HTTP 메서드로 GET을 사용합니다.
              </p>
              <pre className="mt-2 min-h-0 flex-1 overflow-auto rounded-md border border-surface-border-soft bg-surface-muted p-3 text-[11px] leading-4 text-text-primary">
                <code>{activeMethodExample.text}</code>
              </pre>
            </div>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-2">
            <div className="overflow-y-auto border-b border-surface-border-soft p-5 md:border-b-0 md:border-r">
              <h3 className="text-xs font-bold text-text-primary">엔드포인트</h3>
              <p className="mt-2 break-all rounded-md bg-surface-muted px-2 py-1.5 font-mono text-xs text-text-primary">
                POST {IMPORT_ENDPOINT}
              </p>

              <h3 className="mt-4 text-xs font-bold text-text-primary">헤더</h3>
              <ul className="mt-2 space-y-1 font-mono text-[11px] leading-5 text-text-secondary">
                <li>Authorization: Bearer &lt;YOUR_TOKEN&gt;</li>
                <li>Content-Type: application/json</li>
              </ul>

              <h3 className="mt-4 text-xs font-bold text-text-primary">본문</h3>
              <p className="mt-2 text-xs leading-5 text-text-secondary">
                ‘업로드 스펙’ 탭의 JSON과 동일합니다.{" "}
                <code className="rounded bg-surface-muted px-1">workspaces[]</code> 안에 여러
                워크스페이스·컬렉션·엔드포인트를 넣으면 한 번에 등록됩니다.
              </p>

              <h3 className="mt-4 text-xs font-bold text-text-primary">에이전트 사용법</h3>
              <ol className="mt-2 space-y-1.5 text-xs leading-5 text-text-secondary">
                <li>1. 이 스펙(엔드포인트·헤더·본문 형식)을 Codex/Claude Code에 전달합니다.</li>
                <li>2. “이 도메인 API를 Towercrane Postman Lite에 올려줘”라고 요청합니다.</li>
                <li>3. 에이전트가 payload.json을 만들어 위 cURL로 POST하면 즉시 등록됩니다.</li>
              </ol>
              <p className="mt-3 text-[11px] leading-4 text-text-secondary">
                ※ 토큰은 로그인 후 발급된 값(관리자 권한 필요)을 사용하세요.
              </p>
            </div>

            <div className="flex min-h-0 flex-col p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold text-text-primary">cURL 예제</h3>
                <CopyButton text={CURL_EXAMPLE} label="cURL 예제" />
              </div>
              <pre className="min-h-0 flex-1 overflow-auto rounded-md border border-surface-border-soft bg-surface-muted p-3 text-[11px] leading-4 text-text-primary">
                <code>{CURL_EXAMPLE}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ApiDocImportExportActions({ isAdmin }: { isAdmin: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const exportMutation = useExportApiDoc();
  const importMutation = useImportApiDoc();
  const isBusy = exportMutation.isPending || importMutation.isPending;

  const handleExport = async () => {
    const data = await exportMutation.mutateAsync();
    downloadJsonFile(createApiDocExportFileName(), data);
    toast.success("API Spec JSON을 내보냈습니다.");
  };

  const handleImportClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const data = await readJsonFile<ApiDocImportExportFile>(file);

      if (!window.confirm(createConfirmMessage(data))) {
        return;
      }

      await importMutation.mutateAsync(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "JSON 파일을 읽지 못했습니다.",
      );
    }
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-surface-border-soft bg-surface-muted px-3 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-strong hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
        onClick={handleExport}
        disabled={isBusy}
      >
        {exportMutation.isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Download className="size-3.5" />
        )}
        내보내기
      </button>

      {isAdmin ? (
        <>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-brand-border bg-brand-primary px-3 text-xs font-bold text-text-on-brand transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleImportClick}
            disabled={isBusy}
          >
            {importMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            가져오기
          </button>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label="Agent용 Postman 업로드 스펙"
            title="Agent용 Postman 업로드 스펙"
            className="inline-flex size-8 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted text-sm font-black text-text-secondary transition-colors hover:bg-surface-strong hover:text-text-primary"
          >
            ?
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      ) : null}

      {helpOpen ? <ImportHelpDialog onClose={() => setHelpOpen(false)} /> : null}
    </div>
  );
}
