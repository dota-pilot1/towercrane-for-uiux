import { useEffect, useState } from 'react'

import type { PrototypeListSort } from '../../../shared/api/catalog'

export function useAdminShellQueryState(selectedCategoryId?: string) {
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<PrototypeListSort>('recent')

  useEffect(() => {
    setPage(1)
    setSearch('')
    setSearchInput('')
  }, [selectedCategoryId])

  return {
    page,
    search,
    searchInput,
    setPage,
    setSearch,
    setSearchInput,
    setSort,
    sort,
  }
}
