import { useEffect } from 'react'

import type { ScenarioCategory } from '../../../shared/config/catalog'

type UseAdminShellUrlSyncParams = {
  activePrototypeId: string | null
  selectedCategory: ScenarioCategory | undefined
  setActiveCategory: (categoryId: string) => void
  setActivePrototypeId: (prototypeId: string | null) => void
}

export function useAdminShellUrlSync({
  activePrototypeId,
  selectedCategory,
  setActiveCategory,
  setActivePrototypeId,
}: UseAdminShellUrlSyncParams) {
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search)
      const nextCategoryId = params.get('categoryId')
      const nextPrototypeId =
        params.get('view') === 'prototype-detail' ? params.get('prototypeId') : null

      if (nextCategoryId) {
        setActiveCategory(nextCategoryId)
      }

      setActivePrototypeId(nextPrototypeId)
    }

    syncFromUrl()
    window.addEventListener('popstate', syncFromUrl)

    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [setActiveCategory, setActivePrototypeId])

  useEffect(() => {
    if (!selectedCategory?.id) return

    const params = new URLSearchParams(window.location.search)
    params.set('categoryId', selectedCategory.id)

    if (activePrototypeId) {
      params.set('view', 'prototype-detail')
      params.set('prototypeId', activePrototypeId)
    } else {
      params.delete('view')
      params.delete('prototypeId')
    }

    const nextUrl = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState(null, '', nextUrl)
  }, [activePrototypeId, selectedCategory?.id])

  useEffect(() => {
    if (!activePrototypeId || !selectedCategory) return

    const exists = selectedCategory.prototypes.some((prototype) => prototype.id === activePrototypeId)
    if (!exists) {
      setActivePrototypeId(null)
    }
  }, [activePrototypeId, selectedCategory, setActivePrototypeId])
}
