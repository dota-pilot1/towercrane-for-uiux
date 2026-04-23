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
  onOpenDoc,
  onPrevPage,
  onNextPage,
}: AdminShellPrototypeListPanelProps) {
  return (
    <div className="ui-panel flex-1 min-h-0 overflow-y-auto">
      <div className={`mb-3 flex items-center gap-2 ${insetClassName} pt-4`}>
        <form
          className="relative flex-1 group"
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
            wrapperClassName="h-10"
          />
        </form>
        <CompactSelect
          value={sort}
          onChange={(e) => onSortChange(e.target.value as PrototypeListSort)}
          wrapperClassName="w-[76px]"
          className="h-9 pl-3 pr-7 text-[10px] font-medium"
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

      <div className={`space-y-3 ${insetClassName}`}>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-text-muted">
            프로토타입 불러오는 중...
          </div>
        ) : prototypeList.length > 0 ? (
          prototypeList.map((proto) => (
            <div key={proto.id} className="group relative py-1.5 transition-all">
              <div className="absolute bottom-0 left-[-18px] top-0 w-px bg-[var(--surface-border)] transition-colors group-hover:bg-brand-primary/30" />
              <div className="absolute left-[-22px] top-3 size-2 rounded-full border border-[var(--surface-border)] bg-[var(--surface-strong)] transition-colors group-hover:bg-brand-primary" />
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
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
                      <span className="inline-flex items-center gap-1 rounded-sm border border-[color:color-mix(in_srgb,var(--brand-500)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--brand-glass)_80%,transparent)] px-2 py-0.5 text-[10px] font-bold text-brand-primary">
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
                  {proto.tags.length > 0 ? (
                    <div className="flex max-w-2xl flex-wrap gap-1.5">
                      {proto.tags.map((tag) => (
                        <span
                          key={`${proto.id}-${tag}`}
                          className="rounded-sm border border-[var(--surface-border)] bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-medium ui-text-secondary"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    ) : null}
                </div>
                <div className="flex items-center gap-1.5">
                  {isAuthenticated && canManagePrototype && (
                    <>
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
                    </>
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
          ))
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
          className={`mt-3 flex items-center justify-between gap-3 border-t border-[var(--surface-border)] ${insetClassName} pb-4 pt-3`}
        >
          <div className="ui-text-muted text-[11px] uppercase tracking-widest">
            Page {page} / {totalPages} · {totalCount} total
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPrevPage}
              disabled={page <= 1 || isFetching}
              className="inline-flex size-7 items-center justify-center rounded-sm border border-[var(--surface-border)] bg-[var(--surface-muted)] ui-text-secondary hover:bg-[var(--surface-strong)] disabled:pointer-events-none disabled:opacity-40"
              aria-label="이전 페이지"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={onNextPage}
              disabled={page >= totalPages || isFetching}
              className="inline-flex size-7 items-center justify-center rounded-sm border border-[var(--surface-border)] bg-[var(--surface-muted)] ui-text-secondary hover:bg-[var(--surface-strong)] disabled:pointer-events-none disabled:opacity-40"
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
