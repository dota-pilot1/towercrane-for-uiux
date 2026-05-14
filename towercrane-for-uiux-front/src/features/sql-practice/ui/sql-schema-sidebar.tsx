import {
  ChevronLeft,
  ChevronRight,
  Database,
  Info,
  RefreshCw,
  RotateCcw,
  Settings,
  Table2,
  UploadCloud,
} from "lucide-react";
import { useState } from "react";
import type {
  SqlPracticeMeta,
  SqlPracticeSeedSummary,
  TableInfo,
} from "../../../entities/sql-practice/model/types";
import { useSessionStore } from "../../../shared/store/session-store";
import {
  useActivateSqlPracticeSeed,
  useSqlPracticeErd,
  useSqlPracticeSeeds,
} from "../model/use-sql-practice-queries";
import { SqlErdDialog } from "./sql-erd-dialog";
import { SqlSeedManagerDialog } from "./sql-seed-manager-dialog";
import { SqlTableSchemaDialog } from "./sql-table-schema-dialog";

type SqlSchemaSidebarProps = {
  meta?: SqlPracticeMeta;
  tables: TableInfo[];
  selectedTable: string | null;
  isLoading: boolean;
  isResetting: boolean;
  isReloading: boolean;
  onSelectTable: (tableName: string) => void;
  onRefresh: () => void;
  onReset: () => void;
  onReloadSeed: () => void;
  onSeedActivated: () => void;
};

