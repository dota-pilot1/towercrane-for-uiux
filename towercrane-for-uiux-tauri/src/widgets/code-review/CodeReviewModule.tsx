import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Code2,
  FileCode2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  codeReviewQueryKeys,
  useCodeReviewDetail,
  useCodeReviewList,
  useCreateManualCodeReview,
  useDeleteCodeReview,
  useReplaceCodeReviewDocuments,
} from "../../features/code-review/api";
import type {
  CodeReviewDetail,
  CodeReviewDocument,
  CodeReviewDocumentType,
  CodeReviewRiskLevel,
  CodeReviewSummary,
} from "../../features/code-review/types";
import { useColumnResize } from "../../shared/lib/useColumnResize";
import { Button } from "../../shared/ui/button";
import { LexicalEditor } from "../../shared/ui/lexical/lexical-editor";
import PageHeader from "../../shared/ui/PageHeader";

const DOC_TABS: Array<{ type: CodeReviewDocumentType; label: string }> = [
  { type: "overview", label: "개요" },
  { type: "review", label: "리뷰" },
  { type: "checklist", label: "체크" },
  { type: "issue", label: "이슈" },
  { type: "note", label: "메모" },
];

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function createDoc(type: CodeReviewDocumentType, title?: string): CodeReviewDocument {
  const now = new Date().toISOString();
  const label = DOC_TABS.find((tab) => tab.type === type)?.label ?? "문서";
  return {
    id: createId(),
    type,
    title: title || `${label} 문서`,
    content: "",
    orderIdx: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function riskLabel(riskLevel: CodeReviewRiskLevel) {
  if (riskLevel === "high") return "높음";
  if (riskLevel === "medium") return "중간";
  return "낮음";
}

function riskClass(riskLevel: CodeReviewRiskLevel) {
  if (riskLevel === "high") return "bg-danger-glass text-destructive";
  if (riskLevel === "medium") return "bg-surface-muted text-text-primary";
  return "bg-brand-glass text-brand-primary";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function truncate(value: string, max = 120) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function countByType(documents: CodeReviewDocument[], type: CodeReviewDocumentType) {
  return documents.filter((document) => document.type === type).length;
}

function sortDocuments(documents: CodeReviewDocument[]) {
  return [...documents].sort(
    (a, b) => a.orderIdx - b.orderIdx || a.createdAt.localeCompare(b.createdAt),
  );
}

function normalizeDocumentOrder(documents: CodeReviewDocument[]) {
  return DOC_TABS.flatMap((tab) =>
    sortDocuments(documents.filter((document) => document.type === tab.type)).map(
      (document, index) => ({
        ...document,
        orderIdx: index,
      }),
    ),
  );
}

function CodeReviewModule() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(480);
  const onResizeStart = useColumnResize(sidebarWidth, setSidebarWidth, {
    min: 360,
    max: 640,
  });
  const queryClient = useQueryClient();

  const listQuery = useCodeReviewList({ q, page, pageSize: 20 });
  const createReview = useCreateManualCodeReview();

  useEffect(() => {
    setPage(1);
  }, [q]);

  useEffect(() => {
    if (selectedId || !listQuery.data?.items[0]) return;
    setSelectedId(listQuery.data.items[0].id);
  }, [listQuery.data?.items, selectedId]);

  const createManual = async () => {
    const title = newTitle.trim();
    if (!title) return;
    const detail = await createReview.mutateAsync({
      title,
      summary: newSummary.trim(),
      repository: "manual",
      riskLevel: "low",
      documents: [
        createDoc("overview", "기능 개요"),
        createDoc("review", "코드 리뷰"),
        createDoc("checklist", "체크리스트"),
      ],
    });
    setNewTitle("");
    setNewSummary("");
    setSelectedId(detail.id);
  };

  const refreshPage = () => {
    void queryClient.invalidateQueries({ queryKey: codeReviewQueryKeys.all });
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <PageHeader>
        <span className="text-[14px] font-bold tracking-tight text-text-primary">
          코드 리뷰
        </span>
        <div data-actions className="ml-auto mr-24 flex items-center">
          <button
            type="button"
            title="새로고침"
            onClick={refreshPage}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-surface-border-soft bg-surface-raised text-text-secondary shadow-sm hover:border-brand-border hover:bg-brand-glass hover:text-brand-primary"
          >
            <RefreshCw
              className={"size-4 " + (listQuery.isFetching ? "animate-spin" : "")}
            />
          </button>
        </div>
      </PageHeader>

      <div className="flex min-h-0 flex-1 bg-surface-muted">
        <aside
          className="relative flex min-h-0 shrink-0 flex-col border-r border-surface-border-soft bg-surface-raised"
          style={{ width: sidebarWidth }}
        >
          <div
            onMouseDown={onResizeStart}
            className="absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize hover:bg-brand-border active:bg-brand-border"
          />
          <div className="border-b border-surface-border-soft p-3">
            <div className="flex items-center gap-2 text-[12px] font-black text-text-primary">
              <FileCode2 className="size-4 text-brand-primary" />
              기능 단위 리뷰 문서
            </div>
            <input
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="기능 제목"
              className="mt-3 h-9 w-full rounded-md border border-surface-border-soft bg-surface-muted px-3 text-[13px] text-text-primary outline-none focus:border-brand-border"
            />
            <textarea
              value={newSummary}
              onChange={(event) => setNewSummary(event.target.value)}
              rows={3}
              placeholder="기능 설명, 리뷰 범위, 확인할 리스크를 적습니다."
              className="mt-2 min-h-20 w-full resize-y rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 text-[12px] leading-5 text-text-primary outline-none focus:border-brand-border"
            />
            <Button
              onClick={createManual}
              disabled={!newTitle.trim() || createReview.isPending}
              className="mt-3 h-9 w-full gap-1.5 text-[13px]"
            >
              {createReview.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              리뷰 문서 만들기
            </Button>
          </div>

          <div className="border-b border-surface-border-soft p-3">
            <label className="flex h-9 items-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-3">
              <Search className="size-4 text-text-muted" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="기능 제목, 설명 검색"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-text-primary outline-none"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {listQuery.isLoading ? (
              <div className="flex h-40 items-center justify-center gap-2 text-[13px] text-text-muted">
                <Loader2 className="size-4 animate-spin" />
                불러오는 중
              </div>
            ) : listQuery.data?.items.length ? (
              <div className="space-y-2">
                {listQuery.data.items.map((item) => (
                  <ReviewListItem
                    key={item.id}
                    item={item}
                    active={item.id === selectedId}
                    onClick={() => setSelectedId(item.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted px-4 py-10 text-center">
                <Code2 className="mx-auto size-8 text-text-muted" />
                <p className="mt-3 text-[13px] font-bold text-text-primary">
                  저장된 코드 리뷰 문서가 없습니다.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-surface-border-soft px-3 py-2 text-[12px] text-text-muted">
            <span>총 {listQuery.data?.total ?? 0}건</span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                이전
              </Button>
              <span>
                {page} / {listQuery.data?.totalPages ?? 1}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= (listQuery.data?.totalPages ?? 1)}
                onClick={() => setPage((value) => value + 1)}
              >
                다음
              </Button>
            </div>
          </div>
        </aside>

        <main className="min-h-0 min-w-0 flex-1">
          <ReviewDetail reviewId={selectedId} onDeleted={() => setSelectedId(null)} />
        </main>
      </div>
    </div>
  );
}

function ReviewListItem({
  item,
  active,
  onClick,
}: {
  item: CodeReviewSummary;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "w-full rounded-md border px-3 py-3 text-left transition-colors " +
        (active
          ? "border-brand-border bg-brand-glass"
          : "border-surface-border-soft bg-surface-muted hover:border-brand-border hover:bg-brand-glass")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-[13px] font-black leading-5 text-text-primary">
          {item.title}
        </h3>
        <span
          className={
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black " +
            riskClass(item.riskLevel)
          }
        >
          {riskLabel(item.riskLevel)}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-text-secondary">
        {truncate(item.summary || "설명 없음")}
      </p>
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-text-muted">
        <span>{formatDate(item.createdAt)}</span>
        <span>문서 {item.documentCount ?? 0}개</span>
        {item.findingCount > 0 ? <span>분석 {item.findingCount}개</span> : null}
      </div>
    </button>
  );
}

function ReviewDetail({
  reviewId,
  onDeleted,
}: {
  reviewId: string | null;
  onDeleted: () => void;
}) {
  const detailQuery = useCodeReviewDetail(reviewId);
  const deleteReview = useDeleteCodeReview();
  const replaceDocs = useReplaceCodeReviewDocuments(reviewId);
  const detail = detailQuery.data;
  const [activeTab, setActiveTab] = useState<CodeReviewDocumentType>("overview");
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<CodeReviewDocument[]>([]);

  useEffect(() => {
    if (!detail) return;
    setDocuments(detail.reviewDocuments ?? []);
    const first =
      detail.reviewDocuments.find((document) => document.type === activeTab) ??
      detail.reviewDocuments[0] ??
      null;
    setActiveTab(first?.type ?? "overview");
    setActiveDocId(first?.id ?? null);
  }, [detail?.id]);

  const activeDocs = sortDocuments(
    documents.filter((document) => document.type === activeTab),
  );
  const activeDoc =
    activeDocs.find((document) => document.id === activeDocId) ?? activeDocs[0] ?? null;

  useEffect(() => {
    if (activeDoc && activeDoc.id !== activeDocId) setActiveDocId(activeDoc.id);
  }, [activeDoc?.id, activeDocId]);

  const dirty =
    detail &&
    JSON.stringify(documents) !== JSON.stringify(detail.reviewDocuments ?? []);

  const addDocument = () => {
    const next = createDoc(activeTab);
    next.orderIdx = activeDocs.length;
    setDocuments((current) => [...current, next]);
    setActiveDocId(next.id);
  };

  const patchDocument = (id: string, patch: Partial<CodeReviewDocument>) => {
    setDocuments((current) =>
      current.map((document) =>
        document.id === id
          ? { ...document, ...patch, updatedAt: new Date().toISOString() }
          : document,
      ),
    );
  };

  const removeDocument = (id: string) => {
    if (!window.confirm("이 리뷰 문서를 삭제할까요?")) return;
    setDocuments((current) => current.filter((document) => document.id !== id));
    setActiveDocId(null);
  };

  const moveDocument = (id: string, direction: -1 | 1) => {
    const targetIndex = activeDocs.findIndex((document) => document.id === id);
    const nextIndex = targetIndex + direction;
    if (targetIndex < 0 || nextIndex < 0 || nextIndex >= activeDocs.length) return;

    const reordered = [...activeDocs];
    const [target] = reordered.splice(targetIndex, 1);
    reordered.splice(nextIndex, 0, target);
    const byId = new Map(
      reordered.map((document, index) => [
        document.id,
        { ...document, orderIdx: index, updatedAt: new Date().toISOString() },
      ]),
    );

    setDocuments((current) =>
      current.map((document) => byId.get(document.id) ?? document),
    );
    setActiveDocId(id);
  };

  const saveDocuments = async () => {
    if (!detail) return;
    const normalized = normalizeDocumentOrder(documents);
    const saved = await replaceDocs.mutateAsync(normalized);
    setDocuments(saved.reviewDocuments ?? []);
  };

  const removeReview = async () => {
    if (!reviewId || !window.confirm("이 코드 리뷰 문서함을 삭제할까요?")) return;
    await deleteReview.mutateAsync(reviewId);
    onDeleted();
  };

  if (!reviewId) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div>
          <Code2 className="mx-auto size-10 text-text-muted" />
          <p className="mt-3 text-[14px] font-bold text-text-primary">
            코드 리뷰 문서를 선택하세요.
          </p>
        </div>
      </div>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-text-muted">
        <Loader2 className="size-5 animate-spin" />
        코드 리뷰를 불러오는 중
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-text-muted">
        코드 리뷰를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-surface-border-soft bg-surface-raised px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[19px] font-black text-text-primary">{detail.title}</h2>
            <p className="mt-2 max-w-4xl whitespace-pre-wrap text-[13px] leading-6 text-text-secondary">
              {detail.summary || "기능 설명이 없습니다."}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-[12px] font-semibold text-text-muted">
              <span>{detail.createdByName}</span>
              <span>{formatDate(detail.createdAt)}</span>
              <span>문서 {documents.length}개</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              className="h-8 gap-1.5 text-[12px]"
              disabled={!dirty || replaceDocs.isPending}
              onClick={saveDocuments}
            >
              {replaceDocs.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              저장
            </Button>
            {detail.canDelete ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={removeReview}
                disabled={deleteReview.isPending}
                className="h-8 gap-1.5 text-[12px] text-destructive"
              >
                <Trash2 className="size-3.5" />
                삭제
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-surface-border-soft bg-surface-muted px-4 py-2">
          {DOC_TABS.map((tab) => {
            const active = activeTab === tab.type;
            const count = countByType(documents, tab.type);
            return (
              <button
                key={tab.type}
                onClick={() => {
                  setActiveTab(tab.type);
                  const first = documents.find((document) => document.type === tab.type);
                  setActiveDocId(first?.id ?? null);
                }}
                className={
                  "flex h-8 items-center gap-1.5 rounded-md border px-3 text-[12px] font-bold " +
                  (active
                    ? "border-brand-border bg-brand-glass text-brand-primary"
                    : "border-surface-border-soft bg-surface-raised text-text-secondary hover:border-brand-border")
                }
              >
                {tab.label}
                <span className="rounded-full bg-surface-strong px-1.5 text-[10px] text-text-muted">
                  {count}
                </span>
              </button>
            );
          })}
          <Button
            variant="secondary"
            size="sm"
            className="ml-auto h-8 gap-1.5 text-[12px]"
            onClick={addDocument}
          >
            <Plus className="size-3.5" />
            문서 추가
          </Button>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-r border-surface-border-soft bg-surface-raised p-2">
            {activeDocs.length ? (
              <div className="space-y-1.5">
                {activeDocs.map((document, index) => (
                  <div
                    key={document.id}
                    className={
                      "flex items-center gap-1 rounded-md border p-1 transition-colors " +
                      (document.id === activeDoc?.id
                        ? "border-brand-border bg-brand-glass"
                        : "border-surface-border-soft bg-surface-muted hover:border-brand-border")
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setActiveDocId(document.id)}
                      className={
                        "min-w-0 flex-1 truncate px-2 py-1.5 text-left text-[12px] font-bold " +
                        (document.id === activeDoc?.id
                          ? "text-brand-primary"
                          : "text-text-secondary")
                      }
                    >
                      {document.title}
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        title="위로 이동"
                        disabled={index === 0}
                        onClick={() => moveDocument(document.id, -1)}
                        className="rounded p-1 text-text-muted hover:bg-surface-strong hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        title="아래로 이동"
                        disabled={index === activeDocs.length - 1}
                        onClick={() => moveDocument(document.id, 1)}
                        className="rounded p-1 text-text-muted hover:bg-surface-strong hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted p-4 text-center text-[12px] text-text-muted">
                이 탭에 문서가 없습니다.
              </p>
            )}
          </aside>

          <section className="min-h-0 overflow-y-auto bg-surface-muted p-4">
            {activeDoc ? (
              <div className="overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised">
                <div className="flex items-center gap-2 border-b border-surface-border-soft p-3">
                  <input
                    value={activeDoc.title}
                    onChange={(event) =>
                      patchDocument(activeDoc.id, { title: event.target.value })
                    }
                    className="h-9 min-w-0 flex-1 rounded-md border border-surface-border-soft bg-surface-muted px-3 text-[13px] font-bold text-text-primary outline-none focus:border-brand-border"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-9 gap-1.5 text-[12px] text-destructive"
                    onClick={() => removeDocument(activeDoc.id)}
                  >
                    <Trash2 className="size-3.5" />
                    삭제
                  </Button>
                </div>
                <LexicalEditor
                  key={activeDoc.id}
                  initialState={activeDoc.content}
                  onChange={(content) => patchDocument(activeDoc.id, { content })}
                  placeholder="리뷰 내용을 작성하세요."
                  minHeight="420px"
                  toolbarVariant="full"
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center rounded-md border border-dashed border-surface-border-soft bg-surface-raised text-[13px] text-text-muted">
                문서를 추가하세요.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default CodeReviewModule;
