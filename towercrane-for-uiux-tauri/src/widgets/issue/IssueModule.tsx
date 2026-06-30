import { useEffect, useState } from "react";
import type { User } from "../../features/auth/api";
import { getToken } from "../../shared/api/client";
import {
  createIssue,
  createWorkspace,
  getWorkspaceIssues,
  getWorkspaces,
  updateIssuePriority,
  updateIssueStatus,
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUS_LABELS,
  ISSUE_TYPE_LABELS,
  type CreateIssueInput,
  type ProjectIssue,
  type ProjectIssuePriority,
  type ProjectIssueStatus,
  type ProjectIssueType,
  type ProjectIssueWorkspace,
} from "../../features/issue/api";
import PageHeader from "../../shared/ui/PageHeader";
import Select from "../../shared/ui/Select";
import IssueDetail from "./IssueDetail";

type Props = {
  user: User;
};

const STATUS_OPTIONS: ProjectIssueStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "TESTING",
  "CLOSED",
  "HOLD",
];
const PRIORITY_OPTIONS: ProjectIssuePriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];
const TYPE_OPTIONS: ProjectIssueType[] = [
  "BUG",
  "FEATURE",
  "IMPROVEMENT",
  "QUESTION",
  "RISK",
  "OTHER",
];

// 상태/우선순위 색 — 닫힘/완료 톤 구분용
const STATUS_TONE: Record<ProjectIssueStatus, string> = {
  OPEN: "bg-sky-50 text-sky-600",
  IN_PROGRESS: "bg-amber-50 text-amber-600",
  TESTING: "bg-violet-50 text-violet-600",
  CLOSED: "bg-slate-100 text-slate-500",
  HOLD: "bg-slate-100 text-slate-400",
};

const PRIORITY_TONE: Record<ProjectIssuePriority, string> = {
  LOW: "text-slate-400",
  MEDIUM: "text-sky-500",
  HIGH: "text-amber-500",
  URGENT: "text-red-500",
};

