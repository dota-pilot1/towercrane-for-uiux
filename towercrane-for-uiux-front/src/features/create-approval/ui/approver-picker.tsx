import { useId, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Building2,
  CheckCircle2,
  ChevronRight,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { useOrgTree, type OrgNode } from '../../../shared/api/org'

export type PickedApprover = { id: string; name: string; position: string | null }

function OrgPickerNode({
  node,
  depth,
  pickedIds,
  onPick,
}: {
  node: OrgNode
  depth: number
  pickedIds: Set<string>
  onPick: (m: PickedApprover) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const contentId = useId()

  return (
    <div>
      <button
        type="button"
        aria-controls={contentId}
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-1.5 rounded-md py-1 pr-1 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary"
        style={{ paddingLeft: depth * 12 }}
      >
        <ChevronRight
          className={`size-3.5 shrink-0 transition-transform duration-200 ease-out ${
            expanded ? 'rotate-90' : 'rotate-0'
          }`}
        />
        <Building2 className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
      </button>
      <div
        id={contentId}
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
          expanded
            ? 'grid-rows-[1fr] opacity-100'
            : 'pointer-events-none grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          {node.members.map((m) => {
            const picked = pickedIds.has(m.id)
            return (
              <button
                key={m.id}
                type="button"
                disabled={picked}
                onClick={() => onPick({ id: m.id, name: m.name, position: m.position })}
                className="w-full flex items-center gap-2 py-1.5 pr-2 rounded-md hover:bg-surface-muted transition-colors disabled:opacity-40 disabled:hover:bg-transparent text-left"
                style={{ paddingLeft: depth * 12 + 34 }}
              >
                <span className="flex-1 min-w-0 truncate text-[13px] text-text-primary">
                  {m.name}
                  {m.position && <span className="text-[11px] text-text-muted ml-1">{m.position}</span>}
                </span>
                {picked ? (
                  <CheckCircle2 className="size-4 text-brand-primary shrink-0" />
                ) : (
                  <UserPlus className="size-4 text-text-muted shrink-0" />
                )}
              </button>
            )
          })}
          {node.children.map((c) => (
            <OrgPickerNode
              key={c.id}
              node={c}
              depth={depth + 1}
              pickedIds={pickedIds}
              onPick={onPick}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ApproverPicker({
  approvers,
  onChange,
}: {
  approvers: PickedApprover[]
  onChange: (a: PickedApprover[]) => void
}) {
  const orgQuery = useOrgTree()
  const pickedIds = useMemo(() => new Set(approvers.map((a) => a.id)), [approvers])

  const add = (m: PickedApprover) => {
    if (pickedIds.has(m.id)) return
    if (approvers.length >= 5) return
    onChange([...approvers, m])
  }
  const remove = (id: string) => onChange(approvers.filter((a) => a.id !== id))
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...approvers]
    const j = idx + dir
    if (j < 0 || j >= next.length) return
    ;[next[idx], next[j]] = [next[j], next[idx]]
    onChange(next)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
          결재선 (순서대로 · 최대 5)
        </p>
        {approvers.length === 0 ? (
          <div className="flex items-center justify-center h-24 rounded-lg border border-dashed border-surface-border text-[12px] text-text-muted">
            오른쪽에서 결재자를 선택하세요
          </div>
        ) : (
          <div className="space-y-1.5">
            {approvers.map((a, idx) => (
              <div
                key={a.id}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-muted border border-surface-border-soft"
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-brand-glass text-brand-primary text-[11px] font-bold shrink-0">
                  {idx + 1}
                </span>
                <span className="flex-1 min-w-0 truncate text-[13px] text-text-primary">
                  {a.name}
                  {a.position && <span className="text-[11px] text-text-muted ml-1">{a.position}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === approvers.length - 1}
                  className="text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
                >
                  <ArrowDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  className="text-text-muted hover:text-destructive transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">조직도</p>
        <div className="h-56 overflow-y-auto rounded-lg border border-surface-border-soft bg-surface-raised p-2">
          {orgQuery.isLoading && (
            <p className="text-[12px] text-text-muted p-2">조직도 불러오는 중…</p>
          )}
          {orgQuery.error && (
            <p className="text-[12px] text-destructive p-2">{(orgQuery.error as Error).message}</p>
          )}
          {orgQuery.data?.map((node) => (
            <OrgPickerNode key={node.id} node={node} depth={0} pickedIds={pickedIds} onPick={add} />
          ))}
          {orgQuery.data?.length === 0 && (
            <p className="text-[12px] text-text-muted p-2">조직도에 등록된 부서가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}
