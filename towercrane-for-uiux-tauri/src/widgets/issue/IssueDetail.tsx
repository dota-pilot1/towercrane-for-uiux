import { useEffect, useMemo, useRef, useState } from "react";
import { getToken } from "../../shared/api/client";
import {
  createIssueChecklist,
  createIssueComment,
  deleteIssueAttachment,
  deleteIssueChecklist,
  deleteIssueComment,
  getAssignableUsers,
  getIssue,
  getIssueAttachments,
  getIssueChecklists,
  getIssueComments,
  toggleIssueChecklist,
  updateIssue,
  updateIssueAssignee,
  uploadIssueAttachment,
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUS_LABELS,
  ISSUE_TYPE_LABELS,
  type AssignableUser,
  type ProjectIssue,
  type ProjectIssueAttachment,
  type ProjectIssueChecklist,
  type ProjectIssueComment,
  type ProjectIssuePriority,
  type ProjectIssueStatus,
  type ProjectIssueType,
} from "../../features/issue/api";
import PageHeader from "../../shared/ui/PageHeader";
import Select from "../../shared/ui/Select";
import { toast } from "../../shared/ui/Toast";

type Props = {
  issueId: string;
  onBack: () => void;
  onUpdated?: (issue: ProjectIssue) => void;
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

const STATUS_BADGE: Record<ProjectIssueStatus, string> = {
  OPEN: "bg-sky-50 text-sky-700",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  TESTING: "bg-violet-50 text-violet-700",
  CLOSED: "bg-emerald-500 text-white",
  HOLD: "bg-slate-100 text-slate-500",
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

function IssueDetail({ issueId, onBack, onUpdated }: Props) {
  const [issue, setIssue] = useState<ProjectIssue | null>(null);
  const [checklists, setChecklists] = useState<ProjectIssueChecklist[]>([]);
  const [comments, setComments] = useState<ProjectIssueComment[]>([]);
  const [attachments, setAttachments] = useState<ProjectIssueAttachment[]>([]);
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 편집 폼
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [issueType, setIssueType] = useState<ProjectIssueType>("BUG");
  const [status, setStatus] = useState<ProjectIssueStatus>("OPEN");
  const [priority, setPriority] = useState<ProjectIssuePriority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // 신규 입력
  const [newChecklist, setNewChecklist] = useState("");
  const [newComment, setNewComment] = useState("");

  async function fetchAll(token: string) {
    return Promise.all([
      getIssue(token, issueId),
      getIssueChecklists(token, issueId).catch(() => [] as ProjectIssueChecklist[]),
      getIssueComments(token, issueId).catch(() => [] as ProjectIssueComment[]),
      getIssueAttachments(token, issueId).catch(() => [] as ProjectIssueAttachment[]),
      getAssignableUsers(token).catch(() => [] as AssignableUser[]),
    ]);
  }

  function applyData([i, cl, cm, at, us]: Awaited<ReturnType<typeof fetchAll>>) {
    setIssue(i);
    setChecklists(cl);
    setComments(cm);
    setAttachments(at);
    setUsers(us);
    setTitle(i.title);
    setContent(i.content ?? "");
    setIssueType(i.issueType);
    setStatus(i.status);
    setPriority(i.priority);
    setAssigneeId(i.assigneeId ?? "");
    setDueDate(toDateInput(i.dueDate));
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
        setError(err instanceof Error ? err.message : "이슈를 불러오지 못했습니다."),
      )
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [issueId]);

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
    if (!issue) return false;
    return (
      title !== issue.title ||
      content !== (issue.content ?? "") ||
      issueType !== issue.issueType ||
      status !== issue.status ||
      priority !== issue.priority ||
      assigneeId !== (issue.assigneeId ?? "") ||
      dueDate !== toDateInput(issue.dueDate)
    );
  }, [issue, title, content, issueType, status, priority, assigneeId, dueDate]);

  async function handleSave() {
    const token = getToken();
    if (!token || !issue || saving || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      // 담당자는 전용 엔드포인트(활동 로그 기록)로 분리 처리
      if (assigneeId !== (issue.assigneeId ?? "")) {
        await updateIssueAssignee(token, issue.id, assigneeId || null);
      }
      const updated = await updateIssue(token, issue.id, {
        title: title.trim(),
        content,
        issueType,
        status,
        priority,
        dueDate: dueDate || null,
      });
      applyData(await fetchAll(token));
      onUpdated?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "이슈를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleChecklist(item: ProjectIssueChecklist) {
    const token = getToken();
    if (!token) return;
    setChecklists((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, completed: !c.completed } : c)),
    );
    try {
      const updated = await toggleIssueChecklist(token, issueId, item.id);
      setChecklists((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch {
      setChecklists((prev) =>
        prev.map((c) =>
          c.id === item.id ? { ...c, completed: item.completed } : c,
        ),
      );
    }
  }

  async function handleAddChecklist() {
    const token = getToken();
    if (!token || !newChecklist.trim()) return;
    const text = newChecklist.trim();
    setNewChecklist("");
    try {
      const created = await createIssueChecklist(token, issueId, text);
      setChecklists((prev) => [...prev, created]);
    } catch (err) {
      setNewChecklist(text);
      setError(err instanceof Error ? err.message : "체크리스트를 추가하지 못했습니다.");
    }
  }

  async function handleDeleteChecklist(checklistId: string) {
    const token = getToken();
    if (!token) return;
    const prev = checklists;
    setChecklists((list) => list.filter((c) => c.id !== checklistId));
    try {
      await deleteIssueChecklist(token, issueId, checklistId);
    } catch {
      setChecklists(prev);
    }
  }

  async function handleAddComment() {
    const token = getToken();
    if (!token || !newComment.trim()) return;
    const text = newComment.trim();
    setNewComment("");
    try {
      const created = await createIssueComment(token, issueId, text);
      setComments((prev) => [...prev, created]);
      toast.success("댓글을 등록했습니다.");
    } catch (err) {
      setNewComment(text);
      toast.error(err instanceof Error ? err.message : "댓글을 등록하지 못했습니다.");
    }
  }

  async function handleDeleteComment(commentId: string) {
    const token = getToken();
    if (!token) return;
    const prev = comments;
    setComments((list) => list.filter((c) => c.id !== commentId));
    try {
      await deleteIssueComment(token, issueId, commentId);
    } catch {
      setComments(prev);
    }
  }

  async function handleUploadAttachment(files: FileList | null) {
    const token = getToken();
    if (!token || !files || files.length === 0 || uploading) return;
    setUploading(true);
    try {
      let count = 0;
      for (const file of Array.from(files)) {
        const created = await uploadIssueAttachment(token, issueId, file);
        setAttachments((prev) => [...prev, created]);
        count += 1;
      }
      toast.success(
        count > 1 ? `첨부 ${count}개를 업로드했습니다.` : "첨부를 업로드했습니다.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "첨부 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    const token = getToken();
    if (!token) return;
    const prev = attachments;
    setAttachments((list) => list.filter((a) => a.id !== attachmentId));
    try {
      await deleteIssueAttachment(token, issueId, attachmentId);
    } catch {
      setAttachments(prev);
    }
  }

  const doneCount = checklists.filter((c) => c.completed).length;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader>
        <button
          onClick={onBack}
          className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200"
          title="목록으로"
        >
          ←
        </button>
        <span className="text-[14px] font-bold tracking-tight text-slate-900 truncate">
          이슈 상세
        </span>
        {issue ? (
          <span
            className={
              "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold " +
              STATUS_BADGE[status]
            }
          >
            {ISSUE_STATUS_LABELS[status]}
          </span>
        ) : null}
        {issue ? (
          <button
            data-actions
            onClick={handleRefresh}
            disabled={refreshing}
            title="새로고침"
            className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-50"
          >
            <span className={refreshing ? "inline-block animate-spin" : ""}>↻</span>
          </button>
        ) : null}
      </PageHeader>

      <div className="flex-1 overflow-y-auto bg-slate-50 px-5 py-5">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[14px] text-slate-400">
            불러오는 중…
          </div>
        ) : error && !issue ? (
          <div className="flex h-full items-center justify-center text-[14px] text-red-600">
            {error}
          </div>
        ) : issue ? (
          <div className="mx-auto w-full max-w-6xl">
            {error ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              {/* ── 왼쪽: 기본 정보 ── */}
              <div className="flex flex-col gap-4 lg:col-span-2">
                <Section icon="📝" title="기본 정보" desc="제목, 내용, 진행 상태·담당자를 관리합니다.">
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
                      placeholder="이슈 내용을 입력하세요."
                      className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[14px] leading-relaxed text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </label>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Field label="유형">
                      <Select
                        block
                        value={issueType}
                        onChange={(e) =>
                          setIssueType(e.target.value as ProjectIssueType)
                        }
                      >
                        {TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {ISSUE_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="상태">
                      <Select
                        block
                        value={status}
                        onChange={(e) =>
                          setStatus(e.target.value as ProjectIssueStatus)
                        }
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {ISSUE_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="우선순위">
                      <Select
                        block
                        value={priority}
                        onChange={(e) =>
                          setPriority(e.target.value as ProjectIssuePriority)
                        }
                      >
                        {PRIORITY_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {ISSUE_PRIORITY_LABELS[p]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="담당자">
                      <Select
                        block
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                      >
                        <option value="">미지정</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </Select>
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

                <div className="px-1 text-[12px] text-slate-400">
                  작성자 {issue.reporterName ?? "-"} · 등록 {formatTime(issue.createdAt)}
                </div>
              </div>

              {/* ── 오른쪽: 체크리스트 + 댓글 ── */}
              <div className="flex flex-col gap-4 lg:col-span-3">
                <Section
                  icon="✅"
                  title="체크리스트"
                  trailing={
                    checklists.length > 0 ? (
                      <span className="text-[12px] font-bold text-slate-400">
                        {doneCount}/{checklists.length}
                      </span>
                    ) : null
                  }
                >
                  {checklists.length > 0 ? (
                    <ul className="mb-2 flex flex-col gap-1.5">
                      {checklists.map((item) => (
                        <li
                          key={item.id}
                          className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleChecklist(item)}
                            className={
                              "flex size-5 shrink-0 items-center justify-center rounded-md border text-[12px] " +
                              (item.completed
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-slate-300 bg-white text-transparent hover:border-emerald-400")
                            }
                          >
                            ✓
                          </button>
                          <span
                            className={
                              "flex-1 text-[14px] " +
                              (item.completed
                                ? "text-slate-400 line-through"
                                : "text-slate-800")
                            }
                          >
                            {item.content}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteChecklist(item.id)}
                            className="shrink-0 rounded-md px-1.5 py-1 text-[12px] text-slate-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                            title="삭제"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="flex gap-2">
                    <input
                      value={newChecklist}
                      onChange={(e) => setNewChecklist(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddChecklist()}
                      placeholder="체크리스트 항목 추가"
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddChecklist}
                      disabled={!newChecklist.trim()}
                      className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-[13px] font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                    >
                      추가
                    </button>
                  </div>
                </Section>

                <Section
                  icon="📎"
                  title="첨부"
                  trailing={
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-[12px] font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                    >
                      {uploading ? "업로드 중…" : "첨부 추가"}
                    </button>
                  }
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleUploadAttachment(e.target.files)}
                  />
                  {attachments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-[13px] text-slate-400">
                      첨부된 파일이 없습니다.
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {attachments.map((a) => {
                        const isImage = a.contentType.startsWith("image/");
                        return (
                          <li
                            key={a.id}
                            className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2"
                          >
                            {isImage ? (
                              <img
                                src={a.fileUrl}
                                alt={a.fileName}
                                className="size-10 shrink-0 rounded-md object-cover"
                              />
                            ) : (
                              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-slate-200 text-[16px]">
                                📄
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-bold text-slate-700">
                                {a.fileName}
                              </span>
                              <span className="block text-[11px] text-slate-400">
                                {formatTime(a.createdAt)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(a.id)}
                              className="shrink-0 rounded-md px-1.5 py-1 text-[12px] text-slate-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                              title="삭제"
                            >
                              ✕
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Section>

                <Section icon="💬" title={`댓글 ${comments.length}`}>
                  {comments.length > 0 ? (
                    <ul className="mb-3 flex flex-col gap-2.5">
                      {comments.map((c) => (
                        <li
                          key={c.id}
                          className="group rounded-lg bg-slate-50 px-3 py-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] font-bold text-slate-700">
                              {c.userName ?? "사용자"}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400">
                                {formatTime(c.createdAt)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(c.id)}
                                className="rounded-md px-1 text-[11px] text-slate-300 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                                title="삭제"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-[14px] text-slate-700">
                            {c.content}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mb-3 rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center text-[13px] text-slate-400">
                      첫 댓글을 남겨보세요.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                      placeholder="댓글 입력"
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="shrink-0 rounded-lg bg-emerald-500 px-3 py-2 text-[13px] font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
                    >
                      등록
                    </button>
                  </div>
                </Section>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 하단 저장 바 */}
      {issue ? (
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
          <span className="text-[12px] text-slate-400">
            {dirty ? "저장하지 않은 변경사항이 있습니다." : "변경사항 없음"}
          </span>
          <button
            onClick={handleSave}
            disabled={!dirty || saving || !title.trim()}
            className="rounded-lg bg-emerald-500 px-5 py-2 text-[14px] font-bold text-white hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </footer>
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

export default IssueDetail;
