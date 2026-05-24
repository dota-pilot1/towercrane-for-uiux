import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Check,
  FileJson,
  GripVertical,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import type {
  ApiDocCategory,
  ApiDocEndpoint,
  ApiDocTeam,
  ApiEnvironment,
  ApiEnvironmentVariable,
} from "../../../entities/api-doc/model/types";
import { Button } from "../../../shared/ui/button";
import { useSessionStore } from "../../../shared/store/session-store";
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
  useReorderApiDocCategories,
  useReorderApiDocEndpoints,
  useReplaceApiDocBlocks,
  useUpdateApiDocCategory,
  useUpdateApiDocEndpoint,
} from "../../../features/api-doc/model/use-api-doc-queries";
import { useApiEnvStore } from "../../../features/api-doc/model/api-env-store";
import { ApiDocImportExportActions } from "../../../features/api-doc/ui/api-doc-import-export-actions";
import { ApiTesterPanel } from "../../../features/api-doc/ui/api-tester-panel";
import { cn } from "../../../shared/lib/utils";

const EMPTY_CATEGORIES: ApiDocCategory[] = [];
const EMPTY_ENDPOINTS: ApiDocEndpoint[] = [];
const EMPTY_TEAMS: ApiDocTeam[] = [];
const SIDEBAR_ITEM_CLASS =
  "group flex h-8 items-center gap-1.5 rounded-sm px-2 transition-colors";
const SIDEBAR_DRAG_HANDLE_CLASS =
  "flex size-4 shrink-0 cursor-grab items-center justify-center text-text-muted opacity-40 transition-opacity group-hover:opacity-100";
const SIDEBAR_TEXT_BUTTON_CLASS =
  "flex min-w-0 flex-1 items-center truncate text-left text-xs font-semibold leading-none text-text-primary";
const SIDEBAR_ACTIONS_CLASS =
  "flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100";

const METHOD_COLOR: Record<string, string> = {
  GET: "text-[oklch(0.46_0.15_155)] bg-[color-mix(in_srgb,oklch(0.46_0.15_155)_12%,transparent)]",
  POST: "text-[oklch(0.5_0.15_255)] bg-[color-mix(in_srgb,oklch(0.5_0.15_255)_12%,transparent)]",
  PUT: "text-[oklch(0.55_0.14_75)] bg-[color-mix(in_srgb,oklch(0.55_0.14_75)_12%,transparent)]",
  PATCH:
    "text-[oklch(0.52_0.16_300)] bg-[color-mix(in_srgb,oklch(0.52_0.16_300)_12%,transparent)]",
  DELETE: "text-destructive bg-[var(--color-danger-glass)]",
};

function SortableItem({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: (dragHandleProps: Record<string, unknown>) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
  });

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

export function ApiDocPage() {
  const userRole = useSessionStore((state) => state.userRole);
  const isAdmin = userRole === "admin";
  const teamsQuery = useApiDocTeams();
  const teams = teamsQuery.data ?? EMPTY_TEAMS;
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const selectedTeam = useMemo(() => {
    if (!selectedTeamId) return null;
    return teams.find((team) => team.id === selectedTeamId) ?? null;
  }, [selectedTeamId, teams]);

  if (!selectedTeam) {
    return (
      <ApiWorkspaceHome
        teams={teams}
        isAdmin={isAdmin}
        isLoading={teamsQuery.isLoading}
        onOpenWorkspace={setSelectedTeamId}
      />
    );
  }

  return (
    <ApiDocWorkbench
      team={selectedTeam}
      isAdmin={isAdmin}
      onBack={() => setSelectedTeamId(null)}
    />
  );
}

