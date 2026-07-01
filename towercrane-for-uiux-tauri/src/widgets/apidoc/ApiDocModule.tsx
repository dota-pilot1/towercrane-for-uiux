import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Check,
  Download,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import PageHeader from "../../shared/ui/PageHeader";
import { toast } from "../../shared/ui/Toast";
import ApiTesterPanel from "./ApiTesterPanel";
import EnvironmentDialog from "./EnvironmentDialog";
import {
  useApiDocBlocks,
  useApiDocCategories,
  useApiDocEndpoints,
  useApiDocTeams,
  useCreateApiDocCategory,
  useCreateApiDocEndpoint,
  useCreateApiDocTeam,
  useDeleteApiDocCategory,
  useDeleteApiDocEndpoint,
  useDeleteApiDocTeam,
  useExportApiDoc,
  useImportApiDoc,
  useReorderApiDocCategories,
  useReorderApiDocEndpoints,
  useReplaceApiDocBlocks,
  useUpdateApiDocCategory,
  useUpdateApiDocEndpoint,
} from "../../features/api-doc/use-api-doc-queries";
import type {
  ApiDocCategory,
  ApiDocEndpoint,
  ApiDocTeam,
  HttpMethod,
} from "../../features/api-doc/types";
import type { ApiDocImportExportFile } from "../../features/api-doc/import-export-types";

const METHOD_BADGE: Record<HttpMethod, string> = {
  GET: "bg-emerald-100 text-emerald-700",
  POST: "bg-sky-100 text-sky-700",
  PUT: "bg-amber-100 text-amber-700",
  PATCH: "bg-purple-100 text-purple-700",
  DELETE: "bg-red-100 text-red-600",
};

const ADD_INPUT_CLASS =
  "w-full min-w-0 rounded-md border border-emerald-400 bg-white px-2 py-1.5 text-[13px] text-slate-800 outline-none";

function IconBtn({
  onClick,
  title,
  children,
  tone = "default",
  disabled,
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
  tone?: "default" | "brand" | "danger";
  disabled?: boolean;
}) {
  const toneClass =
    tone === "brand"
      ? "text-emerald-600 hover:bg-emerald-50"
      : tone === "danger"
        ? "text-slate-400 hover:bg-red-50 hover:text-red-600"
        : "text-slate-500 hover:bg-slate-100";
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={
        "flex size-7 shrink-0 items-center justify-center rounded-md disabled:opacity-40 " +
        toneClass
      }
    >
      {children}
    </button>
  );
}

function SortableRow({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: (handleProps: Record<string, unknown>) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
      }}
    >
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

function ApiDocModule({ isAdmin }: { isAdmin: boolean }) {
  const [teamId, setTeamId] = useState<string | null>(null);
  const teamsQuery = useApiDocTeams();
  const teams = teamsQuery.data ?? [];
  const team = teamId ? teams.find((t) => t.id === teamId) ?? null : null;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader>
        <span className="text-[14px] font-bold tracking-tight text-slate-900">
          Postman
        </span>
        {team ? (
          <button
            data-actions
            onClick={() => setTeamId(null)}
            title="워크스페이스 목록"
            className="flex items-center gap-1 rounded-lg bg-slate-200 px-2.5 h-7 text-[12px] font-bold text-slate-600 hover:bg-slate-300"
          >
            <ArrowLeft className="size-3.5" /> 워크스페이스
          </button>
        ) : null}
        <button
          data-actions
          onClick={() => void teamsQuery.refetch()}
          title="새로고침"
          className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200"
        >
          ↻
        </button>
        {team && isAdmin ? <ImportExportActions /> : null}
      </PageHeader>

      {!team ? (
        <WorkspaceHome
          teams={teams}
          loading={teamsQuery.isLoading}
          isAdmin={isAdmin}
          onOpen={setTeamId}
        />
      ) : (
        <Workbench team={team} isAdmin={isAdmin} />
      )}
    </div>
  );
}

