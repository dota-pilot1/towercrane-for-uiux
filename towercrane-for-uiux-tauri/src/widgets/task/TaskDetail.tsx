import { useEffect, useMemo, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { RefreshCw } from "lucide-react";
import { getToken } from "../../shared/api/client";
import {
  createReference,
  deleteReference,
  getAttachments,
  getChecklists,
  getComments,
  getReferences,
  getTask,
  toggleChecklist,
  updateTask,
  TASK_PRIORITY_LABELS,
  TASK_REFERENCE_TYPE_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  type Task,
  type TaskAttachment,
  type TaskChecklist,
  type TaskComment,
  type TaskPriority,
  type TaskReference,
  type TaskReferenceType,
  type TaskStatus,
  type TaskType,
} from "../../features/task/api";
import PageHeader from "../../shared/ui/PageHeader";
import Select from "../../shared/ui/Select";
import { Button } from "../../shared/ui/button";

type Props = {
  taskId: string;
  onBack: () => void;
  onUpdated?: (task: Task) => void;
};

const STATUS_OPTIONS: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "HOLD"];
const PRIORITY_OPTIONS: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const TYPE_OPTIONS: TaskType[] = [
  "FEATURE",
  "BUG",
  "DOCS",
  "DESIGN",
  "REFACTOR",
  "QA",
  "CHORE",
];
const REFERENCE_TYPE_OPTIONS: TaskReferenceType[] = ["FIGMA", "DOC", "GITHUB", "URL"];

const STATUS_BADGE: Record<TaskStatus, string> = {
  TODO: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-emerald-50 text-emerald-700",
  REVIEW: "bg-sky-50 text-sky-700",
  DONE: "bg-emerald-500 text-white",
  HOLD: "bg-amber-50 text-amber-700",
};

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[14px] text-slate-800 outline-none focus:border-emerald-500 focus:bg-white";

