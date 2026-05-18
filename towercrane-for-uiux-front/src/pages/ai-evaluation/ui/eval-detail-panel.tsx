import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { EvalRadarChart } from './eval-radar-chart'
import {
  useCreateEvalItem,
  useDeleteEvalItem,
  useEvalItems,
  useEvalSummary,
  useUpsertScore,
} from '../../../features/ai-evaluation/model/use-ai-evaluation-queries'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import type { EvalCategory, EvalItem, Evaluatee } from '../../../entities/ai-evaluation/model/types'

const CATEGORY_IDS = ['cat_tech', 'cat_collab', 'cat_prod']

// ── 항목 추가 다이얼로그 ──────────────────────────────────────────────────────

function AddItemDialog({
  evaluateeId,
  categoryId,
  categoryName,
  onClose,
}: {
  evaluateeId: string
  categoryId: string
  categoryName: string
  onClose: () => void
}) {
  const create = useCreateEvalItem(evaluateeId)
  const [form, setForm] = useState({ title: '', description: '' })

  const handleSubmit = async () => {
    if (!form.title.trim()) return
    await create.mutateAsync({
      categoryId,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-surface-border-soft bg-surface-raised shadow-xl">
        <div className="flex items-center justify-between border-b border-surface-border-soft px-6 py-4">
          <p className="text-base font-black text-text-primary">
            항목 추가 — {categoryName}
          </p>
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
            <label className="text-xs font-bold text-text-secondary">항목명 *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="예: 아키텍처 설계 능력"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-secondary">설명 (선택)</label>
            <Input
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="항목에 대한 간단한 설명"
            />
          </div>
          <div className="flex justify-end pt-1">
            <Button
              onClick={handleSubmit}
              disabled={create.isPending || !form.title.trim()}
            >
              {create.isPending ? '추가 중…' : '추가'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 평가 항목 행 ──────────────────────────────────────────────────────────────

function EvalItemRow({
  item,
  evaluateeId,
}: {
  item: EvalItem
  evaluateeId: string
}) {
  const upsertScore = useUpsertScore(evaluateeId)
  const deleteItem = useDeleteEvalItem(evaluateeId)
  const [score, setScore] = useState(String(item.score ?? 0))
  const [note, setNote] = useState(item.note ?? '')

  const save = () => {
    const n = Math.min(10, Math.max(0, Number(score) || 0))
    setScore(String(n))
    upsertScore.mutate({ itemId: item.id, body: { score: n, note: note || undefined } })
  }

  return (
    <div className="group flex items-start gap-3 rounded-lg border border-surface-border-soft bg-surface-raised px-4 py-3 transition-colors hover:border-brand-border/40">
      {/* 순번 */}
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded text-[11px] font-black text-text-muted">
        {item.displayOrder + 1}
      </span>

      {/* 제목 + 설명 */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-text-primary leading-snug">{item.title}</p>
        {item.description && (
          <p className="mt-0.5 text-[11px] text-text-muted">{item.description}</p>
        )}
        {/* 메모 */}
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={save}
          placeholder="자기 평가 메모…"
          className="mt-2 w-full rounded border border-surface-border-soft bg-surface-muted px-2.5 py-1.5 text-xs text-text-secondary outline-none transition placeholder:text-text-muted focus:border-brand-border focus:ring-1 focus:ring-brand-border"
        />
      </div>

      {/* 점수 입력 */}
      <div className="flex shrink-0 flex-col items-center gap-1">
        <input
          type="number"
          min={0}
          max={10}
          value={score}
          onChange={(e) => setScore(e.target.value)}
          onBlur={save}
          className="w-16 rounded-md border border-surface-border-soft bg-surface-muted px-2 py-1.5 text-center text-sm font-black text-text-primary outline-none transition focus:border-brand-border focus:ring-1 focus:ring-brand-border"
        />
        <span className="text-[10px] text-text-muted">/ 10</span>
      </div>

      {/* 삭제 */}
      <button
        type="button"
        onClick={() => deleteItem.mutate(item.id)}
        className="mt-0.5 shrink-0 rounded-md p-1.5 text-text-muted opacity-0 transition-all hover:text-red-500 group-hover:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )
}

// ── 탭 패널 (카테고리 하나) ───────────────────────────────────────────────────

function EvalTabPanel({
  category,
  evaluateeId,
}: {
  category: EvalCategory
  evaluateeId: string
}) {
  const [showAdd, setShowAdd] = useState(false)
  const subtotal = category.items.reduce((s, i) => s + (i.score ?? 0), 0)
  const maxScore = category.items.length * 10

  return (
    <div className="flex flex-col gap-3 p-5">
      {/* 소계 바 */}
      <div className="flex items-center justify-between rounded-lg border border-surface-border-soft bg-surface-muted px-4 py-2.5">
        <span className="text-xs font-bold text-text-secondary">소계</span>
        <span className="text-sm font-black text-brand-primary">
          {subtotal}
          <span className="text-text-muted font-normal"> / {maxScore}점</span>
        </span>
      </div>

      {/* 항목 목록 */}
      {category.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border py-8 text-center text-sm text-text-muted">
          아직 항목이 없습니다. 아래 버튼으로 추가하세요.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {category.items.map((item) => (
            <EvalItemRow key={item.id} item={item} evaluateeId={evaluateeId} />
          ))}
        </div>
      )}

      {/* 추가 버튼 */}
      <button
        type="button"
        onClick={() => setShowAdd(true)}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-brand-border bg-brand-glass py-2.5 text-xs font-bold text-brand-primary transition-colors hover:bg-brand-glass/80"
      >
        <Plus className="size-3.5" />
        항목 추가
      </button>

      {showAdd && (
        <AddItemDialog
          evaluateeId={evaluateeId}
          categoryId={category.id}
          categoryName={category.name}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

// ── 우측 상세 패널 ────────────────────────────────────────────────────────────

export function EvalDetailPanel({ evaluatee }: { evaluatee: Evaluatee }) {
  const itemsQuery = useEvalItems(evaluatee.id)
  const summaryQuery = useEvalSummary(evaluatee.id)
  const [activeTab, setActiveTab] = useState(CATEGORY_IDS[0])

  const categories: EvalCategory[] = itemsQuery.data ?? []
  const summary = summaryQuery.data

  const tabLabel = (catId: string, name: string) => {
    const catSummary = summary?.categories.find((c) => c.id === catId)
    if (catSummary) return `${name} (${catSummary.score}/${catSummary.maxScore})`
    return name
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* 대상자 헤더 */}
      <div className="border-b border-brand-border bg-brand-glass px-6 py-5">
        {/* 이름 + 역할 */}
        <div className="mb-4">
          <h2 className="text-xl font-black text-text-primary">{evaluatee.name}</h2>
          {evaluatee.role && (
            <p className="mt-0.5 text-sm text-text-secondary">{evaluatee.role}</p>
          )}
          {evaluatee.description && (
            <p className="mt-1 text-xs text-text-muted">{evaluatee.description}</p>
          )}
        </div>

        {summary && (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
            {/* 레이더차트 */}
            <div className="w-full lg:w-56 shrink-0">
              <EvalRadarChart summary={summary} />
            </div>

            {/* 총점 + 카테고리 카드 */}
            <div className="flex flex-1 flex-col gap-3">
              {/* 총점 */}
              <div className="rounded-xl border border-brand-border bg-surface-raised px-5 py-3 shadow-sm">
                <p className="text-xs font-bold text-text-muted">총점</p>
                <p className="mt-0.5 text-3xl font-black text-brand-primary leading-none">
                  {summary.totalScore}
                  <span className="text-base font-normal text-text-muted"> / {summary.maxScore}</span>
                </p>
                {/* 진행 바 */}
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-brand-primary transition-all duration-500"
                    style={{ width: `${Math.round((summary.totalScore / (summary.maxScore || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* 카테고리별 카드 */}
              <div className="grid grid-cols-3 gap-2">
                {summary.categories.map((cat) => {
                  const pct = Math.round((cat.score / (cat.maxScore || 1)) * 100)
                  return (
                    <div
                      key={cat.id}
                      className="rounded-lg border border-surface-border-soft bg-surface-muted px-3 py-2.5"
                    >
                      <p className="text-[10px] font-bold text-text-muted truncate">{cat.name}</p>
                      <p className="mt-0.5 text-lg font-black text-text-primary leading-none">
                        {cat.score}
                        <span className="text-xs font-normal text-text-muted"> / {cat.maxScore}</span>
                      </p>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-raised">
                        <div
                          className="h-full rounded-full bg-brand-primary transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 탭 */}
      {itemsQuery.isLoading ? (
        <div className="space-y-3 p-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-muted" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col flex-1">
          {/* 탭 헤더 */}
          <div className="flex border-b border-surface-border-soft px-5 pt-4">
            {categories.map((cat) => {
              const active = activeTab === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveTab(cat.id)}
                  className={[
                    'relative px-4 py-2.5 text-sm font-bold transition-colors',
                    'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-t-full after:transition-colors',
                    active
                      ? 'text-brand-primary after:bg-brand-primary'
                      : 'text-text-muted hover:text-text-primary after:bg-transparent',
                  ].join(' ')}
                >
                  {tabLabel(cat.id, cat.name)}
                </button>
              )
            })}
          </div>

          {/* 탭 콘텐츠 */}
          {categories.map((cat) =>
            activeTab === cat.id ? (
              <div key={cat.id} className="flex-1 overflow-y-auto">
                <EvalTabPanel category={cat} evaluateeId={evaluatee.id} />
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  )
}
