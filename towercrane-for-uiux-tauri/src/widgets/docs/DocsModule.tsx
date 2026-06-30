import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getToken } from "../../shared/api/client";
import {
  createDocDocument,
  createDocFolder,
  deleteDocNode,
  getDocNode,
  getDocTree,
  reorderDocNodes,
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
  const [previewMode, setPreviewMode] = useState<"fit" | "full">("fit");
  const [dragOver, setDragOver] = useState(false);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    node: TeamDocNode;
    confirmDelete?: boolean;
  } | null>(null);
  const [dropHint, setDropHint] = useState<{
    id: string;
    kind: "into" | "before" | "after";
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadParentRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

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

  // 생성 시작 시 대상 폴더를 펼쳐 인라인 입력이 보이게
  useEffect(() => {
    if (creating && targetParentId) {
      setExpanded((prev) =>
        prev.has(targetParentId) ? prev : new Set(prev).add(targetParentId),
      );
    }
  }, [creating, targetParentId]);

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

  const nodeById = useMemo(() => {
    const map = new Map<string, TeamDocNode>();
    for (const n of nodes) map.set(n.id, n);
    return map;
  }, [nodes]);

  function ancestorsOf(node: TeamDocNode): TeamDocNode[] {
    const chain: TeamDocNode[] = [];
    const guard = new Set<string>();
    let pid = node.parentId;
    while (pid && !guard.has(pid)) {
      guard.add(pid);
      const parent = nodeById.get(pid);
      if (!parent) break;
      chain.unshift(parent);
      pid = parent.parentId;
    }
    return chain;
  }

  function Breadcrumb({ node }: { node: TeamDocNode }) {
    return (
      <div className="mb-2 flex flex-wrap items-center gap-1 text-[12px] text-slate-400">
        <button onClick={() => setSelectedId(null)} className="hover:text-slate-600">
          최상위
        </button>
        {ancestorsOf(node).map((a) => (
          <span key={a.id} className="flex items-center gap-1">
            <span>/</span>
            <button
              onClick={() => setSelectedId(a.id)}
              className="hover:text-emerald-600"
            >
              {a.title}
            </button>
          </span>
        ))}
        <span>/</span>
        <span className="font-bold text-slate-600">{node.title}</span>
      </div>
    );
  }

  const visibleIds = useMemo(() => {
    const ids: string[] = [];
    const walk = (parentId: string | null) => {
      for (const child of childrenOf.get(parentId) ?? []) {
        ids.push(child.id);
        if (child.type === "FOLDER" && expanded.has(child.id)) walk(child.id);
      }
    };
    walk(null);
    return ids;
  }, [childrenOf, expanded]);

  // 동작 판정.
  // - 폴더: 같은 레벨 순서변경만 (포함관계 변경 불가 → 다른 레벨 대상엔 null)
  // - 파일/문서: 폴더 위면 '안으로', 파일/문서 위면 위/아래 순서변경
  function kindFor(
    activeNode: TeamDocNode,
    overNode: TeamDocNode,
  ): "into" | "before" | "after" | null {
    const ai = visibleIds.indexOf(activeNode.id);
    const oi = visibleIds.indexOf(overNode.id);
    const beside = ai >= 0 && oi >= 0 && ai < oi ? "after" : "before";
    if (activeNode.type === "FOLDER") {
      return overNode.parentId === activeNode.parentId ? beside : null;
    }
    if (overNode.type === "FOLDER") return "into";
    return beside;
  }

  async function moveInto(node: TeamDocNode, newParentId: string | null) {
    const token = getToken();
    if (!token || newParentId === node.parentId || newParentId === node.id)
      return;
    try {
      await updateDocNode(token, node.id, { parentId: newParentId });
      if (newParentId) setExpanded((prev) => new Set(prev).add(newParentId));
      await loadTree();
      toast.success("이동했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "이동하지 못했습니다.");
    }
  }

  // 표시된 삽입선 자리(over의 위/아래)로 active 를 넣는다. 다른 폴더면 부모 변경까지.
  async function placeBeside(
    active: TeamDocNode,
    over: TeamDocNode,
    before: boolean,
  ) {
    const token = getToken();
    if (!token) return;
    const parentId = over.parentId;
    try {
      if (active.parentId !== parentId) {
        await updateDocNode(token, active.id, { parentId });
      }
      const siblings = (childrenOf.get(parentId) ?? []).filter(
        (n) => n.id !== active.id,
      );
      const overIndex = siblings.findIndex((n) => n.id === over.id);
      if (overIndex < 0) return;
      const insertAt = before ? overIndex : overIndex + 1;
      const ordered = [
        ...siblings.slice(0, insertAt),
        active,
        ...siblings.slice(insertAt),
      ];
      await reorderDocNodes(
        token,
        parentId,
        ordered.map((n, i) => ({ id: n.id, orderIdx: i })),
      );
      if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
      await loadTree();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "이동하지 못했습니다.");
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    const activeNode = nodeById.get(String(active.id));
    const overNode = over ? nodeById.get(String(over.id)) : null;
    if (!activeNode || !overNode || active.id === over?.id) {
      setDropHint(null);
      return;
    }
    const kind = kindFor(activeNode, overNode);
    setDropHint(kind ? { id: overNode.id, kind } : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const hint = dropHint;
    setDropHint(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeNode = nodeById.get(String(active.id));
    const overNode = nodeById.get(String(over.id));
    if (!activeNode || !overNode) return;
    const kind =
      hint && hint.id === overNode.id ? hint.kind : kindFor(activeNode, overNode);
    if (!kind) return;
    if (kind === "into") {
      void moveInto(activeNode, overNode.id);
      return;
    }
    void placeBeside(activeNode, overNode, kind === "before");
  }

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
    const parentId = uploadParentRef.current ?? targetParentId;
    uploadParentRef.current = null;
    setUploading(true);
    try {
      let last: TeamDocNode | null = null;
      for (const file of Array.from(files)) {
        last = await uploadDocFile(token, parentId, file);
      }
      if (parentId) {
        setExpanded((prev) => new Set(prev).add(parentId));
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

  function renderCreateRow(depth: number): ReactNode {
    return (
      <div
        key="__create__"
        style={{ paddingLeft: depth * 14 + 10 }}
        className="flex items-center gap-2 py-1 pr-2"
      >
        <span className="shrink-0 text-[14px]">
          {creating === "FOLDER" ? "📁" : "📝"}
        </span>
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
          onBlur={() => {
            if (!newName.trim()) {
              setCreating(null);
              setNewName("");
            }
          }}
          placeholder={creating === "FOLDER" ? "새 폴더 이름" : "새 문서 제목"}
          className="min-w-0 flex-1 rounded-md border border-emerald-400 bg-white px-2 py-1 text-[13px] text-slate-800 outline-none"
        />
      </div>
    );
  }

  function renderTree(parentId: string | null, depth: number): ReactNode[] {
    const children = childrenOf.get(parentId) ?? [];
    const rows: ReactNode[] = [];
    for (const node of children) {
      const isOpen = expanded.has(node.id);
      rows.push(
        <SortableRow
          key={node.id}
          node={node}
          depth={depth}
          open={isOpen}
          selected={selectedId === node.id}
          hint={dropHint?.id === node.id ? dropHint.kind : null}
          onClick={() => onRowClick(node)}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenu({ x: e.clientX, y: e.clientY, node });
          }}
        />,
      );
      if (node.type === "FOLDER" && isOpen) {
        rows.push(...renderTree(node.id, depth + 1));
      }
    }
    if (creating && targetParentId === parentId) {
      rows.push(renderCreateRow(depth));
    }
    return rows;
  }

  const targetLabel = selected
    ? selected.type === "FOLDER"
      ? `'${selected.title}' 안에`
      : "같은 폴더에"
    : "최상위에";

  return (
    <div
      className="relative flex min-w-0 flex-1 flex-col"
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragOver) setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setDragOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleUpload(e.dataTransfer.files);
      }}
    >
      {dragOver ? (
        <div className="pointer-events-none absolute inset-0 z-50 m-3 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/80">
          <span className="text-3xl">⬆️</span>
          <span className="text-[15px] font-bold text-emerald-700">
            여기에 놓으면 {targetLabel} 업로드
          </span>
        </div>
      ) : null}
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

          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            {loading ? (
              <p className="px-3 py-4 text-[13px] text-slate-400">불러오는 중…</p>
            ) : nodes.length === 0 && !creating ? (
              <p className="px-3 py-4 text-[13px] text-slate-400">
                아직 문서가 없습니다. 폴더나 문서를 만들어보세요.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setDropHint(null)}
              >
                <SortableContext
                  items={visibleIds}
                  strategy={verticalListSortingStrategy}
                >
                  {renderTree(null, 0)}
                </SortableContext>
              </DndContext>
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
              <Breadcrumb node={selected} />
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
              <Breadcrumb node={selected} />
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="min-w-0 flex-1 truncate text-[18px] font-black text-slate-900">
                  {selected.title}
                </h2>
                <div className="flex shrink-0 items-center gap-2">
                  {selected.contentType?.startsWith("image/") ? (
                    <div className="flex overflow-hidden rounded-lg border border-slate-200">
                      {(["fit", "full"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setPreviewMode(mode)}
                          className={
                            "px-2.5 py-1 text-[12px] font-bold " +
                            (previewMode === mode
                              ? "bg-emerald-500 text-white"
                              : "bg-white text-slate-500 hover:bg-slate-50")
                          }
                        >
                          {mode === "fit" ? "축소" : "원본"}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <DeleteButton
                    confirm={confirmDelete}
                    onClick={() => {
                      if (confirmDelete) handleDelete(selected);
                      else setConfirmDelete(true);
                    }}
                  />
                </div>
              </div>
              {selected.contentType?.startsWith("image/") ? (
                <div className="flex justify-center rounded-xl border border-slate-200 bg-white p-3">
                  <img
                    src={selected.fileUrl ?? ""}
                    alt={selected.title}
                    className={
                      "rounded-lg object-contain " +
                      (previewMode === "fit"
                        ? "max-h-[42vh] max-w-md"
                        : "max-h-[78vh] w-full")
                    }
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[22px]">
                    📄
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-slate-700">
                    {selected.fileName}
                  </span>
                </div>
              )}
              <p className="mt-3 text-[12px] text-slate-400">
                {selected.createdByName ?? "-"} · {formatTime(selected.createdAt)} 업로드
              </p>
            </div>
          ) : (
            // FOLDER
            <div className="mx-auto w-full max-w-3xl p-6">
              <Breadcrumb node={selected} />
              <div className="mb-3 flex items-center justify-between gap-3">
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
              <p className="mb-3 text-[12px] text-slate-400">
                폴더를 우클릭하면 하위 폴더·문서·파일을 추가할 수 있어요.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(childrenOf.get(selected.id) ?? []).map((child) => (
                  <button
                    key={child.id}
                    onClick={() => onRowClick(child)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setMenu({ x: e.clientX, y: e.clientY, node: child });
                    }}
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
                    빈 폴더입니다. 트리에서 이 폴더를 우클릭해 추가하세요.
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>

      {menu ? (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu(null);
            }}
          />
          <div
            className="fixed z-[61] min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-2xl"
            style={{ left: menu.x, top: menu.y }}
          >
            {menu.node.type === "FOLDER" ? (
              <>
                <ContextItem
                  onClick={() => {
                    setSelectedId(menu.node.id);
                    setCreating("FOLDER");
                    setNewName("");
                    setMenu(null);
                  }}
                >
                  📁 하위 폴더 추가
                </ContextItem>
                <ContextItem
                  onClick={() => {
                    setSelectedId(menu.node.id);
                    setCreating("DOC");
                    setNewName("");
                    setMenu(null);
                  }}
                >
                  📝 문서 추가
                </ContextItem>
                <ContextItem
                  onClick={() => {
                    uploadParentRef.current = menu.node.id;
                    setMenu(null);
                    fileInputRef.current?.click();
                  }}
                >
                  ⬆️ 파일 업로드
                </ContextItem>
                <div className="my-1 h-px bg-slate-100" />
              </>
            ) : null}
            <ContextItem
              danger
              onClick={() => {
                if (menu.confirmDelete) {
                  const target = menu.node;
                  setMenu(null);
                  handleDelete(target);
                } else {
                  setMenu({ ...menu, confirmDelete: true });
                }
              }}
            >
              {menu.confirmDelete ? "정말 삭제할까요?" : "🗑 삭제"}
            </ContextItem>
          </div>
        </>
      ) : null}
    </div>
  );
}

function SortableRow({
  node,
  depth,
  open,
  selected,
  hint,
  onClick,
  onContextMenu,
}: {
  node: TeamDocNode;
  depth: number;
  open: boolean;
  selected: boolean;
  hint: "into" | "before" | "after" | null;
  onClick: () => void;
  onContextMenu: (e: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });
  return (
    <div
      ref={setNodeRef}
      className="relative"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : undefined,
      }}
    >
      {hint === "before" ? (
        <div className="pointer-events-none absolute inset-x-1 -top-px z-10 h-0.5 rounded-full bg-emerald-500" />
      ) : null}
      <button
        {...attributes}
        {...listeners}
        onClick={onClick}
        onContextMenu={onContextMenu}
        style={{ paddingLeft: depth * 14 + 10 }}
        className={
          "flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-left text-[13px] " +
          (hint === "into"
            ? "bg-emerald-50 text-emerald-700 ring-2 ring-inset ring-emerald-400"
            : selected
              ? "bg-emerald-50 font-bold text-emerald-700"
              : "text-slate-700 hover:bg-slate-100")
        }
      >
        <span className="shrink-0 text-[14px]">{nodeIcon(node, open)}</span>
        <span className="truncate">{node.title}</span>
      </button>
      {hint === "after" ? (
        <div className="pointer-events-none absolute inset-x-1 -bottom-px z-10 h-0.5 rounded-full bg-emerald-500" />
      ) : null}
    </div>
  );
}

function ContextItem({
  danger,
  onClick,
  children,
}: {
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex w-full items-center px-3.5 py-2 text-left text-[13px] font-medium " +
        (danger
          ? "text-red-600 hover:bg-red-50"
          : "text-slate-700 hover:bg-slate-100")
      }
    >
      {children}
    </button>
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