function ImportExportActions() {
  const inputRef = useRef<HTMLInputElement>(null);
  const exportMutation = useExportApiDoc();
  const importMutation = useImportApiDoc();
  const busy = exportMutation.isPending || importMutation.isPending;

  const handleExport = async () => {
    try {
      const data = await exportMutation.mutateAsync();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `api-spec-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("API Spec JSON을 내보냈습니다.");
    } catch {
      // onError 토스트 처리됨
    }
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ApiDocImportExportFile;
      if (!window.confirm("이 스펙을 기존 목록에 추가할까요?")) return;
      await importMutation.mutateAsync(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "JSON 파일을 읽지 못했습니다.");
    }
  };

  return (
    <div data-actions className="flex items-center gap-1.5">
      <button
        onClick={handleExport}
        disabled={busy}
        className="flex h-7 items-center gap-1 rounded-lg bg-slate-200 px-2.5 text-[12px] font-bold text-slate-600 hover:bg-slate-300 disabled:opacity-50"
      >
        {exportMutation.isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Download className="size-3.5" />
        )}
        내보내기
      </button>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex h-7 items-center gap-1 rounded-lg bg-emerald-500 px-2.5 text-[12px] font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
      >
        {importMutation.isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Upload className="size-3.5" />
        )}
        가져오기
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}

function WorkspaceHome({
  teams,
  loading,
  isAdmin,
  onOpen,
}: {
  teams: ApiDocTeam[];
  loading: boolean;
  isAdmin: boolean;
  onOpen: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const createTeam = useCreateApiDocTeam();
  const deleteTeam = useDeleteApiDocTeam();

  const submitAdd = () => {
    const name = newName.trim();
    if (!name) {
      setAdding(false);
      return;
    }
    createTeam.mutate(
      { name, description: newDesc.trim() || null, icon: "FileJson", emoji: null },
      {
        onSuccess: (team) => {
          setNewName("");
          setNewDesc("");
          setAdding(false);
          onOpen(team.id);
        },
      },
    );
  };

  const handleDelete = (team: ApiDocTeam) => {
    if (!window.confirm(`'${team.name}' 워크스페이스를 삭제할까요? (컬렉션·요청 모두 삭제)`))
      return;
    deleteTeam.mutate(team.id);
  };

  return (
    <div className="min-w-0 flex-1 overflow-y-auto bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-8 py-7">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              Postman Workspaces
            </div>
            <h2 className="mt-0.5 text-[19px] font-black text-slate-900">
              팀별 API 요청 공간
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-400">
              워크스페이스를 선택하면 해당 팀의 컬렉션과 요청을 관리합니다.
            </p>
          </div>
          {isAdmin ? (
            <button
              onClick={() => {
                setAdding(true);
                setNewName("");
                setNewDesc("");
              }}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-[13px] font-bold text-white hover:bg-emerald-600"
            >
              <Plus className="size-4" /> 워크스페이스 추가
            </button>
          ) : null}
        </div>

        {adding ? (
          <div className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] md:items-end">
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-slate-500">이름</span>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) submitAdd();
                  if (e.key === "Escape") setAdding(false);
                }}
                placeholder="예: AI 서비스 포털 팀"
                className={ADD_INPUT_CLASS}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold text-slate-500">설명</span>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) submitAdd();
                  if (e.key === "Escape") setAdding(false);
                }}
                placeholder="워크스페이스 용도"
                className={ADD_INPUT_CLASS}
              />
            </label>
            <div className="flex justify-end gap-2">
              <IconBtn onClick={() => setAdding(false)} title="취소">
                <X className="size-4" />
              </IconBtn>
              <IconBtn onClick={submitAdd} title="추가" tone="brand">
                <Check className="size-4" />
              </IconBtn>
            </div>
          </div>
        ) : null}

        {loading ? (
          <p className="py-10 text-center text-[13px] text-slate-400">불러오는 중…</p>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-16 text-center">
            <span className="text-3xl opacity-60">🧪</span>
            <p className="text-[13px] text-slate-400">
              {isAdmin ? "워크스페이스를 추가하세요." : "접근 가능한 워크스페이스가 없습니다."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="group relative flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
              >
                {isAdmin ? (
                  <button
                    onClick={() => handleDelete(team)}
                    title="워크스페이스 삭제"
                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-md text-slate-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
                <button
                  onClick={() => onOpen(team.id)}
                  className="flex flex-col gap-3 text-left"
                >
                  <div className="flex items-start justify-between">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-[20px]">
                      {team.emoji ?? "📦"}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                      WORKSPACE
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-black text-slate-800 group-hover:text-emerald-700">
                      {team.name}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[12px] text-slate-400">
                      {team.description || "팀 API 요청 컬렉션"}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-3 border-t border-slate-100 pt-2.5 text-[11px] font-medium text-slate-400">
                    <span>컬렉션 {team.categoryCount ?? 0}</span>
                    <span>·</span>
                    <span>요청 {team.endpointCount ?? 0}</span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Workbench({ team, isAdmin }: { team: ApiDocTeam; isAdmin: boolean }) {
  const categoriesQuery = useApiDocCategories(team.id);
  const categories = categoriesQuery.data ?? [];
  const [requestedCategoryId, setRequestedCategoryId] = useState<string | null>(null);
  const categoryId = useMemo(() => {
    if (categories.length === 0) return null;
    if (requestedCategoryId && categories.some((c) => c.id === requestedCategoryId))
      return requestedCategoryId;
    return categories[0].id;
  }, [categories, requestedCategoryId]);

  const endpointsQuery = useApiDocEndpoints(categoryId);
  const endpoints = endpointsQuery.data ?? [];
  const [requestedEndpointId, setRequestedEndpointId] = useState<string | null>(null);
  const endpointId = useMemo(() => {
    if (endpoints.length === 0) return null;
    if (requestedEndpointId && endpoints.some((e) => e.id === requestedEndpointId))
      return requestedEndpointId;
    return endpoints[0].id;
  }, [endpoints, requestedEndpointId]);

  const blocksQuery = useApiDocBlocks(endpointId);
  const replaceBlocks = useReplaceApiDocBlocks(endpointId);
  const updateEndpoint = useUpdateApiDocEndpoint(categoryId);
  const [envOpen, setEnvOpen] = useState(false);

  const endpoint = endpoints.find((e) => e.id === endpointId) ?? null;

  return (
    <div className="flex-1 flex min-h-0">
      <CategorySidebar
        teamId={team.id}
        categories={categories}
        activeId={categoryId}
        isAdmin={isAdmin}
        isLoading={categoriesQuery.isLoading}
        onSelect={(id) => {
          setRequestedCategoryId(id);
          setRequestedEndpointId(null);
        }}
      />
      <EndpointSidebar
        categoryId={categoryId}
        endpoints={endpoints}
        activeId={endpointId}
        isAdmin={isAdmin}
        isLoading={endpointsQuery.isLoading}
        onSelect={setRequestedEndpointId}
      />
      <section className="min-w-0 flex-1">
        <ApiTesterPanel
          endpoint={endpoint}
          blocks={blocksQuery.data ?? []}
          isAdmin={isAdmin}
          isBlocksLoading={blocksQuery.isLoading}
          isSaving={replaceBlocks.isPending}
          onSave={(content) => {
            replaceBlocks.mutate(content);
            // 사이드바 배지가 실제 요청 메서드와 일치하도록 동기화
            if (endpoint && content.method !== endpoint.method) {
              updateEndpoint.mutate({ id: endpoint.id, body: { method: content.method } });
            }
          }}
          onOpenEnv={() => setEnvOpen(true)}
        />
      </section>

      {envOpen ? <EnvironmentDialog onClose={() => setEnvOpen(false)} /> : null}
    </div>
  );
}

function CategorySidebar({
  teamId,
  categories,
  activeId,
  isAdmin,
  isLoading,
  onSelect,
}: {
  teamId: string;
  categories: ApiDocCategory[];
  activeId: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  onSelect: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const createM = useCreateApiDocCategory(teamId);
  const updateM = useUpdateApiDocCategory(teamId);
  const deleteM = useDeleteApiDocCategory(teamId);
  const reorderM = useReorderApiDocCategories(teamId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const submitAdd = () => {
    const name = newName.trim();
    if (!name) {
      setAdding(false);
      return;
    }
    createM.mutate(
      { teamId, name, icon: "Folder", emoji: null },
      {
        onSuccess: (category) => {
          setNewName("");
          setAdding(false);
          onSelect(category.id);
        },
      },
    );
  };

  const submitRename = (id: string) => {
    const name = editingName.trim();
    if (!name) {
      setEditingId(null);
      return;
    }
    updateM.mutate({ id, body: { name } }, { onSuccess: () => setEditingId(null) });
  };

  const handleDelete = (c: ApiDocCategory) => {
    if (!window.confirm(`'${c.name}' 컬렉션을 삭제할까요?`)) return;
    deleteM.mutate(c.id);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(categories, oldIndex, newIndex);
    reorderM.mutate(reordered.map((c, i) => ({ id: c.id, orderIdx: i })));
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-100 px-3">
        <div>
          <p className="text-[13px] font-black text-slate-800">컬렉션</p>
          <p className="text-[10px] text-slate-400">{categories.length} items</p>
        </div>
        {isAdmin ? (
          <IconBtn
            onClick={() => {
              setAdding(true);
              setNewName("");
            }}
            title="컬렉션 추가"
            tone="brand"
          >
            <Plus className="size-4" />
          </IconBtn>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {adding ? (
          <div className="mb-2 rounded-md border border-emerald-300 bg-emerald-50 p-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) submitAdd();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="새 컬렉션"
              className={ADD_INPUT_CLASS}
            />
            <div className="mt-1.5 flex justify-end gap-1">
              <IconBtn onClick={() => setAdding(false)} title="취소">
                <X className="size-3.5" />
              </IconBtn>
              <IconBtn onClick={submitAdd} title="추가" tone="brand">
                <Check className="size-3.5" />
              </IconBtn>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <p className="px-3 py-6 text-center text-[12px] text-slate-400">불러오는 중…</p>
        ) : categories.length === 0 ? (
          <p className="px-3 py-8 text-center text-[12px] text-slate-400">
            {isAdmin ? "컬렉션을 추가하세요." : "컬렉션이 없습니다."}
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={categories.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0.5">
                {categories.map((c) => (
                  <SortableRow key={c.id} id={c.id} disabled={!isAdmin}>
                    {(handleProps) => (
                      <div
                        className={
                          "group flex h-8 items-center gap-1 rounded-md px-1.5 " +
                          (activeId === c.id
                            ? "bg-emerald-50 text-emerald-700"
                            : "hover:bg-slate-100")
                        }
                      >
                        {isAdmin ? (
                          <button
                            {...handleProps}
                            title="드래그"
                            className="flex size-4 shrink-0 cursor-grab items-center justify-center text-slate-300 opacity-40 group-hover:opacity-100"
                          >
                            <GripVertical className="size-3" />
                          </button>
                        ) : null}
                        {editingId === c.id ? (
                          <input
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.nativeEvent.isComposing)
                                submitRename(c.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="h-7 min-w-0 flex-1 rounded-md border border-emerald-400 bg-white px-1.5 text-[13px] text-slate-800 outline-none"
                          />
                        ) : (
                          <button
                            onClick={() => onSelect(c.id)}
                            title={c.name}
                            className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold"
                          >
                            {c.name}
                          </button>
                        )}
                        {isAdmin ? (
                          <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
                            {editingId === c.id ? (
                              <IconBtn onClick={() => submitRename(c.id)} title="저장" tone="brand">
                                <Check className="size-3.5" />
                              </IconBtn>
                            ) : (
                              <IconBtn
                                onClick={() => {
                                  setEditingId(c.id);
                                  setEditingName(c.name);
                                }}
                                title="수정"
                              >
                                <Pencil className="size-3.5" />
                              </IconBtn>
                            )}
                            <IconBtn onClick={() => handleDelete(c)} title="삭제" tone="danger">
                              <Trash2 className="size-3.5" />
                            </IconBtn>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </aside>
  );
}

function EndpointSidebar({
  categoryId,
  endpoints,
  activeId,
  isAdmin,
  isLoading,
  onSelect,
}: {
  categoryId: string | null;
  endpoints: ApiDocEndpoint[];
  activeId: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  onSelect: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const createM = useCreateApiDocEndpoint(categoryId);
  const updateM = useUpdateApiDocEndpoint(categoryId);
  const deleteM = useDeleteApiDocEndpoint(categoryId);
  const reorderM = useReorderApiDocEndpoints(categoryId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const submitAdd = () => {
    if (!categoryId) return;
    const title = newTitle.trim();
    if (!title) {
      setAdding(false);
      return;
    }
    createM.mutate(
      { categoryId, title, method: "GET", path: "" },
      {
        onSuccess: (endpoint) => {
          setNewTitle("");
          setAdding(false);
          onSelect(endpoint.id);
        },
      },
    );
  };

  const submitRename = (id: string) => {
    const title = editingTitle.trim();
    if (!title) {
      setEditingId(null);
      return;
    }
    updateM.mutate({ id, body: { title } }, { onSuccess: () => setEditingId(null) });
  };

  const handleDelete = (e: ApiDocEndpoint) => {
    if (!window.confirm(`'${e.title}' 요청을 삭제할까요?`)) return;
    deleteM.mutate(e.id);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = endpoints.findIndex((x) => x.id === active.id);
    const newIndex = endpoints.findIndex((x) => x.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(endpoints, oldIndex, newIndex);
    reorderM.mutate(reordered.map((x, i) => ({ id: x.id, orderIdx: i })));
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-100 px-3">
        <div>
          <p className="text-[13px] font-black text-slate-800">요청</p>
          <p className="text-[10px] text-slate-400">{endpoints.length} items</p>
        </div>
        {isAdmin ? (
          <IconBtn
            onClick={() => setAdding(true)}
            title="요청 추가"
            tone="brand"
            disabled={!categoryId}
          >
            <Plus className="size-4" />
          </IconBtn>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {adding && categoryId ? (
          <div className="mb-2 rounded-md border border-emerald-300 bg-emerald-50 p-2">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) submitAdd();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="요청 이름"
              className={ADD_INPUT_CLASS}
            />
            <div className="mt-1.5 flex justify-end gap-1">
              <IconBtn onClick={() => setAdding(false)} title="취소">
                <X className="size-3.5" />
              </IconBtn>
              <IconBtn onClick={submitAdd} title="추가" tone="brand">
                <Check className="size-3.5" />
              </IconBtn>
            </div>
          </div>
        ) : null}

        {!categoryId ? (
          <p className="px-3 py-8 text-center text-[12px] text-slate-400">
            컬렉션을 먼저 선택하세요.
          </p>
        ) : isLoading ? (
          <p className="px-3 py-6 text-center text-[12px] text-slate-400">불러오는 중…</p>
        ) : endpoints.length === 0 ? (
          <p className="px-3 py-8 text-center text-[12px] text-slate-400">
            {isAdmin ? "요청을 추가하세요." : "요청이 없습니다."}
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={endpoints.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0.5">
                {endpoints.map((endpoint) => (
                  <SortableRow key={endpoint.id} id={endpoint.id} disabled={!isAdmin}>
                    {(handleProps) => (
                      <div
                        className={
                          "group flex h-8 items-center gap-1 rounded-md px-1.5 " +
                          (activeId === endpoint.id
                            ? "bg-emerald-50"
                            : "hover:bg-slate-100")
                        }
                      >
                        {editingId === endpoint.id ? (
                          <input
                            autoFocus
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.nativeEvent.isComposing)
                                submitRename(endpoint.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="h-7 min-w-0 flex-1 rounded-md border border-emerald-400 bg-white px-1.5 text-[13px] text-slate-800 outline-none"
                          />
                        ) : (
                          <>
                            {isAdmin ? (
                              <button
                                {...handleProps}
                                title="드래그"
                                className="flex size-4 shrink-0 cursor-grab items-center justify-center text-slate-300 opacity-40 group-hover:opacity-100"
                              >
                                <GripVertical className="size-3" />
                              </button>
                            ) : null}
                            <button
                              onClick={() => onSelect(endpoint.id)}
                              title={endpoint.title}
                              className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left"
                            >
                              <span
                                className={
                                  "shrink-0 rounded px-1 py-0.5 font-mono text-[9px] font-black " +
                                  METHOD_BADGE[endpoint.method]
                                }
                              >
                                {endpoint.method}
                              </span>
                              <span className="truncate text-[12px] font-semibold text-slate-700">
                                {endpoint.title}
                              </span>
                            </button>
                            {isAdmin ? (
                              <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
                                <IconBtn
                                  onClick={() => {
                                    setEditingId(endpoint.id);
                                    setEditingTitle(endpoint.title);
                                  }}
                                  title="수정"
                                >
                                  <Pencil className="size-3.5" />
                                </IconBtn>
                                <IconBtn
                                  onClick={() => handleDelete(endpoint)}
                                  title="삭제"
                                  tone="danger"
                                >
                                  <Trash2 className="size-3.5" />
                                </IconBtn>
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    )}
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </aside>
  );
}

export default ApiDocModule;