export function SqlSchemaSidebar({
  meta,
  tables,
  selectedTable,
  isLoading,
  isResetting,
  isReloading,
  onSelectTable,
  onRefresh,
  onReset,
  onReloadSeed,
  onSeedActivated,
}: SqlSchemaSidebarProps) {
  const [schemaDialog, setSchemaDialog] = useState<TableInfo | null>(null);
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);
  const [erdDialogOpen, setErdDialogOpen] = useState(false);
  const seedsQuery = useSqlPracticeSeeds();
  const erdQuery = useSqlPracticeErd(meta?.seedFile);
  const activateSeedMutation = useActivateSqlPracticeSeed({
    onSuccess: () => {
      onSeedActivated();
      setSeedDialogOpen(false);
    },
  });
  const isAdmin = useSessionStore((s) => s.userRole === "admin");

  const seeds = seedsQuery.data?.seeds ?? [];
  const activeSeed =
    seeds.find((seed) => seed.isActive) ?? meta?.activeSeed;

  const activeIndex = seeds.findIndex((s) => s.isActive);
  const prevSeed = activeIndex > 0 ? seeds[activeIndex - 1] : null;
  const nextSeed = activeIndex >= 0 && activeIndex < seeds.length - 1 ? seeds[activeIndex + 1] : null;

  const handleActivateSeed = (seed: SqlPracticeSeedSummary) => {
    return activateSeedMutation.mutateAsync({
      source: seed.source,
      fileName: seed.fileName,
    });
  };

  return (
    <>
      <aside className="ui-panel flex min-h-[360px] w-[300px] shrink-0 flex-col overflow-hidden rounded-md p-0">
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-text-primary">테이블</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {erdQuery.data?.mmd && (
              <button
                type="button"
                className="ui-icon-button-brand h-8 gap-1.5 px-3 text-xs font-bold"
                onClick={() => setErdDialogOpen(true)}
                title="ERD 보기"
              >
                ERD
              </button>
            )}
            <button
              className="ui-icon-button size-8"
              type="button"
              aria-label="새로고침"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`size-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="border-b border-surface-border p-3">
          <div className="rounded-md border border-surface-border-soft bg-surface-muted p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-xs font-bold text-text-primary">
                <Database className="size-3.5 shrink-0 text-brand-primary" />
                <span className="truncate">
                  {meta?.dbFile ?? "practice.sqlite"}
                </span>
              </div>
              <button
                className="ui-icon-button size-7 shrink-0"
                type="button"
                aria-label="SQL 연습 파일 관리"
                title="SQL 연습 파일 관리"
                onClick={() => setSeedDialogOpen(true)}
              >
                <Settings className="size-3.5" />
              </button>
            </div>
            <div className="mt-2 space-y-1 text-xs text-text-secondary">
              <p>seed: {meta?.seedFile ?? "01_board_basic.sql"}</p>
              <p>tables: {meta?.tableCount ?? tables.length}</p>
              <p>
                hash: {meta?.seedHash ? meta.seedHash.slice(0, 10) : "loading"}
              </p>
            </div>

            <div className="mt-3 flex items-center gap-1">
              <button
                type="button"
                className="ui-icon-button size-7 shrink-0"
                onClick={() => prevSeed && handleActivateSeed(prevSeed)}
                disabled={!prevSeed || activateSeedMutation.isPending}
                title={prevSeed ? `이전: ${prevSeed.fileName}` : "이전 파일 없음"}
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <span className="flex-1 truncate text-center text-xs text-text-muted">
                {activeSeed?.fileName ?? meta?.seedFile ?? "파일 선택"}
              </span>
              <button
                type="button"
                className="ui-icon-button size-7 shrink-0"
                onClick={() => nextSeed && handleActivateSeed(nextSeed)}
                disabled={!nextSeed || activateSeedMutation.isPending}
                title={nextSeed ? `다음: ${nextSeed.fileName}` : "다음 파일 없음"}
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>

          {isAdmin && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="ui-icon-button h-8 gap-1.5 text-xs"
                onClick={onReset}
                disabled={isResetting || isReloading}
                title="테이블 구조 + 데이터 전체 초기화"
              >
                <RotateCcw
                  className={`size-3.5 ${isResetting ? "animate-spin" : ""}`}
                />
                테이블 리셋
              </button>
              <button
                type="button"
                className="ui-icon-button h-8 gap-1.5 text-xs"
                onClick={onReloadSeed}
                disabled={isResetting || isReloading}
                title="데이터만 seed 재적용"
              >
                <UploadCloud
                  className={`size-3.5 ${isReloading ? "animate-spin" : ""}`}
                />
                데이터 리셋
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {tables.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center px-5 text-center">
              <Table2 className="mb-3 size-9 text-text-muted" />
              <p className="text-sm font-semibold text-text-primary">
                테이블이 없습니다
              </p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">
                CREATE TABLE을 실행하거나 Reset으로 현재 seed를 다시 적용하세요.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {tables.map((table) => {
                const isSelected = selectedTable === table.tableName;
                return (
                  <button
                    key={table.tableName}
                    type="button"
                    onClick={() => onSelectTable(table.tableName)}
                    className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? "border-brand-border bg-brand-glass text-brand-primary"
                        : "border-transparent text-text-primary hover:border-surface-border-soft hover:bg-surface-muted"
                    }`}
                  >
                    <Table2 className="size-3.5 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        {table.tableName}
                      </span>
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="rounded-sm border border-surface-border-soft p-1.5 text-text-secondary transition-colors hover:border-brand-border hover:text-brand-primary"
                      title="스키마 보기"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSchemaDialog(table);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        event.stopPropagation();
                        setSchemaDialog(table);
                      }}
                    >
                      <Info className="size-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {schemaDialog && (
        <SqlTableSchemaDialog
          table={schemaDialog}
          tables={tables}
          onClose={() => setSchemaDialog(null)}
        />
      )}

      <SqlSeedManagerDialog
        open={seedDialogOpen}
        activeSeed={activeSeed}
        seeds={seedsQuery.data?.seeds ?? []}
        isLoading={seedsQuery.isLoading || seedsQuery.isFetching}
        isActivating={activateSeedMutation.isPending}
        onClose={() => setSeedDialogOpen(false)}
        onActivate={handleActivateSeed}
      />

      {erdQuery.data?.mmd && (
        <SqlErdDialog
          open={erdDialogOpen}
          seedFileName={meta?.seedFile ?? ""}
          mmd={erdQuery.data.mmd}
          onClose={() => setErdDialogOpen(false)}
        />
      )}
    </>
  );
}
