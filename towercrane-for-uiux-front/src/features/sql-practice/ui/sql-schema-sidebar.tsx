import { Database, Info, RefreshCw, Table2 } from "lucide-react";
import { useState } from "react";
import type {
  SqlPracticeMeta,
  SqlPracticeSeedLevel,
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
import { SqlSeedManageDialog } from "./sql-seed-manage-dialog";
import { SqlSeedManagerDialog } from "./sql-seed-manager-dialog";
import { SqlTableSchemaDialog } from "./sql-table-schema-dialog";

type SqlSchemaSidebarProps = {
  meta?: SqlPracticeMeta;
  tables: TableInfo[];
  selectedTable: string | null;
  isLoading: boolean;
  isResetting: boolean;
  onSelectTable: (tableName: string) => void;
  onRefresh: () => void;
  onReset: () => void;
  onSeedActivated: () => void;
  swapOpen: boolean;
  onSwapOpenChange: (open: boolean) => void;
  manageOpen: boolean;
  onManageOpenChange: (open: boolean) => void;
};

export function SqlSchemaSidebar({
  meta,
  tables,
  selectedTable,
  isLoading,
  isResetting,
  onSelectTable,
  onRefresh,
  onReset,
  onSeedActivated,
  swapOpen,
  onSwapOpenChange,
  manageOpen,
  onManageOpenChange,
}: SqlSchemaSidebarProps) {
  const [schemaDialog, setSchemaDialog] = useState<TableInfo | null>(null);
  const [erdDialogOpen, setErdDialogOpen] = useState(false);
  const seedsQuery = useSqlPracticeSeeds();
  const erdQuery = useSqlPracticeErd(meta?.seedFile);
  const activateSeedMutation = useActivateSqlPracticeSeed({
    onSuccess: () => {
      onSeedActivated();
      onSwapOpenChange(false);
    },
  });
  const isAdmin = useSessionStore((s) => s.userRole === "admin");

  const seeds = seedsQuery.data?.seeds ?? [];
  const activeSeed =
    seeds.find((seed) => seed.isActive) ?? meta?.activeSeed;
  const tableCount = meta?.tableCount ?? tables.length;

  const handleActivateSeed = (seed: SqlPracticeSeedSummary) => {
    return activateSeedMutation.mutateAsync({
      source: seed.source,
      fileName: seed.fileName,
    });
  };

  return (
    <>
      <aside className="ui-panel flex h-full min-h-0 w-[340px] shrink-0 flex-col overflow-hidden rounded-md p-0">
        <div className="border-b border-surface-border p-3">
          <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-text-muted">
            문제 세트
          </h2>
          <div className="mt-2 rounded-md border border-surface-border-soft bg-surface-muted p-3">
            <div className="flex items-center gap-2">
              <span className="ui-icon-button-brand size-7 shrink-0">
                <Database className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-text-primary">
                  {activeSeed?.title ?? meta?.seedFile ?? "연습 세트"}
                </p>
                <p className="truncate text-[11px] text-text-muted">
                  {activeSeed?.fileName ?? meta?.seedFile ?? ""}
                </p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {activeSeed && (
                <span className="rounded-sm border border-surface-border-soft bg-surface-raised px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                  {levelLabel(activeSeed.level)}
                </span>
              )}
              <span className="rounded-sm border border-surface-border-soft bg-surface-raised px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                테이블 {tableCount}개
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
          <h2 className="text-sm font-bold text-text-primary">
            테이블
            <span className="ml-1.5 text-xs font-semibold text-text-muted">
              {tableCount}
            </span>
          </h2>
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
                  <div key={table.tableName}>
                    <button
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
                  </div>
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
        open={swapOpen}
        activeSeed={activeSeed}
        seeds={seedsQuery.data?.seeds ?? []}
        isLoading={seedsQuery.isLoading || seedsQuery.isFetching}
        isActivating={activateSeedMutation.isPending}
        onClose={() => onSwapOpenChange(false)}
        onActivate={handleActivateSeed}
      />

      <SqlSeedManageDialog
        open={manageOpen}
        onClose={() => onManageOpenChange(false)}
        seeds={seedsQuery.data?.seeds ?? []}
        isLoading={seedsQuery.isLoading || seedsQuery.isFetching}
        isAdmin={isAdmin}
        isResetting={isResetting}
        onReset={onReset}
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

function levelLabel(level: SqlPracticeSeedLevel) {
  const labels: Record<SqlPracticeSeedLevel, string> = {
    beginner: "초급",
    basic: "기본",
    intermediate: "중급",
    advanced: "고급",
  };
  return labels[level];
}
