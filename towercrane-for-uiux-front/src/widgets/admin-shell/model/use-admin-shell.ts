import { useEffect, useState } from 'react'

import {
  useCatalogCategories,
  useCategoryPrototypes,
  type PrototypeListItem,
  type PrototypeListSort,
} from '../../../shared/api/catalog'
import type { ScenarioCategory } from '../../../shared/config/catalog'
import { useSessionStore } from '../../../shared/store/session-store'
import { useUiStore } from '../../../shared/store/ui-store'
import { useAdminShellQueryState } from './use-admin-shell-query-state'
import { useAdminShellUrlSync } from './use-admin-shell-url-sync'

export function useAdminShell() {
  const {
    data: fetchedCategories = [],
    isLoading,
    isError,
  } = useCatalogCategories()

  const [categories, setCategories] = useState<ScenarioCategory[]>([])
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const currentUserId = useSessionStore((state) => state.userId)
  const userRole = useSessionStore((state) => state.userRole)
  const activeCategoryId = useUiStore((state) => state.activeCategoryId)
  const setActiveCategory = useUiStore((state) => state.setActiveCategory)
  const setActiveSection = useUiStore((state) => state.setActiveSection)
  const activePrototypeId = useUiStore((state) => state.activePrototypeId)
  const setActivePrototypeId = useUiStore((state) => state.setActivePrototypeId)

  useEffect(() => {
    if (fetchedCategories.length > 0 && categories.length === 0) {
      setCategories(fetchedCategories)
    } else if (fetchedCategories.length > 0) {
      setCategories(fetchedCategories)
    }
  }, [categories.length, fetchedCategories])

  const selectedCategory =
    categories.find((category) => category.id === activeCategoryId) ?? categories[0]
  const fallbackCategoryId =
    categories.find((category) => category.id !== activeCategoryId)?.id

  useEffect(() => {
    if (!categories.some((category) => category.id === activeCategoryId) && categories[0]) {
      setActiveCategory(categories[0].id)
    }
  }, [activeCategoryId, categories, setActiveCategory])

  const {
    page,
    search,
    searchInput,
    setPage,
    setSearch,
    setSearchInput,
    setSort,
    sort,
  } = useAdminShellQueryState(selectedCategory?.id)

  const prototypesQuery = useCategoryPrototypes(selectedCategory?.id ?? null, {
    page,
    pageSize: 20,
    q: search,
    sort,
  })

  const prototypeList = prototypesQuery.data?.items ?? []
  const totalPages = prototypesQuery.data?.totalPages ?? 1
  const totalCount = prototypesQuery.data?.total ?? 0
  const activePrototypeFromCategory =
    selectedCategory?.prototypes.find((prototype) => prototype.id === activePrototypeId) ?? null
  const activePrototype: PrototypeListItem | null =
    prototypeList.find((prototype) => prototype.id === activePrototypeId) ??
    (activePrototypeFromCategory
      ? {
          ...activePrototypeFromCategory,
          categoryId: selectedCategory?.id ?? '',
          notes: null,
          tags: [],
          avgRating: 0,
          reviewCount: 0,
          createdAt: activePrototypeFromCategory.updatedAt,
        }
      : null)

  useAdminShellUrlSync({
    activePrototypeId,
    selectedCategory,
    setActiveCategory,
    setActivePrototypeId,
  })

  return {
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
  }
}
