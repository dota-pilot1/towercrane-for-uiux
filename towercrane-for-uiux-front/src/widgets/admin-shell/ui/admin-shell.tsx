import { useAdminShell } from '../model/use-admin-shell'
import { Card } from '../../../shared/ui/card'
import {
  PrototypeDetailPage,
} from '../../../features/prototype-review/ui/prototype-detail-page'
import { AdminShellCategoryHeader } from './admin-shell-category-header'
import { AdminShellEmptyState } from './admin-shell-empty-state'
import { AdminShellPrototypeListPanel } from './admin-shell-prototype-list-panel'
import { AdminShellSidebar } from './admin-shell-sidebar'

export function AdminShell() {
  const {
    activeCategoryId,
    activePrototype,
    categories,
    currentUserId,
    fallbackCategoryId,
    isAuthenticated,
    isError,
    isLoading,
    page,
    prototypeList,
    prototypesQuery,
    search,
    searchInput,
    selectedCategory,
    setActiveCategory,
    setActivePrototypeId,
    setActiveSection,
    setCategories,
    setPage,
    setSearch,
    setSearchInput,
    setSort,
    sort,
    totalCount,
    totalPages,
    userRole,
  } = useAdminShell()

  const mainPanelInsetClass = 'px-5'

  return (
    <div className="w-full min-w-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--primary)_5%,var(--background))_0%,var(--background)_18rem)] pb-8">
      <div className="grid min-h-[calc(100vh-6rem)] min-w-0 gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
        <AdminShellSidebar
          activeCategoryId={activeCategoryId}
          categories={categories}
          isAuthenticated={isAuthenticated}
          isLoading={isLoading}
          onCategoriesReorder={setCategories}
          onSelectCategory={setActiveCategory}
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
                  onBack={() => setActivePrototypeId(null)}
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
                      setActivePrototypeId(prototypeId)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    onOpenDoc={(prototypeId) => {
                      setActivePrototypeId(prototypeId)
                      setActiveSection('docu')
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
