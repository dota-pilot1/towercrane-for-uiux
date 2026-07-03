import { useEffect, useState } from "react";
import type { User } from "../../entities/user";
import { getToken } from "../../shared/api/client";
import {
  getMyWorkspaces,
  getMyWorkspaceTasks,
  updateTaskPriority,
  updateTaskStatus,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type TaskWorkspace,
} from "../../features/task/api";
import PageHeader from "../../shared/ui/PageHeader";
import Select from "../../shared/ui/Select";
import TaskDetail from "./TaskDetail";

type Props = {
  user: User;
};

const STATUS_OPTIONS: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "HOLD"];
const PRIORITY_OPTIONS: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function formatDue(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(5, 10);
  return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit" }).format(d);
}

function TodoModule({ user }: Props) {
  const [workspaces, setWorkspaces] = useState<TaskWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeWs, setActiveWs] = useState<TaskWorkspace | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      setError("로그인이 필요합니다.");
      return;
    }
    setLoading(true);
    getMyWorkspaces(token)
      .then((list) => {
        setWorkspaces(list);
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "워크스페이스를 불러오지 못했습니다."),
      )
      .finally(() => setLoading(false));
  }, []);

  async function handleRefresh() {
    const token = getToken();
    if (!token || refreshing) return;
    setRefreshing(true);
    try {
      setWorkspaces(await getMyWorkspaces(token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "새로고침에 실패했습니다.");
    } finally {
      setRefreshing(false);
    }
  }

  const totalTasks = workspaces.reduce((sum, w) => sum + w.taskCount, 0);
  const totalOpen = workspaces.reduce((sum, w) => sum + w.openTaskCount, 0);
  const totalDone = Math.max(0, totalTasks - totalOpen);
  const overallPct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  if (activeWs) {
    return (
      <WorkspaceTasks
        workspace={activeWs}
        onBack={() => setActiveWs(null)}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader>
        <span className="text-[14px] font-bold tracking-tight text-slate-900">
          내 할일
        </span>
        <span className="text-[12px] text-slate-400">{user.name}</span>
        <RefreshButton onClick={handleRefresh} refreshing={refreshing} />
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
            <span className="text-4xl">✅</span>
            <span className="text-[15px] font-bold text-slate-700">내 업무가 없습니다.</span>
            <span className="text-[13px] text-slate-400">
              웹에서 업무를 등록하면 여기에 모입니다.
            </span>
          </div>
        ) : (
          <>
            {/* 요약 타일 */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SummaryTile icon="🗂️" label="워크스페이스" value={workspaces.length} />
              <SummaryTile icon="📋" label="내 업무" value={totalTasks} />
              <SummaryTile icon="🔄" label="진행 중" value={totalOpen} />
              <SummaryTile
                icon="✅"
                label="완료"
                value={totalDone}
                trailing={
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                    {overallPct}%
                  </span>
                }
              />
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
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  trailing,
}: {
  icon: string;
  label: string;
  value: number;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-slate-400">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[15px]">
            {icon}
          </span>
          {label}
        </div>
        {trailing}
      </div>
      <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</div>
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
  workspace: TaskWorkspace;
  onOpen: () => void;
}) {
  const done = Math.max(0, workspace.taskCount - workspace.openTaskCount);
  const pct = workspace.taskCount > 0 ? (done / workspace.taskCount) * 100 : 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full w-full flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[18px] transition-colors group-hover:bg-emerald-500 group-hover:text-white">
            ✅
          </div>
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-[16px] font-black leading-tight text-slate-900 group-hover:text-emerald-600">
              {workspace.name}
            </h2>
            <p className="mt-0.5 line-clamp-1 text-[13px] text-slate-500">
              {workspace.description ?? "내 업무 워크스페이스"}
            </p>
          </div>
        </div>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-all group-hover:translate-x-0.5 group-hover:bg-emerald-50 group-hover:text-emerald-600">
          →
        </span>
      </div>

      <div className="mt-4 grid w-full grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <div className="px-3 py-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">내 업무</div>
          <div className="mt-0.5 text-2xl font-black text-slate-900">{workspace.taskCount}</div>
        </div>
        <div className="border-l border-slate-200 px-3 py-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">진행 중</div>
          <div className="mt-0.5 text-2xl font-black text-emerald-600">{workspace.openTaskCount}</div>
        </div>
      </div>

      <div className="mt-4 w-full rounded-lg border border-slate-200 bg-emerald-50/40 px-3.5 py-3">
        <div className="flex items-center justify-between text-[12px] font-bold">
          <span className="text-slate-500">완료율</span>
          <span className="text-emerald-600">{Math.round(pct)}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[12px] font-semibold text-slate-400">
          <span>{done}개 완료</span>
          <span>{workspace.openTaskCount}개 남음</span>
        </div>
      </div>
    </button>
  );
}

function WorkspaceTasks({
  workspace,
  onBack,
}: {
  workspace: TaskWorkspace;
  onBack: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      setError("로그인이 필요합니다.");
      return;
    }
    setLoading(true);
    getMyWorkspaceTasks(token, workspace.id)
      .then((list) => {
        setTasks(list);
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "업무를 불러오지 못했습니다."),
      )
      .finally(() => setLoading(false));
  }, [workspace.id]);

  async function handleRefresh() {
    const token = getToken();
    if (!token || refreshing) return;
    setRefreshing(true);
    try {
      setTasks(await getMyWorkspaceTasks(token, workspace.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "새로고침에 실패했습니다.");
    } finally {
      setRefreshing(false);
    }
  }

  // 인라인 변경: 낙관적 갱신 + 실패 시 롤백
  function patchTask(taskId: string, patch: Partial<Task>) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
  }

  async function inlineUpdate(
    task: Task,
    patch: Partial<Task>,
    call: (token: string) => Promise<Task>,
  ) {
    const token = getToken();
    if (!token) return;
    const before = task;
    patchTask(task.id, patch);
    try {
      const updated = await call(token);
      patchTask(task.id, updated);
    } catch (err) {
      patchTask(task.id, before);
      setError(err instanceof Error ? err.message : "변경에 실패했습니다.");
    }
  }

  const handleStatusChange = (task: Task, status: TaskStatus) =>
    inlineUpdate(task, { status }, (token) =>
      updateTaskStatus(token, task.id, status),
    );

  const handlePriorityChange = (task: Task, priority: TaskPriority) =>
    inlineUpdate(task, { priority }, (token) =>
      updateTaskPriority(token, task.id, priority),
    );

  const handleToggleDone = (task: Task) => {
    const next: TaskStatus = task.status === "DONE" ? "TODO" : "DONE";
    handleStatusChange(task, next);
  };

  if (activeTaskId) {
    return (
      <TaskDetail
        taskId={activeTaskId}
        onBack={() => setActiveTaskId(null)}
        onUpdated={(updated) =>
          setTasks((prev) =>
            prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
          )
        }
      />
    );
  }

  const q = query.trim().toLowerCase();
  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      (t.content ?? "").toLowerCase().includes(q)
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
        <span className="text-[12px] text-slate-400">{tasks.length}</span>
        <RefreshButton onClick={handleRefresh} refreshing={refreshing} />
      </PageHeader>

      {/* 검색 + 상태 필터 */}
      {!loading && !error && tasks.length > 0 ? (
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
                  ? tasks.length
                  : tasks.filter((t) => t.status === s).length;
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
                  {s === "ALL" ? "전체" : TASK_STATUS_LABELS[s]} {count}
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
        ) : tasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="text-3xl">📭</span>
            <span className="text-[14px] text-slate-400">이 워크스페이스에 내 업무가 없습니다.</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="text-3xl">🔍</span>
            <span className="text-[14px] text-slate-400">검색 조건에 맞는 업무가 없습니다.</span>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {filteredTasks.map((task) => {
              const due = formatDue(task.dueDate);
              return (
                <li
                  key={task.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-emerald-300"
                >
                  {/* 완료 체크박스 */}
                  <button
                    type="button"
                    onClick={() => handleToggleDone(task)}
                    title={task.status === "DONE" ? "완료 해제" : "완료 처리"}
                    className={
                      "flex size-5 shrink-0 items-center justify-center rounded-md border text-[12px] transition-colors " +
                      (task.status === "DONE"
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 bg-white text-transparent hover:border-emerald-400")
                    }
                  >
                    ✓
                  </button>

                  {/* 제목 + 유형 + 마감일 → 클릭 시 상세 */}
                  <button
                    type="button"
                    onClick={() => setActiveTaskId(task.id)}
                    className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
                  >
                    <span className="flex w-full min-w-0 items-center gap-2">
                      <span
                        className={
                          "min-w-0 truncate text-[14px] font-semibold " +
                          (task.status === "DONE"
                            ? "text-slate-400 line-through"
                            : "text-slate-800")
                        }
                      >
                        {task.title}
                      </span>
                      <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                        {TASK_TYPE_LABELS[task.taskType]}
                      </span>
                    </span>
                    {due ? (
                      <span className="text-[11px] text-slate-400">마감 {due}</span>
                    ) : null}
                  </button>

                  {/* 인라인 컨트롤 */}
                  <Select
                    size="sm"
                    className="shrink-0"
                    value={task.status}
                    onChange={(e) =>
                      handleStatusChange(task, e.target.value as TaskStatus)
                    }
                    title="상태"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {TASK_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                  <Select
                    size="sm"
                    className="shrink-0"
                    value={task.priority}
                    onChange={(e) =>
                      handlePriorityChange(task, e.target.value as TaskPriority)
                    }
                    title="우선순위"
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {TASK_PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </Select>
                  <span
                    className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[12px] font-medium text-slate-500"
                    title="담당자 (변경은 웹에서)"
                  >
                    {task.assigneeName ? `${task.assigneeName}의 업무` : "미지정"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default TodoModule;