function IssueModule({ user }: Props) {
  const [workspaces, setWorkspaces] = useState<ProjectIssueWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeWs, setActiveWs] = useState<ProjectIssueWorkspace | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const token = getToken();
    if (!token) {
      setLoading(false);
      setError("로그인이 필요합니다.");
      return;
    }
    try {
      setWorkspaces(await getWorkspaces(token));
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "워크스페이스를 불러오지 못했습니다.",
      );
    }
  }

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleCreateWorkspace(name: string, description: string) {
    const token = getToken();
    if (!token) return;
    const ws = await createWorkspace(token, { name, description });
    setWorkspaces((prev) => [...prev, ws]);
    setCreating(false);
  }

  const totalIssues = workspaces.reduce((sum, w) => sum + w.issueCount, 0);
  const activeCount = workspaces.filter((w) => !w.archived).length;

  if (activeWs) {
    return (
      <WorkspaceIssues
        workspace={activeWs}
        onBack={() => {
          setActiveWs(null);
          // 돌아오면 카운트 갱신
          void load();
        }}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader>
        <span className="text-[14px] font-bold tracking-tight text-slate-900">
          프로젝트 이슈
        </span>
        <span className="text-[12px] text-slate-400">{user.name}</span>
        <RefreshButton onClick={handleRefresh} refreshing={refreshing} />
        <button
          data-actions
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-emerald-600"
        >
          + 워크스페이스
        </button>
      </PageHeader>

      <div className="flex-1 overflow-y-auto bg-slate-50 px-5 py-5">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[14px] text-slate-400">
            불러오는 중…
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-[14px] text-red-600">
            {error}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="text-4xl">🐛</span>
            <span className="text-[15px] font-bold text-slate-700">
              이슈 워크스페이스가 없습니다.
            </span>
            <span className="text-[13px] text-slate-400">
              먼저 워크스페이스를 만들어 이슈를 모아보세요.
            </span>
            <button
              onClick={() => setCreating(true)}
              className="mt-2 rounded-lg bg-emerald-500 px-4 py-2 text-[13px] font-bold text-white hover:bg-emerald-600"
            >
              + 워크스페이스 추가
            </button>
          </div>
        ) : (
          <>
            {/* 요약 타일 */}
            <div className="grid grid-cols-3 gap-3">
              <SummaryTile icon="🗂️" label="워크스페이스" value={workspaces.length} />
              <SummaryTile icon="📋" label="전체 등록 이슈" value={totalIssues} />
              <SummaryTile icon="🟢" label="활성 워크스페이스" value={activeCount} />
            </div>

            {/* 워크스페이스 카드 */}
            <div className="mt-5 grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {workspaces.map((ws) => (
                <WorkspaceCard
                  key={ws.id}
                  workspace={ws}
                  onOpen={() => setActiveWs(ws)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {creating ? (
        <CreateWorkspaceDialog
          onClose={() => setCreating(false)}
          onCreate={handleCreateWorkspace}
        />
      ) : null}
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-slate-400">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[15px]">
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">
        {value}
      </div>
    </div>
  );
}

function RefreshButton({
  onClick,
  refreshing,
}: {
  onClick: () => void;
  refreshing: boolean;
}) {
  return (
    <button
      data-actions
      onClick={onClick}
      disabled={refreshing}
      title="새로고침"
      className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-50"
    >
      <span className={refreshing ? "inline-block animate-spin" : ""}>↻</span>
    </button>
  );
}

function WorkspaceCard({
  workspace,
  onOpen,
}: {
  workspace: ProjectIssueWorkspace;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full w-full flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[18px] transition-colors group-hover:bg-emerald-500 group-hover:text-white">
            🗂️
          </div>
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-[16px] font-black leading-tight text-slate-900 group-hover:text-emerald-600">
              {workspace.name}
            </h2>
            <p className="mt-0.5 line-clamp-1 text-[13px] text-slate-500">
              {workspace.description || "이슈 워크스페이스"}
            </p>
          </div>
        </div>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-all group-hover:translate-x-0.5 group-hover:bg-emerald-50 group-hover:text-emerald-600">
          →
        </span>
      </div>

      <div className="mt-4 grid w-full grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <div className="px-3 py-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            전체 이슈
          </div>
          <div className="mt-0.5 text-2xl font-black text-slate-900">
            {workspace.issueCount}
          </div>
        </div>
        <div className="flex items-center gap-1.5 border-l border-slate-200 px-3 py-2.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          <span className="text-[13px] font-bold text-emerald-600">활성</span>
        </div>
      </div>
    </button>
  );
}

function WorkspaceIssues({
  workspace,
  onBack,
}: {
  workspace: ProjectIssueWorkspace;
  onBack: () => void;
}) {
  const [issues, setIssues] = useState<ProjectIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectIssueStatus | "ALL">(
    "ALL",
  );
  const [creating, setCreating] = useState(false);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);

  async function load() {
    const token = getToken();
    if (!token) {
      setLoading(false);
      setError("로그인이 필요합니다.");
      return;
    }
    try {
      setIssues(await getWorkspaceIssues(token, workspace.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "이슈를 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace.id]);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function patchIssue(issueId: string, patch: Partial<ProjectIssue>) {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, ...patch } : i)),
    );
  }

  async function inlineUpdate(
    issue: ProjectIssue,
    patch: Partial<ProjectIssue>,
    call: (token: string) => Promise<ProjectIssue>,
  ) {
    const token = getToken();
    if (!token) return;
    const before = issue;
    patchIssue(issue.id, patch);
    try {
      patchIssue(issue.id, await call(token));
    } catch (err) {
      patchIssue(issue.id, before);
      setError(err instanceof Error ? err.message : "변경에 실패했습니다.");
    }
  }

  const handleStatusChange = (issue: ProjectIssue, status: ProjectIssueStatus) =>
    inlineUpdate(issue, { status }, (token) =>
      updateIssueStatus(token, issue.id, status),
    );

  const handlePriorityChange = (
    issue: ProjectIssue,
    priority: ProjectIssuePriority,
  ) =>
    inlineUpdate(issue, { priority }, (token) =>
      updateIssuePriority(token, issue.id, priority),
    );

  async function handleCreateIssue(body: Omit<CreateIssueInput, "projectId">) {
    const token = getToken();
    if (!token) return;
    const issue = await createIssue(token, { ...body, projectId: workspace.id });
    setIssues((prev) => [issue, ...prev]);
    setCreating(false);
  }

  if (activeIssueId) {
    return (
      <IssueDetail
        issueId={activeIssueId}
        onBack={() => setActiveIssueId(null)}
        onUpdated={(updated) =>
          setIssues((prev) =>
            prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)),
          )
        }
      />
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = issues.filter((i) => {
    if (statusFilter !== "ALL" && i.status !== statusFilter) return false;
    if (!q) return true;
    return (
      i.title.toLowerCase().includes(q) ||
      (i.content ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader>
        <button
          onClick={onBack}
          className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200"
          title="워크스페이스 목록"
        >
          ←
        </button>
        <span className="text-[14px] font-bold tracking-tight text-slate-900 truncate">
          {workspace.name}
        </span>
        <span className="text-[12px] text-slate-400">{issues.length}</span>
        <RefreshButton onClick={handleRefresh} refreshing={refreshing} />
        <button
          data-actions
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-emerald-600"
        >
          + 이슈
        </button>
      </PageHeader>

      {/* 검색 + 상태 필터 */}
      {!loading && !error && issues.length > 0 ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-5 py-2.5">
          <div className="relative min-w-[200px] flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-400">
              🔍
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제목·내용 검색"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-[13px] text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {(["ALL", ...STATUS_OPTIONS] as const).map((s) => {
              const count =
                s === "ALL"
                  ? issues.length
                  : issues.filter((i) => i.status === s).length;
              const active = statusFilter === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={
                    "rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors " +
                    (active
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200")
                  }
                >
                  {s === "ALL" ? "전체" : ISSUE_STATUS_LABELS[s]} {count}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto bg-slate-50 px-5 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[14px] text-slate-400">
            불러오는 중…
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-[14px] text-red-600">
            {error}
          </div>
        ) : issues.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="text-3xl">📭</span>
            <span className="text-[14px] text-slate-400">
              이 워크스페이스에 이슈가 없습니다.
            </span>
            <button
              onClick={() => setCreating(true)}
              className="mt-1 rounded-lg bg-emerald-500 px-4 py-2 text-[13px] font-bold text-white hover:bg-emerald-600"
            >
              + 이슈 추가
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="text-3xl">🔍</span>
            <span className="text-[14px] text-slate-400">
              검색 조건에 맞는 이슈가 없습니다.
            </span>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((issue) => (
              <li
                key={issue.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-emerald-300"
              >
                {/* 우선순위 점 */}
                <span
                  className={
                    "shrink-0 text-[15px] leading-none " +
                    PRIORITY_TONE[issue.priority]
                  }
                  title={`우선순위: ${ISSUE_PRIORITY_LABELS[issue.priority]}`}
                >
                  ●
                </span>

                {/* 제목 + 유형 + 담당자 → 클릭 시 상세 */}
                <button
                  type="button"
                  onClick={() => setActiveIssueId(issue.id)}
                  className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
                >
                  <span className="flex w-full min-w-0 items-center gap-2">
                    <span className="min-w-0 truncate text-[14px] font-semibold text-slate-800">
                      {issue.title}
                    </span>
                    <span
                      className={
                        "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold " +
                        STATUS_TONE[issue.status]
                      }
                    >
                      {ISSUE_TYPE_LABELS[issue.issueType]}
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {issue.assigneeName
                      ? `담당 ${issue.assigneeName}`
                      : "담당자 미지정"}
                  </span>
                </button>

                {/* 인라인 컨트롤 */}
                <Select
                  size="sm"
                  className="shrink-0"
                  value={issue.status}
                  onChange={(e) =>
                    handleStatusChange(
                      issue,
                      e.target.value as ProjectIssueStatus,
                    )
                  }
                  title="상태"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {ISSUE_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
                <Select
                  size="sm"
                  className="shrink-0"
                  value={issue.priority}
                  onChange={(e) =>
                    handlePriorityChange(
                      issue,
                      e.target.value as ProjectIssuePriority,
                    )
                  }
                  title="우선순위"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {ISSUE_PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </Select>
              </li>
            ))}
          </ul>
        )}
      </div>

      {creating ? (
        <CreateIssueDialog
          onClose={() => setCreating(false)}
          onCreate={handleCreateIssue}
        />
      ) : null}
    </div>
  );
}

// ── 다이얼로그 ────────────────────────────────────────────────────────────────

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-emerald-500 focus:bg-white";

function CreateWorkspaceDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await onCreate(name.trim(), description.trim());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "생성에 실패했습니다.");
      setSaving(false);
    }
  }

  return (
    <Dialog title="새 워크스페이스" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="워크스페이스 이름"
          className={inputCls}
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="설명 (선택)"
          className={inputCls}
        />
        {err ? <p className="text-[12px] text-red-600">{err}</p> : null}
        <button
          onClick={submit}
          disabled={!name.trim() || saving}
          className="mt-1 rounded-lg bg-emerald-500 py-2.5 text-[13px] font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {saving ? "만드는 중…" : "만들기"}
        </button>
      </div>
    </Dialog>
  );
}

function CreateIssueDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (body: Omit<CreateIssueInput, "projectId">) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [issueType, setIssueType] = useState<ProjectIssueType>("BUG");
  const [priority, setPriority] = useState<ProjectIssuePriority>("MEDIUM");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!title.trim() || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await onCreate({
        title: title.trim(),
        content: content.trim(),
        issueType,
        priority,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "생성에 실패했습니다.");
      setSaving(false);
    }
  }

  return (
    <Dialog title="새 이슈" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="이슈 제목"
          className={inputCls}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용 (선택)"
          rows={3}
          className={inputCls + " resize-none"}
        />
        <div className="flex gap-2">
          <Select
            block
            value={issueType}
            onChange={(e) => setIssueType(e.target.value as ProjectIssueType)}
            title="유형"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {ISSUE_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
          <Select
            block
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as ProjectIssuePriority)
            }
            title="우선순위"
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {ISSUE_PRIORITY_LABELS[p]}
              </option>
            ))}
          </Select>
        </div>
        {err ? <p className="text-[12px] text-red-600">{err}</p> : null}
        <button
          onClick={submit}
          disabled={!title.trim() || saving}
          className="mt-1 rounded-lg bg-emerald-500 py-2.5 text-[13px] font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {saving ? "만드는 중…" : "이슈 등록"}
        </button>
      </div>
    </Dialog>
  );
}

export default IssueModule;