function ApiDocWorkbench({
  team,
  isAdmin,
  onBack,
}: {
  team: ApiDocTeam;
  isAdmin: boolean;
  onBack: () => void;
}) {
  const categoriesQuery = useApiDocCategories(team.id);
  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;
  const [requestedCategoryId, setRequestedCategoryId] = useState<string | null>(
    null,
  );
  const selectedCategoryId = useMemo(() => {
    if (categories.length === 0) return null;
    if (
      requestedCategoryId &&
      categories.some((category) => category.id === requestedCategoryId)
    ) {
      return requestedCategoryId;
    }
    return categories[0].id;
  }, [categories, requestedCategoryId]);
  const endpointsQuery = useApiDocEndpoints(selectedCategoryId);
  const endpoints = endpointsQuery.data ?? EMPTY_ENDPOINTS;
  const [requestedEndpointId, setRequestedEndpointId] = useState<string | null>(
    null,
  );
  const selectedEndpointId = useMemo(() => {
    if (endpoints.length === 0) return null;
    if (
      requestedEndpointId &&
      endpoints.some((endpoint) => endpoint.id === requestedEndpointId)
    ) {
      return requestedEndpointId;
    }
    return endpoints[0].id;
  }, [endpoints, requestedEndpointId]);
  const blocksQuery = useApiDocBlocks(selectedEndpointId);
  const replaceBlocksMutation = useReplaceApiDocBlocks(selectedEndpointId);
  const [envModalOpen, setEnvModalOpen] = useState(false);

  const selectedEndpoint = useMemo(
    () =>
      endpoints.find((endpoint) => endpoint.id === selectedEndpointId) ?? null,
    [endpoints, selectedEndpointId],
  );

  return (
    <section className="ui-page-bg pb-8">
      <div className="grid h-[calc(100vh-10rem)] min-h-[680px] grid-cols-1 gap-3 lg:grid-cols-[300px_300px_minmax(0,1fr)] lg:grid-rows-[52px_minmax(0,1fr)]">
        <div className="flex min-h-12 items-center justify-between gap-3 overflow-hidden rounded-md border border-surface-border-soft bg-surface-muted px-4 py-2 shadow-sm lg:col-start-3 lg:row-start-1">
          <div className="flex min-w-0 items-center gap-2.5">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-9 shrink-0 gap-1.5 px-3 text-xs font-black"
              onClick={onBack}
              aria-label="워크스페이스 목록"
              title="워크스페이스 목록"
            >
              <ArrowLeft className="size-4" />
              워크스페이스
            </Button>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
              <FileJson className="size-4" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-black leading-tight text-text-primary">
                {team.name}
              </h2>
              <p className="truncate text-[11px] leading-tight text-text-muted">
                Postman Lite
              </p>
            </div>
          </div>
          <ApiDocImportExportActions isAdmin={isAdmin} />
        </div>

        <CategorySidebar
          className="lg:col-start-1 lg:row-span-2 lg:row-start-1"
          teamId={team.id}
          categories={categories}
          activeId={selectedCategoryId}
          isAdmin={isAdmin}
          isLoading={categoriesQuery.isLoading}
          onSelect={(id) => {
            setRequestedCategoryId(id);
            setRequestedEndpointId(null);
          }}
        />
        <EndpointSidebar
          className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
          categoryId={selectedCategoryId}
          endpoints={endpoints}
          activeId={selectedEndpointId}
          isAdmin={isAdmin}
          isLoading={endpointsQuery.isLoading}
          onSelect={setRequestedEndpointId}
        />
        <ApiTesterPanel
          className="lg:col-start-3 lg:row-start-2"
          endpoint={selectedEndpoint}
          blocks={blocksQuery.data ?? []}
          isAdmin={isAdmin}
          isBlocksLoading={blocksQuery.isLoading}
          isSaving={replaceBlocksMutation.isPending}
          onSave={(content) => replaceBlocksMutation.mutate(content)}
          onOpenEnv={() => setEnvModalOpen(true)}
        />
      </div>

      {envModalOpen ? (
        <EnvironmentDialog
          key="api-env-dialog"
          onClose={() => setEnvModalOpen(false)}
        />
      ) : null}
    </section>
  );
}

