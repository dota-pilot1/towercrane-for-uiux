import { ArrowLeft, GitBranch } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useAdminShell } from '../model/use-admin-shell'
import { Card } from '../../../shared/ui/card'
import { Button } from '../../../shared/ui/button'
import { PrototypeDetailPage } from '../../../features/prototype-review/ui/prototype-detail-page'
import { AdminShellCategoryHeader } from './admin-shell-category-header'
import { AdminShellEmptyState } from './admin-shell-empty-state'
import { AdminShellPrototypeListPanel } from './admin-shell-prototype-list-panel'
import { AdminShellSidebar } from './admin-shell-sidebar'

type AdminShellProps = {
  workspaceId?: string
  categoryId: string
  prototypeId: string | undefined
}

export function AdminShell({ workspaceId, categoryId, prototypeId }: AdminShellProps) {
  const navigate = useNavigate()

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
    selectedWorkspace,
    setCategories,
    setPage,
    setSearch,
    setSearchInput,
    setSort,
    sort,
    totalCount,
    totalPages,
    userRole,
  } = useAdminShell({ workspaceId, categoryId, prototypeId })

  const mainPanelInsetClass = 'px-5'
  const canManagePrototype =
    userRole === 'admin' ||
    selectedCategory?.userId === currentUserId ||
    selectedWorkspace?.role === 'owner' ||
    selectedWorkspace?.role === 'editor'

  return (
    <div className="w-full min-w-0 ui-page-bg space-y-3">
      <div className="flex min-w-0 flex-col md:flex-row md:items-center justify-between gap-4 rounded-md border border-surface-border bg-surface-muted px-4 py-3.5 shadow-sm">
        <div className="flex min-w-0 items-start gap-3">
          {workspaceId ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate({ to: '/prototype' })}
              aria-label="워크스페이스 목록으로"
              title="워크스페이스 목록으로"
              className="mr-1 px-2 h-9"
            >
              <ArrowLeft className="size-4" />
            </Button>
          ) : null}
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-brand-border/40 bg-brand-glass text-brand-primary shadow-sm shadow-brand-primary/5">
            <GitBranch className="size-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <h1 className="text-lg font-bold tracking-tight text-text-primary">
              Prototype
            </h1>
            <p className="text-xs ui-text-secondary">
              {selectedWorkspace
                ? `${selectedWorkspace.name} 워크스페이스의 프로토타입과 설계 문서를 관리합니다.`
                : '카테고리별 프로토타입과 설계 문서를 관리합니다.'}
            </p>
          </div>
        </div>
      </div>
      <div className="grid h-[calc(100dvh-160px)] min-w-0 gap-3 overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)]">
        <AdminShellSidebar
          activeCategoryId={activeCategoryId}
          categories={categories}
          workspaceId={workspaceId}
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
                  canManagePrototype={canManagePrototype}
                  onBack={() => selectPrototype(null)}
                />
              ) : (
                <>
                  <AdminShellCategoryHeader
                    selectedCategory={selectedCategory}
                    workspaceId={workspaceId}
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
                    canManagePrototype={canManagePrototype}
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
