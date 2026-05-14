import { GitBranch } from 'lucide-react'
import { useAdminShell } from '../model/use-admin-shell'
import { Card } from '../../../shared/ui/card'
import { PrototypeDetailPage } from '../../../features/prototype-review/ui/prototype-detail-page'
import { AdminShellCategoryHeader } from './admin-shell-category-header'
import { AdminShellEmptyState } from './admin-shell-empty-state'
import { AdminShellPrototypeListPanel } from './admin-shell-prototype-list-panel'
import { AdminShellSidebar } from './admin-shell-sidebar'

type AdminShellProps = {
  categoryId: string
  prototypeId: string | undefined
}

export function AdminShell({ categoryId, prototypeId }: AdminShellProps) {

  const {
    activeCategoryId,
    activePrototype,
    categories,
    currentUserId,
    fallbackCategoryId,
    isAuthenticated,
    isError,
    isLoading,
    openDoc,
    page,
    prototypeList,
    prototypesQuery,
    search,
    searchInput,
    selectCategory,
    selectPrototype,
    selectedCategory,
    setCategories,
    setPage,
    setSearch,
    setSearchInput,
    setSort,
    sort,
    totalCount,
    totalPages,
    userRole,
  } = useAdminShell({ categoryId, prototypeId })

  const mainPanelInsetClass = 'px-5'

  return (
    <div className="w-full min-w-0 ui-page-bg space-y-3">
      <div className="flex min-w-0 items-center gap-2 rounded-md bg-text-primary px-4 py-2">
        <GitBranch className="size-3.5 shrink-0 text-background/70" />
        <h1 className="text-sm font-black text-background">Prototype</h1>
        <span className="hidden text-xs text-background/50 sm:block">
          카테고리별 프로토타입과 설계 문서를 관리합니다.
        </span>
      </div>
      <div className="grid h-[calc(100dvh-160px)] min-w-0 gap-3 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)]">
        <AdminShellSidebar
          activeCategoryId={activeCategoryId}
          categories={categories}
          isAuthenticated={isAuthenticated}
          isLoading={isLoading}
          onCategoriesReorder={setCategories}
          onSelectCategory={selectCategory}
        />

        <div className="flex flex-col min-w-0 min-h-0">
          {isError ? (
            <Card className="mb-1.5 rounded-sm border border-danger-border bg-danger-glass p-2 text-xs text-danger-500">
              카테고리 데이터를 불러오지 못했습니다. 서버(`:3000`) 상태를 확인하세요.
            </Card>
          ) : null}

          {selectedCategory ? (
            <div className="flex flex-1 min-h-0 flex-col gap-3">
              {activePrototype ? (
                <PrototypeDetailPage
                  prototype={activePrototype}
                  canManagePrototype={
                    selectedCategory.userId === currentUserId || userRole === 'admin'
                  }
                  onBack={() => selectPrototype(null)}
                />
              ) : (
                <>
                  <AdminShellCategoryHeader
                    selectedCategory={selectedCategory}
                    fallbackCategoryId={fallbackCategoryId}
                    isAuthenticated={isAuthenticated}
                    insetClassName={mainPanelInsetClass}
                  />

                  <AdminShellPrototypeListPanel
                    selectedCategory={selectedCategory}
                    prototypeList={prototypeList}
                    isLoading={prototypesQuery.isLoading}
                    isFetching={prototypesQuery.isFetching}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    page={page}
                    sort={sort}
                    search={search}
                    searchInput={searchInput}
                    isAuthenticated={isAuthenticated}
                    canManagePrototype={
                      selectedCategory.userId === currentUserId || userRole === 'admin'
                    }
                    insetClassName={mainPanelInsetClass}
                    onSearchInputChange={setSearchInput}
                    onSearchSubmit={() => {
                      setPage(1)
                      setSearch(searchInput)
                    }}
                    onSearchEscape={() => {
                      setSearchInput('')
                      setSearch('')
                      setPage(1)
                    }}
                    onSortChange={(value) => {
                      setSort(value)
                      setPage(1)
                    }}
                    onSelectPrototype={(prototypeId) => {
                      selectPrototype(prototypeId)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    onOpenDoc={(prototypeId) => {
                      openDoc(prototypeId)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
                    onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))}
                  />
                </>
              )}
            </div>
          ) : (
            <AdminShellEmptyState />
          )}
        </div>
      </div>
    </div>
  )
}
