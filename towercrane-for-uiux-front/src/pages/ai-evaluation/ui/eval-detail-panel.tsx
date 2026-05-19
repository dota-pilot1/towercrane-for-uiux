import { useState } from 'react'
import { Plus, Trash2, List } from 'lucide-react'
import { ScoreStepper } from '../../../shared/ui/score-stepper'
import { EvalScoreChart } from './eval-radar-chart'
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

// ── 단건 추가 다이얼로그 ──────────────────────────────────────────────────────

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
  const [title, setTitle] = useState('')

  const handleSubmit = async () => {
    if (!title.trim()) return
    await create.mutateAsync({ categoryId, title: title.trim() })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-surface-border-soft bg-surface-raised shadow-xl">
        <div className="flex items-center justify-between border-b border-surface-border-soft px-6 py-4">
          <p className="text-base font-black text-text-primary">항목 추가 — {categoryName}</p>
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 아키텍처 설계 능력"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div className="flex justify-end pt-1">
            <Button onClick={handleSubmit} disabled={create.isPending || !title.trim()}>
              {create.isPending ? '추가 중…' : '추가'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 대량 추가 다이얼로그 ──────────────────────────────────────────────────────

function BulkAddDialog({
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
  const [text, setText] = useState('')

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  const handleSubmit = async () => {
    if (lines.length === 0) return
    for (const title of lines) {
      await create.mutateAsync({ categoryId, title })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-surface-border-soft bg-surface-raised shadow-xl">
        <div className="flex items-center justify-between border-b border-surface-border-soft px-6 py-4">
          <p className="text-base font-black text-text-primary">대량 추가 — {categoryName}</p>
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
            <label className="text-xs font-bold text-text-secondary">
              항목명 (한 줄에 하나씩) *
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'스프링 시큐리티로 인증 인가 구현 능력\n웹소켓 활용 능력\nCI/CD 파이프라인 구성'}
              autoFocus
              rows={6}
              className="w-full resize-none rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand-border focus:ring-1 focus:ring-brand-border"
            />
            {lines.length > 0 && (
              <p className="text-xs text-text-muted">{lines.length}개 항목 입력됨</p>
            )}
          </div>
          <div className="flex justify-end pt-1">
            <Button onClick={handleSubmit} disabled={create.isPending || lines.length === 0}>
              {create.isPending ? '추가 중…' : `${lines.length}개 추가`}
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
  const [score, setScore] = useState(item.score ?? 0)
  const [note, setNote] = useState(item.note ?? '')

  const save = (nextScore = score) => {
    upsertScore.mutate({ itemId: item.id, body: { score: nextScore, note: note || undefined } })
  }

  const saveNote = () => {
    upsertScore.mutate({ itemId: item.id, body: { score, note: note || undefined } })
  }

  return (
    <div className="group rounded-lg border border-surface-border-soft bg-surface-raised px-3 py-2 transition-colors hover:border-brand-border/40">
      {/* 상단: 순번 + 제목 + 점수 + 삭제 */}
      <div className="flex items-center gap-2">
        <span className="flex size-[26px] shrink-0 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted text-[11px] font-black text-text-muted">
          {item.displayOrder + 1}
        </span>
        <p className="min-w-0 flex-1 text-sm font-bold text-text-primary leading-snug truncate">
          {item.title}
        </p>
        {/* 점수 + 삭제 — 고정 너비로 모든 행 정렬 통일 */}
        <div className="flex shrink-0 items-center gap-2">
          <ScoreStepper
            value={score}
            min={0}
            max={10}
            onChange={(v) => { setScore(v); save(v) }}
          />
          <button
            type="button"
            onClick={() => deleteItem.mutate(item.id)}
            className="flex size-[30px] items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted text-text-muted transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* 하단: 설명 + 메모 */}
      <div className="mt-1.5 pl-7">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          placeholder="자기 평가 메모…"
          className="w-full rounded border border-surface-border-soft bg-surface-muted px-2.5 py-1.5 text-xs text-text-secondary outline-none transition placeholder:text-text-muted focus:border-brand-border focus:ring-1 focus:ring-brand-border"
        />
      </div>
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
  return (
    <div className="flex flex-col gap-2 p-3">
      {/* 항목 목록 */}
      {category.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border py-8 text-center text-sm text-text-muted">
          아직 항목이 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {category.items.map((item) => (
            <EvalItemRow key={item.id} item={item} evaluateeId={evaluateeId} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 우측 상세 패널 ────────────────────────────────────────────────────────────

export function EvalDetailPanel({ evaluatee }: { evaluatee: Evaluatee }) {
  const itemsQuery = useEvalItems(evaluatee.id)
  const summaryQuery = useEvalSummary(evaluatee.id)
  const [activeTab, setActiveTab] = useState(CATEGORY_IDS[0])
  const [showAdd, setShowAdd] = useState(false)
  const [showBulk, setShowBulk] = useState(false)

  const categories: EvalCategory[] = itemsQuery.data ?? []
  const summary = summaryQuery.data
  const activeCategory = categories.find((c) => c.id === activeTab)

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* 대상자 헤더 */}
      <div className="border-b border-brand-border bg-brand-glass px-6 py-5">
        {/* 이름 + 역할 + 총점 */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-text-primary">{evaluatee.name}</h2>
            {evaluatee.role && (
              <p className="mt-0.5 text-sm text-text-secondary">{evaluatee.role}</p>
            )}
            {evaluatee.description && (
              <p className="mt-1 text-xs text-text-muted">{evaluatee.description}</p>
            )}
          </div>
          {summary && (
            <div className="shrink-0 rounded-xl border border-brand-border bg-surface-raised px-5 py-3 text-right shadow-sm">
              <p className="text-[11px] font-bold text-text-muted">총점</p>
              <p className="text-3xl font-black text-brand-primary leading-none">
                {summary.totalScore}
                <span className="text-sm font-normal text-text-muted"> / {summary.maxScore}</span>
              </p>
            </div>
          )}
        </div>

        {/* 카테고리별 바 차트 */}
        {summary && (
          <div className="mt-5 rounded-xl border border-surface-border-soft bg-surface-raised px-5 py-4">
            <EvalScoreChart summary={summary} />
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
          <div className="flex items-center border-b border-surface-border-soft px-5 py-2">
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
                  {cat.name}
                </button>
              )
            })}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBulk(true)}
                className="flex items-center gap-1.5 rounded-md border border-surface-border-soft bg-surface-muted px-3 py-1.5 text-xs font-bold text-text-muted transition-colors hover:border-brand-border hover:text-brand-primary"
              >
                <List className="size-3.5" />
                대량 추가
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-3 py-1.5 text-xs font-bold text-brand-primary transition-colors hover:bg-brand-glass/80"
              >
                <Plus className="size-3.5" />
                항목 추가
              </button>
            </div>
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

      {showAdd && activeCategory && (
        <AddItemDialog
          evaluateeId={evaluatee.id}
          categoryId={activeCategory.id}
          categoryName={activeCategory.name}
          onClose={() => setShowAdd(false)}
        />
      )}
      {showBulk && activeCategory && (
        <BulkAddDialog
          evaluateeId={evaluatee.id}
          categoryId={activeCategory.id}
          categoryName={activeCategory.name}
          onClose={() => setShowBulk(false)}
        />
      )}
    </div>
  )
}
