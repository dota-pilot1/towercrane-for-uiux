import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getToken } from "../../shared/api/client";
import {
  createDocDocument,
  createDocFolder,
  deleteDocNode,
  getDocNode,
  getDocTree,
  updateDocNode,
  uploadDocFile,
  type TeamDocNode,
} from "../../features/docs/api";
import PageHeader from "../../shared/ui/PageHeader";
import { toast } from "../../shared/ui/Toast";

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

function nodeIcon(node: TeamDocNode, open: boolean) {
  if (node.type === "FOLDER") return open ? "📂" : "📁";
  if (node.type === "DOC") return "📝";
  return "📎";
}

function DocsModule() {
  const [nodes, setNodes] = useState<TeamDocNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<TeamDocNode | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState<null | "FOLDER" | "DOC">(null);
  const [newName, setNewName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadTree() {
    const token = getToken();
    if (!token) {
      setLoading(false);
      setError("로그인이 필요합니다.");
      return;
    }
    try {
      setNodes(await getDocTree(token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "문서를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTree();
  }, []);

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  // 새 항목을 만들 위치: 폴더 선택 시 그 안, 문서/파일 선택 시 같은 폴더, 없으면 루트
  const targetParentId = selected
    ? selected.type === "FOLDER"
      ? selected.id
      : selected.parentId
    : null;

  // 선택 변경 시 삭제 확인 초기화
  useEffect(() => {
    setConfirmDelete(false);
  }, [selectedId]);

  // DOC 선택 시 본문 로드
  useEffect(() => {
    const token = getToken();
    if (!token || !selected || selected.type !== "DOC") {
      setDetail(null);
      return;
    }
    let cancelled = false;
    getDocNode(token, selected.id)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setDraftTitle(d.title);
        setDraftContent(d.content ?? "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, TeamDocNode[]>();
    for (const n of nodes) {
      const arr = map.get(n.parentId) ?? [];
      arr.push(n);
      map.set(n.parentId, arr);
    }
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          a.orderIdx - b.orderIdx || a.createdAt.localeCompare(b.createdAt),
      );
    }
    return map;
  }, [nodes]);

  function onRowClick(node: TeamDocNode) {
    setSelectedId(node.id);
    if (node.type === "FOLDER") {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    }
  }

  async function handleCreate() {
    const token = getToken();
    const kind = creating;
    if (!token || !kind || !newName.trim()) return;
    const name = newName.trim();
    try {
      const created =
        kind === "FOLDER"
          ? await createDocFolder(token, targetParentId, name)
          : await createDocDocument(token, targetParentId, name);
      setCreating(null);
      setNewName("");
      if (targetParentId) {
        setExpanded((prev) => new Set(prev).add(targetParentId));
      }
      await loadTree();
      setSelectedId(created.id);
      toast.success(kind === "FOLDER" ? "폴더를 만들었습니다." : "문서를 만들었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "만들지 못했습니다.");
    }
  }

  async function handleUpload(files: FileList | null) {
    const token = getToken();
    if (!token || !files || files.length === 0 || uploading) return;
    setUploading(true);
    try {
      let last: TeamDocNode | null = null;
      for (const file of Array.from(files)) {
        last = await uploadDocFile(token, targetParentId, file);
      }
      if (targetParentId) {
        setExpanded((prev) => new Set(prev).add(targetParentId));
      }
      await loadTree();
      if (last) setSelectedId(last.id);
      toast.success("파일을 업로드했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    const token = getToken();
    if (!token || !detail || saving || !draftTitle.trim()) return;
    setSaving(true);
    try {
      const updated = await updateDocNode(token, detail.id, {
        title: draftTitle.trim(),
        content: draftContent,
      });
      setDetail(updated);
      setNodes((prev) =>
        prev.map((n) =>
          n.id === updated.id
            ? { ...n, title: updated.title, updatedAt: updated.updatedAt }
            : n,
        ),
      );
      toast.success("저장했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(node: TeamDocNode) {
    const token = getToken();
    if (!token) return;
    try {
      await deleteDocNode(token, node.id);
      if (selectedId === node.id) {
        setSelectedId(null);
        setDetail(null);
      }
      await loadTree();
      toast.success("삭제했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제하지 못했습니다.");
    }
  }

  const docDirty =
    !!detail &&
    (draftTitle !== detail.title || draftContent !== (detail.content ?? ""));

  function renderTree(parentId: string | null, depth: number): ReactNode[] {
    const children = childrenOf.get(parentId) ?? [];
    return children.flatMap((node) => {
      const isOpen = expanded.has(node.id);
      const row = (
        <button
          key={node.id}
          onClick={() => onRowClick(node)}
          style={{ paddingLeft: depth * 14 + 10 }}
          className={
            "flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-left text-[13px] " +
            (selectedId === node.id
              ? "bg-emerald-50 font-bold text-emerald-700"
              : "text-slate-700 hover:bg-slate-100")
          }
        >
          <span className="shrink-0 text-[14px]">{nodeIcon(node, isOpen)}</span>
          <span className="truncate">{node.title}</span>
        </button>
      );
      if (node.type === "FOLDER" && isOpen) {
        return [row, ...renderTree(node.id, depth + 1)];
      }
      return [row];
    });
  }

  const targetLabel = selected
    ? selected.type === "FOLDER"
      ? `'${selected.title}' 안에`
      : "같은 폴더에"
    : "최상위에";

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader>
        <span className="text-[14px] font-bold tracking-tight text-slate-900">
          문서
        </span>
        <button
          data-actions
          onClick={() => void loadTree()}
          title="새로고침"
          className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200"
        >
          ↻
        </button>
      </PageHeader>

      <div className="flex-1 flex min-h-0">
        {/* 왼쪽: 트리 */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-2.5">
            <button
              onClick={() => {
                setCreating("FOLDER");
                setNewName("");
              }}
              className="flex-1 rounded-lg bg-slate-100 px-2 py-1.5 text-[12px] font-bold text-slate-600 hover:bg-slate-200"
            >
              + 폴더
            </button>
            <button
              onClick={() => {
                setCreating("DOC");
                setNewName("");
              }}
              className="flex-1 rounded-lg bg-slate-100 px-2 py-1.5 text-[12px] font-bold text-slate-600 hover:bg-slate-200"
            >
              + 문서
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-1 rounded-lg bg-emerald-500 px-2 py-1.5 text-[12px] font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {uploading ? "업로드 중…" : "⬆ 업로드"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
          </div>

          {creating ? (
            <div className="border-b border-slate-100 px-3 py-2">
              <p className="mb-1 text-[11px] text-slate-400">
                {targetLabel} 새 {creating === "FOLDER" ? "폴더" : "문서"}
              </p>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") {
                    setCreating(null);
                    setNewName("");
                  }
                }}
                placeholder="이름 입력 후 Enter"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[13px] text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            {loading ? (
              <p className="px-3 py-4 text-[13px] text-slate-400">불러오는 중…</p>
            ) : nodes.length === 0 ? (
              <p className="px-3 py-4 text-[13px] text-slate-400">
                아직 문서가 없습니다. 폴더나 문서를 만들어보세요.
              </p>
            ) : (
              renderTree(null, 0)
            )}
          </div>
        </aside>

        {/* 오른쪽: 본문 */}
        <section className="min-w-0 flex-1 overflow-y-auto bg-slate-50">
          {error ? (
            <div className="m-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
              {error}
            </div>
          ) : null}

          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <span className="text-4xl">📄</span>
              <span className="text-[14px] text-slate-400">
                왼쪽에서 문서를 선택하거나 새로 만드세요.
              </span>
            </div>
          ) : selected.type === "DOC" ? (
            <div className="mx-auto w-full max-w-3xl p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 py-1 text-[20px] font-black text-slate-900 outline-none hover:border-slate-200 focus:border-emerald-500 focus:bg-white"
                />
                <DeleteButton
                  confirm={confirmDelete}
                  onClick={() => {
                    if (confirmDelete) handleDelete(selected);
                    else setConfirmDelete(true);
                  }}
                />
              </div>
              <textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder="내용을 입력하세요. (마크다운)"
                className="min-h-[420px] w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] leading-relaxed text-slate-800 outline-none focus:border-emerald-500"
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[12px] text-slate-400">
                  {detail
                    ? `${detail.updatedByName ?? "-"} · ${formatTime(detail.updatedAt)} 수정`
                    : "불러오는 중…"}
                </span>
                <button
                  onClick={handleSave}
                  disabled={!docDirty || saving || !draftTitle.trim()}
                  className="rounded-lg bg-emerald-500 px-5 py-2 text-[14px] font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {saving ? "저장 중…" : "저장"}
                </button>
              </div>
            </div>
          ) : selected.type === "FILE" ? (
            <div className="mx-auto w-full max-w-3xl p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="truncate text-[18px] font-black text-slate-900">
                  {selected.title}
                </h2>
                <DeleteButton
                  confirm={confirmDelete}
                  onClick={() => {
                    if (confirmDelete) handleDelete(selected);
                    else setConfirmDelete(true);
                  }}
                />
              </div>
              {selected.contentType?.startsWith("image/") ? (
                <img
                  src={selected.fileUrl ?? ""}
                  alt={selected.title}
                  className="max-h-[60vh] w-full rounded-xl border border-slate-200 bg-white object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white py-16 text-slate-400">
                  <span className="text-4xl">📎</span>
                  <span className="text-[14px]">{selected.fileName}</span>
                </div>
              )}
              <p className="mt-3 text-[12px] text-slate-400">
                {selected.createdByName ?? "-"} · {formatTime(selected.createdAt)} 업로드
              </p>
            </div>
          ) : (
            // FOLDER
            <div className="mx-auto w-full max-w-3xl p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="truncate text-[18px] font-black text-slate-900">
                  📂 {selected.title}
                </h2>
                <DeleteButton
                  confirm={confirmDelete}
                  label="폴더 삭제"
                  onClick={() => {
                    if (confirmDelete) handleDelete(selected);
                    else setConfirmDelete(true);
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(childrenOf.get(selected.id) ?? []).map((child) => (
                  <button
                    key={child.id}
                    onClick={() => onRowClick(child)}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-[13px] text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <span className="shrink-0 text-[16px]">
                      {nodeIcon(child, false)}
                    </span>
                    <span className="truncate">{child.title}</span>
                  </button>
                ))}
                {(childrenOf.get(selected.id) ?? []).length === 0 ? (
                  <p className="col-span-full py-8 text-center text-[13px] text-slate-400">
                    빈 폴더입니다. 위의 + 폴더 / + 문서 / 업로드로 채워보세요.
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DeleteButton({
  confirm,
  label = "삭제",
  onClick,
}: {
  confirm: boolean;
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-bold " +
        (confirm
          ? "bg-red-500 text-white hover:bg-red-600"
          : "bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600")
      }
    >
      {confirm ? "정말 삭제?" : label}
    </button>
  );
}

export default DocsModule;