function ApiWorkspaceHome({
  teams,
  isAdmin,
  isLoading,
  onOpenWorkspace,
}: {
  teams: ApiDocTeam[];
  isAdmin: boolean;
  isLoading: boolean;
  onOpenWorkspace: (teamId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const createTeamMutation = useCreateApiDocTeam();

  const submitAdd = () => {
    const name = newName.trim();
    if (!name) {
      setAdding(false);
      return;
    }
    createTeamMutation.mutate(
      {
        name,
        description: newDescription.trim() || null,
        icon: "FileJson",
        emoji: null,
      },
      {
        onSuccess: (team) => {
          setNewName("");
          setNewDescription("");
          setAdding(false);
          onOpenWorkspace(team.id);
        },
      },
    );
  };

  return (
    <section className="ui-page-bg min-h-[calc(100vh-8rem)] pb-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-1 sm:px-2">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-surface-border-soft bg-surface-muted px-5 py-4 shadow-sm">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-brand-primary">
              Postman Workspaces
            </p>
            <h2 className="mt-1 text-2xl font-black leading-tight text-text-primary">
              팀별 API 요청 공간
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              워크스페이스를 선택하면 해당 팀의 컬렉션과 요청을 관리합니다.
            </p>
          </div>
          {isAdmin ? (
            <Button
              type="button"
              size="sm"
              tone="brand"
              onClick={() => setAdding(true)}
            >
              <Plus className="mr-1.5 size-4" />
              워크스페이스
            </Button>
          ) : null}
        </div>

        {adding ? (
          <div className="ui-panel-soft p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] md:items-end">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-text-secondary">
                  이름
                </span>
                <input
                  autoFocus
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.nativeEvent.isComposing)
                      submitAdd();
                    if (event.key === "Escape") setAdding(false);
                  }}
                  placeholder="예: AI 서비스 포털 팀"
                  className="ui-input text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-text-secondary">
                  설명
                </span>
                <input
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.nativeEvent.isComposing)
                      submitAdd();
                    if (event.key === "Escape") setAdding(false);
                  }}
                  placeholder="워크스페이스 용도"
                  className="ui-input text-sm"
                />
              </label>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm-icon"
                  variant="ghost"
                  onClick={() => setAdding(false)}
                  aria-label="취소"
                >
                  <X className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm-icon"
                  tone="brand"
                  onClick={submitAdd}
                  disabled={createTeamMutation.isPending}
                  aria-label="추가"
                >
                  <Check className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-40 animate-pulse rounded-md border border-surface-border-soft bg-surface-muted"
              />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted px-5 py-14 text-center text-sm text-text-muted">
            {isAdmin
              ? "워크스페이스를 추가하세요."
              : "접근 가능한 워크스페이스가 없습니다."}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => onOpenWorkspace(team.id)}
                className="group flex min-h-40 flex-col justify-between rounded-md border border-surface-border-soft bg-surface-raised p-4 text-left shadow-sm transition hover:border-brand-border hover:bg-brand-glass"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
                    <FileJson className="size-5" />
                  </span>
                  <span className="rounded-md border border-surface-border-soft bg-surface-muted px-2 py-1 text-[11px] font-bold text-text-muted">
                    Workspace
                  </span>
                </div>
                <div className="mt-5 min-w-0">
                  <h3 className="truncate text-lg font-black text-text-primary">
                    {team.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-text-secondary">
                    {team.description || "팀 API 요청 컬렉션"}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-surface-border-soft pt-3">
                  <div className="flex flex-wrap gap-2 text-xs font-bold text-text-secondary">
                    <span>{team.categoryCount ?? 0} collections</span>
                    <span>{team.endpointCount ?? 0} requests</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-black text-brand-primary">
                    Open
                    <Send className="size-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CategorySidebar({
  className,
  teamId,
  categories,
  activeId,
  isAdmin,
  isLoading,
  onSelect,
}: {
  className?: string;
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

  const createMutation = useCreateApiDocCategory(teamId);
  const updateMutation = useUpdateApiDocCategory(teamId);
  const deleteMutation = useDeleteApiDocCategory(teamId);
  const reorderMutation = useReorderApiDocCategories(teamId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const submitAdd = () => {
    const name = newName.trim();
    if (!name) {
      setAdding(false);
      return;
    }
    createMutation.mutate(
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

  const submitRename = (categoryId: string) => {
    const name = editingName.trim();
    if (!name) {
      setEditingId(null);
      return;
    }
    updateMutation.mutate(
      { id: categoryId, body: { name } },
      { onSuccess: () => setEditingId(null) },
    );
  };

  const handleDelete = (category: ApiDocCategory) => {
    if (!window.confirm(`'${category.name}' 카테고리를 삭제할까요?`)) return;
    deleteMutation.mutate(category.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex(
      (category) => category.id === active.id,
    );
    const newIndex = categories.findIndex(
      (category) => category.id === over.id,
    );
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(categories, oldIndex, newIndex);
    reorderMutation.mutate(
      reordered.map((category, index) => ({
        id: category.id,
        orderIdx: index,
      })),
    );
  };

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised shadow-sm",
        className,
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-between rounded-t-md border-b border-surface-border-soft bg-surface-muted px-4">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-brand-primary opacity-70" />
          <div>
            <p className="text-sm font-black text-text-primary">컬렉션</p>
            <p className="text-[11px] text-text-muted">
              {categories.length} items
            </p>
          </div>
        </div>
        {isAdmin ? (
          <Button
            type="button"
            size="sm-icon"
            variant="ghost"
            tone="brand"
            onClick={() => {
              setAdding(true);
              setNewName("");
            }}
            aria-label="카테고리 추가"
            title="카테고리 추가"
          >
            <Plus className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1.5">
        {adding ? (
          <div className="mb-2 rounded-md border border-brand-border bg-brand-glass p-2.5">
            <input
              autoFocus
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing)
                  submitAdd();
                if (event.key === "Escape") setAdding(false);
              }}
              placeholder="새 컬렉션"
              className="ui-input text-sm"
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                size="sm-icon"
                variant="ghost"
                onClick={() => setAdding(false)}
                aria-label="취소"
              >
                <X className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="sm-icon"
                tone="brand"
                onClick={submitAdd}
                aria-label="추가"
              >
                <Check className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <p className="px-3 py-8 text-center text-sm text-text-muted">
            불러오는 중...
          </p>
        ) : categories.length === 0 ? (
          <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted px-3 py-10 text-center text-sm text-text-muted">
            {isAdmin ? "컬렉션을 추가하세요." : "등록된 API 문서가 없습니다."}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={categories.map((category) => category.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {categories.map((category) => (
                  <SortableItem
                    key={category.id}
                    id={category.id}
                    disabled={!isAdmin}
                  >
                    {(dragHandleProps) => (
                      <div
                        className={`${SIDEBAR_ITEM_CLASS} ${
                          activeId === category.id
                            ? "border-l-2 border-brand-border bg-brand-glass pl-1.5 text-brand-primary"
                            : "hover:bg-surface-muted"
                        }`}
                      >
                        {isAdmin ? (
                          <button
                            type="button"
                            {...dragHandleProps}
                            className={SIDEBAR_DRAG_HANDLE_CLASS}
                            aria-label="드래그"
                          >
                            <GripVertical className="size-3" />
                          </button>
                        ) : null}
                        {editingId === category.id ? (
                          <input
                            autoFocus
                            value={editingName}
                            onChange={(event) =>
                              setEditingName(event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (
                                event.key === "Enter" &&
                                !event.nativeEvent.isComposing
                              ) {
                                submitRename(category.id);
                              }
                              if (event.key === "Escape") setEditingId(null);
                            }}
                            className="ui-input h-8 min-w-0 flex-1 text-sm"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelect(category.id)}
                            className={SIDEBAR_TEXT_BUTTON_CLASS}
                            title={category.name}
                          >
                            {category.name}
                          </button>
                        )}
                        {isAdmin ? (
                          <div className={SIDEBAR_ACTIONS_CLASS}>
                            {editingId === category.id ? (
                              <Button
                                type="button"
                                size="sm-icon"
                                variant="ghost"
                                tone="brand"
                                onClick={() => submitRename(category.id)}
                                aria-label="저장"
                              >
                                <Check className="size-3.5" />
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm-icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingId(category.id);
                                  setEditingName(category.name);
                                }}
                                aria-label="수정"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm-icon"
                              variant="ghost"
                              tone="danger"
                              onClick={() => handleDelete(category)}
                              aria-label="삭제"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </SortableItem>
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
  className,
  categoryId,
  endpoints,
  activeId,
  isAdmin,
  isLoading,
  onSelect,
}: {
  className?: string;
  categoryId: string | null;
  endpoints: ApiDocEndpoint[];
  activeId: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  onSelect: (id: string | null) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const createMutation = useCreateApiDocEndpoint(categoryId);
  const updateMutation = useUpdateApiDocEndpoint(categoryId);
  const deleteMutation = useDeleteApiDocEndpoint(categoryId);
  const reorderMutation = useReorderApiDocEndpoints(categoryId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const resetAddForm = () => {
    setNewTitle("");
  };

  const submitAdd = () => {
    if (!categoryId) return;
    const title = newTitle.trim();
    if (!title) {
      setAdding(false);
      resetAddForm();
      return;
    }
    createMutation.mutate(
      {
        categoryId,
        title,
        method: "GET",
        path: "",
      },
      {
        onSuccess: (endpoint) => {
          resetAddForm();
          setAdding(false);
          onSelect(endpoint.id);
        },
      },
    );
  };

  const startEdit = (endpoint: ApiDocEndpoint) => {
    setEditingId(endpoint.id);
    setEditingTitle(endpoint.title);
  };

  const submitEdit = (endpointId: string) => {
    const title = editingTitle.trim();
    if (!title) {
      setEditingId(null);
      return;
    }
    updateMutation.mutate(
      {
        id: endpointId,
        body: {
          title,
        },
      },
      { onSuccess: () => setEditingId(null) },
    );
  };

  const handleDelete = (endpoint: ApiDocEndpoint) => {
    if (!window.confirm(`'${endpoint.title}' 엔드포인트를 삭제할까요?`)) return;
    deleteMutation.mutate(endpoint.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = endpoints.findIndex(
      (endpoint) => endpoint.id === active.id,
    );
    const newIndex = endpoints.findIndex((endpoint) => endpoint.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(endpoints, oldIndex, newIndex);
    reorderMutation.mutate(
      reordered.map((endpoint, index) => ({
        id: endpoint.id,
        orderIdx: index,
      })),
    );
  };

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised shadow-sm",
        className,
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-between rounded-t-md border-b border-surface-border-soft bg-surface-muted px-4">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-brand-primary opacity-70" />
          <div>
            <p className="text-sm font-black text-text-primary">API 항목</p>
            <p className="text-[11px] text-text-muted">
              {endpoints.length} items
            </p>
          </div>
        </div>
        {isAdmin ? (
          <Button
            type="button"
            size="sm-icon"
            variant="ghost"
            tone="brand"
            disabled={!categoryId}
            onClick={() => setAdding(true)}
            aria-label="API 항목 추가"
            title="API 항목 추가"
          >
            <Plus className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1.5">
        {adding && categoryId ? (
          <div className="mb-2 rounded-md border border-brand-border bg-brand-glass p-2">
            <input
              autoFocus
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing)
                  submitAdd();
                if (event.key === "Escape") {
                  setAdding(false);
                  resetAddForm();
                }
              }}
              placeholder="API 항목 이름"
              className="ui-input min-w-0 text-sm"
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                size="sm-icon"
                variant="ghost"
                onClick={() => {
                  setAdding(false);
                  resetAddForm();
                }}
                aria-label="취소"
              >
                <X className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="sm-icon"
                tone="brand"
                onClick={submitAdd}
                aria-label="추가"
              >
                <Check className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : null}

        {!categoryId ? (
          <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted px-3 py-10 text-center text-sm text-text-muted">
            컬렉션을 먼저 선택하세요.
          </div>
        ) : isLoading ? (
          <p className="px-3 py-8 text-center text-sm text-text-muted">
            불러오는 중...
          </p>
        ) : endpoints.length === 0 ? (
          <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted px-3 py-10 text-center text-sm text-text-muted">
            {isAdmin ? "API 항목을 추가하세요." : "등록된 API 항목이 없습니다."}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={endpoints.map((endpoint) => endpoint.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {endpoints.map((endpoint) => (
                  <SortableItem
                    key={endpoint.id}
                    id={endpoint.id}
                    disabled={!isAdmin}
                  >
                    {(dragHandleProps) => (
                      <div
                        className={`${SIDEBAR_ITEM_CLASS} ${
                          activeId === endpoint.id
                            ? "border-l-2 border-brand-border bg-brand-glass pl-1.5"
                            : "hover:bg-surface-muted"
                        }`}
                      >
                        {editingId === endpoint.id ? (
                          <div className="w-full space-y-2">
                            <input
                              autoFocus
                              value={editingTitle}
                              onChange={(event) =>
                                setEditingTitle(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" &&
                                  !event.nativeEvent.isComposing
                                ) {
                                  submitEdit(endpoint.id);
                                }
                                if (event.key === "Escape") setEditingId(null);
                              }}
                              className="ui-input h-9 min-w-0 text-sm"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm-icon"
                                variant="ghost"
                                onClick={() => setEditingId(null)}
                                aria-label="취소"
                              >
                                <X className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="sm-icon"
                                tone="brand"
                                onClick={() => submitEdit(endpoint.id)}
                                aria-label="저장"
                              >
                                <Check className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {isAdmin ? (
                              <button
                                type="button"
                                {...dragHandleProps}
                                className={SIDEBAR_DRAG_HANDLE_CLASS}
                                aria-label="드래그"
                              >
                                <GripVertical className="size-3" />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => onSelect(endpoint.id)}
                              className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left leading-none"
                              title={endpoint.title}
                            >
                              <span
                                className={`shrink-0 rounded px-1 py-0.5 font-mono text-[9px] font-black tracking-wide ${METHOD_COLOR[endpoint.method] ?? METHOD_COLOR.GET}`}
                              >
                                {endpoint.method}
                              </span>
                              <span className="truncate text-xs font-semibold text-text-primary">
                                {endpoint.title}
                              </span>
                            </button>
                            {isAdmin ? (
                              <div className={SIDEBAR_ACTIONS_CLASS}>
                                <Button
                                  type="button"
                                  size="sm-icon"
                                  variant="ghost"
                                  onClick={() => startEdit(endpoint)}
                                  aria-label="수정"
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm-icon"
                                  variant="ghost"
                                  tone="danger"
                                  onClick={() => handleDelete(endpoint)}
                                  aria-label="삭제"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    )}
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </aside>
  );
}

function EnvironmentDialog({ onClose }: { onClose: () => void }) {
  const environments = useApiEnvStore((state) => state.environments);
  const activeEnvId = useApiEnvStore((state) => state.activeEnvId);
  const setActiveEnv = useApiEnvStore((state) => state.setActiveEnv);
  const updateEnvironments = useApiEnvStore(
    (state) => state.updateEnvironments,
  );
  const activeEnv =
    environments.find((env) => env.id === activeEnvId) ?? environments[0];
  const [draft, setDraft] = useState<ApiEnvironmentVariable[]>(() =>
    activeEnv ? activeEnv.variables.map((item) => ({ ...item })) : [],
  );

  const selectEnvironment = (env: ApiEnvironment) => {
    setActiveEnv(env.id);
    setDraft(env.variables.map((item) => ({ ...item })));
  };

  const updateRow = (
    index: number,
    field: keyof ApiEnvironmentVariable,
    value: string,
  ) => {
    setDraft((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  };

  const save = () => {
    if (!activeEnv) return;
    updateEnvironments(
      environments.map((env) =>
        env.id === activeEnv.id
          ? {
              ...env,
              variables: draft
                .filter((item) => item.key.trim())
                .map((item) => ({ ...item, key: item.key.trim() })),
            }
          : env,
      ),
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[color:color-mix(in_srgb,var(--background)_35%,transparent)] p-4 backdrop-blur-sm">
      <div className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-border-soft bg-surface-muted px-5 py-4">
          <div>
            <p className="text-base font-black text-text-primary">환경 변수</p>
            <p className="mt-1 text-xs text-text-muted">
              {
                "`{{API_BASE}}`처럼 요청 URL, header, body에서 사용할 수 있습니다."
              }
            </p>
          </div>
          <Button
            type="button"
            size="sm-icon"
            variant="ghost"
            onClick={onClose}
            aria-label="닫기"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {environments.map((env) => (
              <button
                key={env.id}
                type="button"
                onClick={() => selectEnvironment(env)}
                className={`rounded-md border px-3 py-2 text-xs font-bold transition-colors ${
                  activeEnvId === env.id
                    ? "border-brand-border bg-brand-glass text-brand-primary"
                    : "border-surface-border-soft bg-surface-muted text-text-secondary hover:text-text-primary"
                }`}
              >
                {env.name}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-md border border-surface-border-soft">
            <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_minmax(0,1fr)_40px] gap-2 border-b border-surface-border-soft bg-surface-muted px-3 py-2 text-[11px] font-black uppercase tracking-widest text-text-muted">
              <span>Key</span>
              <span>Value</span>
              <span>Description</span>
              <span />
            </div>
            <div className="divide-y divide-[var(--surface-border-soft)]">
              {draft.map((row, index) => (
                <div
                  key={`${row.key}-${index}`}
                  className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_minmax(0,1fr)_40px] items-center gap-2 px-3 py-2"
                >
                  <input
                    value={row.key}
                    onChange={(event) =>
                      updateRow(index, "key", event.target.value)
                    }
                    className="ui-input font-mono text-xs"
                  />
                  <input
                    value={row.value}
                    onChange={(event) =>
                      updateRow(index, "value", event.target.value)
                    }
                    className="ui-input font-mono text-xs"
                  />
                  <input
                    value={row.description ?? ""}
                    onChange={(event) =>
                      updateRow(index, "description", event.target.value)
                    }
                    className="ui-input text-xs"
                  />
                  <Button
                    type="button"
                    size="sm-icon"
                    variant="ghost"
                    tone="danger"
                    onClick={() =>
                      setDraft((prev) =>
                        prev.filter((_, rowIndex) => rowIndex !== index),
                      )
                    }
                    aria-label="삭제"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() =>
              setDraft((prev) => [
                ...prev,
                { key: "", value: "", description: "" },
              ])
            }
          >
            <Plus className="mr-1.5 size-3.5" />
            변수 추가
          </Button>
        </div>

        <div className="flex justify-end gap-2 border-t border-surface-border-soft bg-surface-muted px-5 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button type="button" onClick={save}>
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}
