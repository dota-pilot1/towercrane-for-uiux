import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import {
  useCatalogCategories,
  useCategoryPrototypes,
  type PrototypeListItem,
  type PrototypeListSort,
} from '../../../shared/api/catalog'
import type { ScenarioCategory } from '../../../shared/config/catalog'
import { useSessionStore } from '../../../shared/store/session-store'
import { useAdminShellQueryState } from './use-admin-shell-query-state'

type UseAdminShellParams = {
  categoryId: string
  prototypeId: string | undefined
}

export function useAdminShell({ categoryId, prototypeId }: UseAdminShellParams) {
  const navigate = useNavigate()

  const {
    data: fetchedCategories = [],
    isLoading,
    isError,
  } = useCatalogCategories()

  const [categories, setCategories] = useState<ScenarioCategory[]>([])
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const currentUserId = useSessionStore((state) => state.userId)
  const userRole = useSessionStore((state) => state.userRole)

  useEffect(() => {
    if (fetchedCategories.length > 0) {
      setCategories(fetchedCategories)
    }
  }, [fetchedCategories])

  const selectedCategory =
    categories.find((category) => category.id === categoryId) ?? categories[0]
  const fallbackCategoryId =
    categories.find((category) => category.id !== categoryId)?.id

  useEffect(() => {
    if (!categories.some((category) => category.id === categoryId) && categories[0]) {
      navigate({
        to: '/prototype/$categoryId',
        params: { categoryId: categories[0].id },
        replace: true,
      })
    }
  }, [categoryId, categories, navigate])

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
    selectedCategory?.prototypes.find((prototype) => prototype.id === prototypeId) ?? null
  const activePrototype: PrototypeListItem | null =
    prototypeList.find((prototype) => prototype.id === prototypeId) ??
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

  const selectCategory = (id: string) => {
    navigate({ to: '/prototype/$categoryId', params: { categoryId: id } })
  }

  const selectPrototype = (id: string | null) => {
    if (id) {
      navigate({
        to: '/prototype/$categoryId',
        params: { categoryId },
        search: { prototypeId: id },
      })
    } else {
      navigate({ to: '/prototype/$categoryId', params: { categoryId } })
    }
  }

  const openDoc = (id: string) => {
    navigate({ to: '/docu', search: { prototypeId: id } })
  }

  useEffect(() => {
    if (!prototypeId || !selectedCategory) return
    const existsInCategory = selectedCategory.prototypes.some((p) => p.id === prototypeId)
    const existsInList = prototypeList.some((p) => p.id === prototypeId)
    if (!existsInCategory && prototypeList.length > 0 && !existsInList) {
      navigate({ to: '/prototype/$categoryId', params: { categoryId }, replace: true })
    }
  }, [prototypeId, selectedCategory, prototypeList, categoryId, navigate])

  return {
    activeCategoryId: categoryId,
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
  }
}
