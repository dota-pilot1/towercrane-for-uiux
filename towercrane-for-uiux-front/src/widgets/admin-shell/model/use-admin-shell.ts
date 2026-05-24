import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import {
  useCatalogCategories,
  useCategoryPrototypes,
  usePrototypeWorkspaces,
  useWorkspaceCategories,
  type PrototypeListItem,
  type PrototypeListSort,
} from '../../../shared/api/catalog'
import type { ScenarioCategory } from '../../../shared/config/catalog'
import { useSessionStore } from '../../../shared/store/session-store'
import { useAdminShellQueryState } from './use-admin-shell-query-state'

const EMPTY_CATEGORIES: ScenarioCategory[] = []

type UseAdminShellParams = {
  workspaceId?: string
  categoryId: string
  prototypeId: string | undefined
}

export function useAdminShell({
  workspaceId,
  categoryId,
  prototypeId,
}: UseAdminShellParams) {
  const navigate = useNavigate()

  const catalogCategoriesQuery = useCatalogCategories()
  const fetchedCategories = catalogCategoriesQuery.data ?? EMPTY_CATEGORIES
  const {
    data: workspaces = [],
  } = usePrototypeWorkspaces()
  const workspaceCategoriesQuery = useWorkspaceCategories(workspaceId ?? null)
  const sourceCategories = workspaceId
    ? (workspaceCategoriesQuery.data ?? EMPTY_CATEGORIES)
    : fetchedCategories
  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === workspaceId) ?? null

  const [categories, setCategories] = useState<ScenarioCategory[]>([])
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const currentUserId = useSessionStore((state) => state.userId)
  const userRole = useSessionStore((state) => state.userRole)

  useEffect(() => {
    if (sourceCategories.length > 0) {
      setCategories(sourceCategories)
    } else {
      setCategories([])
    }
  }, [sourceCategories])

  const selectedCategory =
    categories.find((category) => category.id === categoryId) ?? categories[0]
  const fallbackCategoryId =
    categories.find((category) => category.id !== selectedCategory?.id)?.id

  useEffect(() => {
    if (categories.some((category) => category.id === categoryId) || !categories[0]) {
      return
    }

    if (workspaceId) {
      navigate({
        to: '/prototype/workspaces/$workspaceId/categories/$categoryId',
        params: { workspaceId, categoryId: categories[0].id },
        replace: true,
      })
      return
    }

    if (!categoryId) {
      navigate({
        to: '/prototype/$categoryId',
        params: { categoryId: categories[0].id },
        replace: true,
      })
    }
  }, [categoryId, categories, navigate, workspaceId])

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
    if (workspaceId) {
      navigate({
        to: '/prototype/workspaces/$workspaceId/categories/$categoryId',
        params: { workspaceId, categoryId: id },
      })
      return
    }

    navigate({ to: '/prototype/$categoryId', params: { categoryId: id } })
  }

  const selectPrototype = (id: string | null) => {
    const targetCategoryId = selectedCategory?.id ?? categoryId
    if (id) {
      if (workspaceId) {
        navigate({
          to: '/prototype/workspaces/$workspaceId/categories/$categoryId',
          params: { workspaceId, categoryId: targetCategoryId },
          search: { prototypeId: id },
        })
      } else {
        navigate({
          to: '/prototype/$categoryId',
          params: { categoryId: targetCategoryId },
          search: { prototypeId: id },
        })
      }
    } else {
      if (workspaceId) {
        navigate({
          to: '/prototype/workspaces/$workspaceId/categories/$categoryId',
          params: { workspaceId, categoryId: targetCategoryId },
        })
      } else {
        navigate({ to: '/prototype/$categoryId', params: { categoryId: targetCategoryId } })
      }
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
      if (workspaceId) {
        navigate({
          to: '/prototype/workspaces/$workspaceId/categories/$categoryId',
          params: { workspaceId, categoryId: selectedCategory.id },
          replace: true,
        })
      } else {
        navigate({ to: '/prototype/$categoryId', params: { categoryId }, replace: true })
      }
    }
  }, [prototypeId, selectedCategory, prototypeList, categoryId, navigate, workspaceId])

  return {
    activeCategoryId: selectedCategory?.id ?? categoryId,
    activePrototype,
    categories,
    currentUserId,
    fallbackCategoryId,
    isAuthenticated,
    isError: workspaceId
      ? workspaceCategoriesQuery.isError
      : catalogCategoriesQuery.isError,
    isLoading: workspaceId
      ? workspaceCategoriesQuery.isLoading
      : catalogCategoriesQuery.isLoading,
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
  }
}
