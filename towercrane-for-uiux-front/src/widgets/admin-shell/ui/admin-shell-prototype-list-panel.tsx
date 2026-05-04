import { ChevronLeft, ChevronRight, FileText, Star } from 'lucide-react'

import { EditPrototypeDialog } from '../../../features/prototype-management/ui/edit-prototype-dialog'
import { DeletePrototypeButton } from '../../../features/prototype-management/ui/delete-prototype-button'
import { AddPrototypeDialog } from '../../../features/prototype-management/ui/add-prototype-dialog'
import {
  PrototypeDetailDialog,
} from '../../../features/prototype-review/ui/prototype-detail-page'
import type { PrototypeListItem, PrototypeListSort } from '../../../shared/api/catalog'
import type { ScenarioCategory } from '../../../shared/config/catalog'
import { ActionIconButton } from '../../../shared/ui/action-icon-button'
import { CompactSelect } from '../../../shared/ui/compact-select'
import { SearchField } from '../../../shared/ui/search-field'

type AdminShellPrototypeListPanelProps = {
  selectedCategory: ScenarioCategory
  prototypeList: PrototypeListItem[]
  isLoading: boolean
  isFetching: boolean
  totalPages: number
  totalCount: number
  page: number
  sort: PrototypeListSort
  search: string
  searchInput: string
  isAuthenticated: boolean
  canManagePrototype: boolean
  insetClassName: string
  onSearchInputChange: (value: string) => void
  onSearchSubmit: () => void
  onSearchEscape: () => void
  onSortChange: (value: PrototypeListSort) => void
  onSelectPrototype: (prototypeId: string) => void
  onOpenDoc: (prototypeId: string) => void
  onPrevPage: () => void
  onNextPage: () => void
}

export function AdminShellPrototypeListPanel({
  selectedCategory,
  prototypeList,
  isLoading,
  isFetching,
  totalPages,
  totalCount,
  page,
  sort,
  search,
  searchInput,
  isAuthenticated,
  canManagePrototype,
  insetClassName,
  onSearchInputChange,
  onSearchSubmit,
  onSearchEscape,
  onSortChange,
  onSelectPrototype,
  onOpenDoc,
  onPrevPage,
  onNextPage,
}: AdminShellPrototypeListPanelProps) {
  return (
    <div className="ui-panel flex-1 min-h-0 overflow-y-auto border-brand-border/20 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--primary)_4%,var(--card))_0%,var(--card)_9rem)]">
      <div className={`flex items-center gap-3 border-b border-brand-border/20 bg-brand-glass/40 ${insetClassName} pb-4 pt-5`}>
        <form
          className="group relative min-w-0 flex-1"
          onSubmit={(e) => {
            e.preventDefault()
            onSearchSubmit()
          }}
        >
          <SearchField
            type="text"
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return
              if (e.key === 'Escape') onSearchEscape()
            }}
            hint="Enter"
            placeholder="제목·요약 검색..."
            wrapperClassName="h-9"
          />
        </form>
        <CompactSelect
          value={sort}
          onChange={(e) => onSortChange(e.target.value as PrototypeListSort)}
          wrapperClassName="w-[88px]"
          className="h-9 text-[10px] font-medium"
        >
          <option value="recent">최신순</option>
          <option value="oldest">오래된순</option>
          <option value="title">제목순</option>
        </CompactSelect>

        {isAuthenticated && (
          <div className="shrink-0">
            <AddPrototypeDialog
              categoryId={selectedCategory.id}
              categoryTitle={selectedCategory.title}
              asIcon
              size="sm-icon"
            />
          </div>
        )}
      </div>

      <div className={`space-y-4 ${insetClassName} pt-4`}>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-text-muted">
            프로토타입 불러오는 중...
          </div>
        ) : prototypeList.length > 0 ? (
          prototypeList.map((proto) => {
            return (
              <div
                key={proto.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectPrototype(proto.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelectPrototype(proto.id)
                  }
                }}
                className="group relative cursor-pointer overflow-hidden rounded-sm border border-surface-border bg-surface-raised px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-border/70 hover:bg-surface-muted hover:shadow-[0_12px_28px_color-mix(in_srgb,var(--primary)_7%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="ui-text-primary text-base font-semibold tracking-tight">
                        {proto.title}
                      </h3>
                      <span className="ui-text-muted font-mono text-[10px]">
                        {new Date(proto.updatedAt).toLocaleDateString()}
                      </span>
                      <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[10px] font-bold uppercase text-brand-primary">
                        {proto.status}
                      </span>
                      {proto.reviewCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[10px] font-bold text-brand-primary">
                          <Star className="size-3 fill-brand-primary text-brand-primary" />
                          {proto.avgRating.toFixed(1)}
                          <span className="font-normal text-brand-primary/60">
                            ({proto.reviewCount})
                          </span>
                        </span>
                      ) : null}
                    </div>
                    <p className="max-w-2xl text-sm leading-relaxed ui-text-secondary">
                      {proto.summary}
                    </p>
                    <div className="flex max-w-2xl flex-wrap items-center gap-1.5">
                      {proto.tags.map((tag) => (
                        <span
                          key={`${proto.id}-${tag}`}
                          className="inline-flex min-h-5 items-center rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-0.5 text-[10px] font-semibold ui-text-muted"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div
                    className="flex shrink-0 flex-wrap items-center justify-end gap-1.5"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {isAuthenticated && canManagePrototype && (
                      <div className="mr-1.5 flex items-center gap-1.5 border-r border-surface-border-soft pr-1.5">
                        <EditPrototypeDialog
                          categoryId={selectedCategory.id}
                          prototype={proto}
                          asIcon
                          size="sm-icon"
                        />
                        <DeletePrototypeButton
                          categoryId={selectedCategory.id}
                          prototypeId={proto.id}
                          asIcon
                          size="sm-icon"
                        />
                      </div>
                    )}
                    <ActionIconButton
                      icon={FileText}
                      size="sm-icon"
                      onClick={() => onOpenDoc(proto.id)}
                      title="문서 보기"
                      aria-label="문서 보기"
                    />
                    <PrototypeDetailDialog prototype={proto} size="sm-icon" />
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-sm border border-dashed border-[var(--surface-border)] bg-[var(--surface-muted)] py-10 text-center">
            <p className="text-sm ui-text-muted">
              {search
                ? `"${search}" 에 해당하는 프로토타입이 없습니다.`
                : '등록된 프로토타입이 없습니다.'}
            </p>
          </div>
        )}
      </div>

      {totalCount > 0 ? (
        <div
          className={`mt-5 flex items-center justify-between gap-3 border-t border-surface-border ${insetClassName} pb-5 pt-5`}
        >
          <div className="ui-text-muted text-[11px] uppercase tracking-[0.18em]">
            Page {page} / {totalPages} · {totalCount} total
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevPage}
              disabled={page <= 1 || isFetching}
              className="inline-flex size-7 items-center justify-center rounded-sm border border-surface-border bg-surface-muted ui-text-secondary hover:bg-surface-strong disabled:pointer-events-none disabled:opacity-40"
              aria-label="이전 페이지"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={onNextPage}
              disabled={page >= totalPages || isFetching}
              className="inline-flex size-7 items-center justify-center rounded-sm border border-surface-border bg-surface-muted ui-text-secondary hover:bg-surface-strong disabled:pointer-events-none disabled:opacity-40"
              aria-label="다음 페이지"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