function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function formatTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatSize(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

function inferReferenceType(url: string): TaskReferenceType {
  const u = url.toLowerCase();
  if (u.includes("figma.com")) return "FIGMA";
  if (u.includes("github.com")) return "GITHUB";
  return "URL";
}

function TaskDetail({ taskId, onBack, onUpdated }: Props) {
  const [task, setTask] = useState<Task | null>(null);
  const [checklists, setChecklists] = useState<TaskChecklist[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [references, setReferences] = useState<TaskReference[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 편집 폼
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("FEATURE");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // 참고 링크 추가 폼 (다이얼로그)
  const [refModalOpen, setRefModalOpen] = useState(false);
  const [refType, setRefType] = useState<TaskReferenceType>("FIGMA");
  const [refTitle, setRefTitle] = useState("");
  const [refUrl, setRefUrl] = useState("");
  const [addingRef, setAddingRef] = useState(false);

  async function fetchAll(token: string) {
    return Promise.all([
      getTask(token, taskId),
      getChecklists(token, taskId).catch(() => [] as TaskChecklist[]),
      getComments(token, taskId).catch(() => [] as TaskComment[]),
      getReferences(token, taskId).catch(() => [] as TaskReference[]),
      getAttachments(token, taskId).catch(() => [] as TaskAttachment[]),
    ]);
  }

  function applyData(
    [t, cl, cm, refs, atts]: Awaited<ReturnType<typeof fetchAll>>,
  ) {
    setTask(t);
    setChecklists(cl);
    setComments(cm);
    setReferences(refs);
    setAttachments(atts);
    setTitle(t.title);
    setContent(t.content ?? "");
    setTaskType(t.taskType);
    setStatus(t.status);
    setPriority(t.priority);
    setDueDate(toDateInput(t.dueDate));
    setError(null);
  }

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      setError("로그인이 필요합니다.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchAll(token)
      .then((data) => {
        if (!cancelled) applyData(data);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "업무를 불러오지 못했습니다."),
      )
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  async function handleRefresh() {
    const token = getToken();
    if (!token || refreshing) return;
    setRefreshing(true);
    try {
      applyData(await fetchAll(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "새로고침에 실패했습니다.");
    } finally {
      setRefreshing(false);
    }
  }

  const dirty = useMemo(() => {
    if (!task) return false;
    return (
      title !== task.title ||
      content !== (task.content ?? "") ||
      taskType !== task.taskType ||
      status !== task.status ||
      priority !== task.priority ||
      dueDate !== toDateInput(task.dueDate)
    );
  }, [task, title, content, taskType, status, priority, dueDate]);

  async function handleSave() {
    const token = getToken();
    if (!token || !task || saving || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateTask(token, task.id, {
        title: title.trim(),
        content,
        taskType,
        status,
        priority,
        dueDate: dueDate || null,
      });
      setTask(updated);
      onUpdated?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업무를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleChecklist(item: TaskChecklist) {
    const token = getToken();
    if (!token || !task) return;
    setChecklists((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, completed: !c.completed } : c)),
    );
    try {
      const updated = await toggleChecklist(token, task.id, item.id);
      setChecklists((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch {
      setChecklists((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, completed: item.completed } : c)),
      );
    }
  }

  async function handleAddReference() {
    const token = getToken();
    if (!token || !task || addingRef || !refUrl.trim()) return;
    setAddingRef(true);
    try {
      const created = await createReference(token, task.id, {
        referenceType: refType,
        title: refTitle.trim() || refUrl.trim(),
        url: refUrl.trim(),
      });
      setReferences((prev) => [...prev, created]);
      setRefTitle("");
      setRefUrl("");
      setRefType("FIGMA");
      setRefModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "참고 링크를 추가하지 못했습니다.");
    } finally {
      setAddingRef(false);
    }
  }

  async function handleDeleteReference(referenceId: string) {
    const token = getToken();
    if (!token || !task) return;
    const prev = references;
    setReferences((list) => list.filter((r) => r.id !== referenceId));
    try {
      await deleteReference(token, task.id, referenceId);
    } catch {
      setReferences(prev);
    }
  }

  async function openExternal(url: string) {
    try {
      await openUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "링크를 열지 못했습니다.");
    }
  }

  function openRefModal() {
    setRefTitle("");
    setRefUrl("");
    setRefType("FIGMA");
    setRefModalOpen(true);
  }

  const doneCount = checklists.filter((c) => c.completed).length;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader>
        <button
          onClick={onBack}
          className="flex size-7 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-strong"
          title="목록으로"
        >
          ←
        </button>
        <span className="text-[14px] font-bold tracking-tight text-text-primary truncate">
          업무 상세
        </span>
        {task ? (
          <span
            className={
              "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold " +
              STATUS_BADGE[status]
            }
          >
            {TASK_STATUS_LABELS[status]}
          </span>
        ) : null}
        {task ? (
          <button
            data-actions
            onClick={handleRefresh}
            disabled={refreshing}
            title="새로고침"
            className="flex size-7 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-strong disabled:opacity-50"
          >
            <RefreshCw className={"size-3.5" + (refreshing ? " animate-spin" : "")} strokeWidth={2} />
          </button>
        ) : null}
      </PageHeader>

      <div className="flex-1 overflow-y-auto bg-slate-50 px-5 py-5">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[14px] text-slate-400">
            불러오는 중…
          </div>
        ) : error && !task ? (
          <div className="flex h-full items-center justify-center text-[14px] text-red-600">
            {error}
          </div>
        ) : task ? (
          <div className="mx-auto w-full max-w-6xl">
            {error ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              {/* ── 왼쪽: 기본 정보 + 체크리스트 + 댓글 ── */}
              <div className="flex flex-col gap-4 lg:col-span-3">
                <Section icon="📝" title="기본 정보" desc="제목, 내용, 진행 상태를 관리합니다. (담당자 배정은 웹에서)">
                  <label className="block">
                    <FieldLabel>제목</FieldLabel>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={200}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[15px] font-bold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </label>

                  <label className="mt-4 block">
                    <FieldLabel>내용</FieldLabel>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={7}
                      placeholder="업무 내용을 입력하세요."
                      className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[14px] leading-relaxed text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </label>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Field label="유형">
                      <Select
                        block
                        value={taskType}
                        onChange={(e) => setTaskType(e.target.value as TaskType)}
                      >
                        {TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {TASK_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="상태">
                      <Select
                        block
                        value={status}
                        onChange={(e) => setStatus(e.target.value as TaskStatus)}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {TASK_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="우선순위">
                      <Select
                        block
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as TaskPriority)}
                      >
                        {PRIORITY_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {TASK_PRIORITY_LABELS[p]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="담당자">
                      <div
                        className="flex h-[42px] items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-[14px] text-slate-500"
                        title="담당자 변경은 웹에서 관리자가 합니다."
                      >
                        {task.assigneeName ? `${task.assigneeName}의 업무` : "미지정"}
                      </div>
                    </Field>
                    <Field label="마감일">
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className={FIELD_CLASS}
                      />
                    </Field>
                  </div>
                </Section>

                {checklists.length > 0 ? (
                  <Section
                    icon="✅"
                    title="체크리스트"
                    trailing={
                      <span className="text-[12px] font-bold text-slate-400">
                        {doneCount}/{checklists.length}
                      </span>
                    }
                  >
                    <ul className="flex flex-col gap-1.5">
                      {checklists.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => handleToggleChecklist(item)}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-muted"
                          >
                            <span
                              className={
                                "flex size-5 shrink-0 items-center justify-center rounded-md border text-[12px] " +
                                (item.completed
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-slate-300 bg-white text-transparent")
                              }
                            >
                              ✓
                            </span>
                            <span
                              className={
                                "text-[14px] " +
                                (item.completed
                                  ? "text-slate-400 line-through"
                                  : "text-slate-800")
                              }
                            >
                              {item.content}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Section>
                ) : null}

                {comments.length > 0 ? (
                  <Section icon="💬" title={`댓글 ${comments.length}`}>
                    <ul className="flex flex-col gap-2.5">
                      {comments.map((c) => (
                        <li key={c.id} className="rounded-lg bg-slate-50 px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] font-bold text-slate-700">
                              {c.userName ?? "사용자"}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {formatTime(c.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-[14px] text-slate-700">
                            {c.content}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Section>
                ) : null}

                <div className="px-1 text-[12px] text-slate-400">
                  작성자 {task.reporterName ?? "-"} · 등록 {formatTime(task.createdAt)}
                </div>
              </div>

              {/* ── 오른쪽: 참고 링크 + 첨부 ── */}
              <div className="flex flex-col gap-4 lg:col-span-2">
                <Section
                  icon="🔗"
                  title="참고 링크"
                  desc="Figma, 문서, GitHub 링크를 업무에 연결합니다."
                  trailing={
                    <Button
                      size="sm"
                      className="h-auto shrink-0 px-3 py-1.5 text-[12px]"
                      onClick={openRefModal}
                    >
                      + 링크 추가
                    </Button>
                  }
                >
                  {references.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-[13px] text-slate-400">
                      연결된 참고 링크가 없습니다.
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {references.map((ref) => (
                        <li
                          key={ref.id}
                          className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                        >
                          <span className="shrink-0 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">
                            {TASK_REFERENCE_TYPE_LABELS[ref.referenceType]}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-semibold text-slate-800">
                              {ref.title}
                            </div>
                            <div className="truncate text-[11px] text-slate-400">
                              {ref.url}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => openExternal(ref.url)}
                            className="shrink-0 rounded-md px-1.5 py-1 text-[13px] text-text-muted hover:bg-brand-glass hover:text-brand-primary"
                            title="브라우저로 열기"
                          >
                            ↗
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReference(ref.id)}
                            className="shrink-0 rounded-md px-1.5 py-1 text-[12px] text-text-muted hover:bg-danger-glass hover:text-destructive"
                            title="삭제"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>

                <Section
                  icon="📎"
                  title="첨부"
                  desc="업무에 연결된 이미지·문서입니다."
                >
                  {attachments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-[13px] text-slate-400">
                      첨부된 파일이 없습니다.
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {attachments.map((att) => (
                        <li
                          key={att.id}
                          className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                        >
                          <span className="shrink-0 text-[16px]">📄</span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-semibold text-slate-800">
                              {att.fileName}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {formatSize(att.fileSize)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-2 px-1 text-[11px] text-slate-400">
                    파일 추가·다운로드는 웹에서 가능합니다.
                  </p>
                </Section>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 하단 저장 바 */}
      {task ? (
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
          <span className="text-[12px] text-slate-400">
            {dirty ? "저장하지 않은 변경사항이 있습니다." : "변경사항 없음"}
          </span>
          <Button
            className="h-auto px-5 py-2 text-[14px]"
            onClick={handleSave}
            disabled={!dirty || saving || !title.trim()}
          >
            {saving ? "저장 중…" : "저장"}
          </Button>
        </footer>
      ) : null}

      {/* 참고 링크 추가 다이얼로그 */}
      {refModalOpen ? (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/30 px-6"
          onClick={() => setRefModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[min(560px,calc(100vw-3rem))] max-w-full rounded-2xl bg-white p-7 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-slate-900">참고 링크 추가</h2>
            <p className="mt-1 text-[13px] text-slate-400">
              Figma, 문서, GitHub 링크를 업무에 연결합니다.
            </p>

            <div className="mt-5 flex flex-col gap-4">
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-500">
                  타입
                  <Select
                    block
                    value={refType}
                    onChange={(e) => setRefType(e.target.value as TaskReferenceType)}
                  >
                    {REFERENCE_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {TASK_REFERENCE_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-500">
                  제목 (선택)
                  <input
                    autoFocus
                    value={refTitle}
                    onChange={(e) => setRefTitle(e.target.value)}
                    placeholder="예: 모바일 홈 화면 Figma"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-500">
                URL
                <input
                  value={refUrl}
                  onChange={(e) => {
                    setRefUrl(e.target.value);
                    if (e.target.value) setRefType(inferReferenceType(e.target.value));
                  }}
                  placeholder="https://www.figma.com/..."
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="secondary"
                className="h-auto px-4 py-2 text-[13px]"
                onClick={() => setRefModalOpen(false)}
              >
                취소
              </Button>
              <Button
                className="h-auto px-4 py-2 text-[13px]"
                onClick={handleAddReference}
                disabled={!refUrl.trim() || addingRef}
              >
                {addingRef ? "추가 중…" : "추가"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Section({
  icon,
  title,
  desc,
  trailing,
  children,
}: {
  icon: string;
  title: string;
  desc?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[15px]">
            {icon}
          </span>
          <div>
            <h3 className="text-[14px] font-bold text-slate-900">{title}</h3>
            {desc ? <p className="mt-0.5 text-[12px] text-slate-400">{desc}</p> : null}
          </div>
        </div>
        {trailing}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
      {children}
    </span>
  );
}

export default TaskDetail;
