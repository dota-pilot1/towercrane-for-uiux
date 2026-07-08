import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "../../shared/ui/button";
import { useApiEnvStore } from "../../features/api-doc/api-env-store";
import type {
  ApiEnvironment,
  ApiEnvironmentVariable,
} from "../../features/api-doc/types";

function EnvironmentDialog({ onClose }: { onClose: () => void }) {
  const environments = useApiEnvStore((s) => s.environments);
  const activeEnvId = useApiEnvStore((s) => s.activeEnvId);
  const setActiveEnv = useApiEnvStore((s) => s.setActiveEnv);
  const updateEnvironments = useApiEnvStore((s) => s.updateEnvironments);

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
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
      <div className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div>
            <p className="text-[15px] font-black text-slate-800">환경 변수</p>
            <p className="mt-0.5 text-[12px] text-slate-400">
              {"{{API_BASE}} 처럼 요청 URL·header·body에서 사용할 수 있습니다."}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-8 rounded-lg border-0"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {environments.map((env) => (
              <button
                key={env.id}
                onClick={() => selectEnvironment(env)}
                className={
                  "rounded-md border px-3 py-1.5 text-[12px] font-bold " +
                  (activeEnvId === env.id
                    ? "border-brand-border bg-brand-glass text-brand-primary"
                    : "border-surface-border bg-surface-muted text-text-muted hover:text-text-primary")
                }
              >
                {env.name}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_minmax(0,1fr)_36px] gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <span>Key</span>
              <span>Value</span>
              <span>Description</span>
              <span />
            </div>
            <div className="divide-y divide-slate-100">
              {draft.map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_minmax(0,1fr)_36px] items-center gap-2 px-3 py-2"
                >
                  <input
                    value={row.key}
                    onChange={(e) => updateRow(index, "key", e.target.value)}
                    className="min-w-0 rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[12px] text-slate-800 outline-none focus:border-emerald-500"
                  />
                  <input
                    value={row.value}
                    onChange={(e) => updateRow(index, "value", e.target.value)}
                    className="min-w-0 rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[12px] text-slate-800 outline-none focus:border-emerald-500"
                  />
                  <input
                    value={row.description ?? ""}
                    onChange={(e) => updateRow(index, "description", e.target.value)}
                    className="min-w-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-800 outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() =>
                      setDraft((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="flex size-7 items-center justify-center rounded-md text-text-muted hover:bg-danger-glass hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setDraft((prev) => [...prev, { key: "", value: "", description: "" }])
            }
            className="mt-3 gap-1.5 rounded-md px-3 py-1.5 text-[12px]"
          >
            <Plus className="size-3.5" />
            변수 추가
          </Button>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-[13px]"
          >
            취소
          </Button>
          <Button
            size="sm"
            onClick={save}
            className="rounded-lg px-5 py-2 text-[13px]"
          >
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EnvironmentDialog;
