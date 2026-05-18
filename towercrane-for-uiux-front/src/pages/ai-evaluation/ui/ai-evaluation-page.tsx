import { useState } from 'react'
import { ClipboardCheck, Plus, Trash2, UserRound } from 'lucide-react'
import {
  useCreateEvaluatee,
  useDeleteEvaluatee,
  useEvaluatees,
} from '../../../features/ai-evaluation/model/use-ai-evaluation-queries'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import type { Evaluatee } from '../../../entities/ai-evaluation/model/types'
import { EvalDetailPanel } from './eval-detail-panel'

// ── 대상자 등록 다이얼로그 ────────────────────────────────────────────────────

function AddEvaluateeDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateEvaluatee()
  const [form, setForm] = useState({ name: '', role: '', description: '' })

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    await create.mutateAsync({
      name: form.name.trim(),
      role: form.role.trim() || undefined,
      description: form.description.trim() || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-surface-border-soft bg-surface-raised shadow-xl">
        <div className="flex items-center justify-between border-b border-surface-border-soft px-6 py-4">
          <p className="text-base font-black text-text-primary">대상자 등록</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-surface-border px-4 py-1.5 text-sm font-bold text-text-muted transition-colors hover:bg-surface-muted"
          >
            취소
          </button>
        </div>
        <div className="flex flex-col gap-4 p-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-secondary">이름 *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="홍길동"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-secondary">역할/직책</label>
            <Input
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              placeholder="풀스택, 프론트엔드, 백엔드 …"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-secondary">한줄 소개</label>
            <Input
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="선택 사항"
            />
          </div>
          <div className="flex justify-end pt-1">
            <Button
              onClick={handleSubmit}
              disabled={create.isPending || !form.name.trim()}
            >
              {create.isPending ? '등록 중…' : '등록'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 목록 아이템 ───────────────────────────────────────────────────────────────

function EvaluateeItem({
  item,
  active,
  onSelect,
  onDelete,
}: {
  item: Evaluatee
  active: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'group relative flex w-full items-center gap-3 overflow-hidden rounded-lg border px-4 py-3.5 text-left shadow-sm transition-all duration-150',
        'before:absolute before:inset-y-3 before:left-0 before:w-1 before:rounded-r-full before:bg-brand-primary before:transition-opacity',
        active
          ? 'border-brand-border bg-brand-glass before:opacity-100 shadow-md'
          : 'border-surface-border-soft bg-surface-raised before:opacity-0 hover:-translate-y-0.5 hover:border-brand-border hover:shadow-md hover:before:opacity-60',
      ].join(' ')}
    >
      {/* 아바타 */}
      <div
        className={[
          'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-black transition-colors',
          active
            ? 'bg-brand-primary text-surface-raised'
            : 'bg-brand-glass text-brand-primary group-hover:bg-brand-primary group-hover:text-surface-raised',
        ].join(' ')}
      >
        {item.name.charAt(0)}
      </div>

      {/* 이름 / 역할 */}
      <div className="min-w-0 flex-1">
        <p
          className={[
            'truncate text-sm font-bold leading-snug',
            active ? 'text-brand-primary' : 'text-text-primary group-hover:text-brand-primary',
          ].join(' ')}
        >
          {item.name}
        </p>
        {item.role && (
          <p
            className={[
              'mt-0.5 truncate text-[11px] transition-colors',
              active ? 'text-brand-primary/70' : 'text-text-muted group-hover:text-text-secondary',
            ].join(' ')}
          >
            {item.role}
          </p>
        )}
      </div>

      {/* 삭제 버튼 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="shrink-0 rounded-md p-1.5 text-text-muted opacity-0 transition-all hover:text-red-500 group-hover:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </button>
  )
}

// ── 빈 상태 (우측) ────────────────────────────────────────────────────────────

function EmptyDetail() {
  return (
    <div className="flex h-full min-h-96 flex-col items-center justify-center gap-3 bg-surface-muted px-8 py-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl border border-brand-border bg-brand-glass">
        <ClipboardCheck className="size-6 text-brand-primary" />
      </div>
      <p className="text-sm font-bold text-text-primary">대상자를 선택하세요</p>
      <p className="text-xs text-text-muted">
        왼쪽 목록에서 선택하면 평가 항목을 입력할 수 있습니다.
      </p>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export function AiEvaluationPage() {
  const evaluateesQuery = useEvaluatees()
  const deleteEvaluatee = useDeleteEvaluatee()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const evaluatees = evaluateesQuery.data ?? []

  const handleDelete = async (id: string) => {
    if (!window.confirm('대상자를 삭제하시겠습니까? 모든 평가 항목도 함께 삭제됩니다.')) return
    await deleteEvaluatee.mutateAsync(id)
    if (selectedId === id) setSelectedId(null)
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-5 px-4 py-6 lg:px-8">
      {/* 헤더 */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">AI 활용 능력 평가</h1>
          <p className="mt-1 text-sm text-text-secondary">
            기술 역량 · 협업 역량 · 업무 생산성 — 30항목 / 300점 만점
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="mr-1.5 size-3.5" />
          대상자 추가
        </Button>
      </div>

      {/* 스플릿 뷰 */}
      <div
        className="grid gap-5 lg:grid-cols-[minmax(280px,0.4fr)_minmax(0,1fr)]"
        style={{ minHeight: 640 }}
      >
        {/* 좌측: 대상자 목록 */}
        <section className="flex flex-col overflow-hidden rounded-xl border border-surface-border-soft bg-surface-raised shadow-sm">
          <div className="flex items-center gap-2 border-b border-surface-border-soft bg-surface-muted px-4 py-3">
            <UserRound className="size-4 text-brand-primary" />
            <span className="text-xs font-black uppercase tracking-widest text-text-muted">
              대상자 목록
            </span>
            <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-brand-primary text-[11px] font-black text-surface-raised">
              {evaluatees.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {evaluateesQuery.isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-muted" />
                ))}
              </div>
            ) : evaluatees.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl border border-surface-border bg-surface-muted">
                  <UserRound className="size-5 text-text-muted" />
                </div>
                <p className="text-sm text-text-muted">등록된 대상자가 없습니다.</p>
                <button
                  type="button"
                  onClick={() => setShowAdd(true)}
                  className="text-xs font-bold text-brand-primary hover:underline"
                >
                  + 대상자 추가
                </button>
              </div>
            ) : (
              <ul className="space-y-1.5 p-3">
                {evaluatees.map((ev) => (
                  <li key={ev.id}>
                    <EvaluateeItem
                      item={ev}
                      active={ev.id === selectedId}
                      onSelect={() => setSelectedId(ev.id)}
                      onDelete={() => handleDelete(ev.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 우측: 평가 상세 */}
        <section className="overflow-hidden rounded-xl border border-surface-border-soft bg-surface-raised shadow-sm">
          {selectedId ? (
            <EvalDetailPanel
              key={selectedId}
              evaluatee={evaluatees.find((e) => e.id === selectedId)!}
            />
          ) : (
            <EmptyDetail />
          )}
        </section>
      </div>

      {showAdd && <AddEvaluateeDialog onClose={() => setShowAdd(false)} />}
    </div>
  )
}
