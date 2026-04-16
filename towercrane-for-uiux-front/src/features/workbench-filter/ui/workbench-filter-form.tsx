import { zodResolver } from '@hookform/resolvers/zod'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { AddPrototypeDialog } from '../../../features/prototype-management/ui/add-prototype-dialog'
import { useCatalogCategories } from '../../../shared/api/catalog'
import { defaultFilters, useUiStore } from '../../../shared/store/ui-store'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'
import { filterSchema, type FilterFormValues } from '../model/filter-schema'

export function WorkbenchFilterForm() {
  const activeCategoryId = useUiStore((state) => state.activeCategoryId)
  const filters = useUiStore((state) => state.filters)
  const applyFilters = useUiStore((state) => state.applyFilters)
  const { data: categories = [] } = useCatalogCategories()
  const selectedCategory =
    categories.find((category) => category.id === activeCategoryId) ?? categories[0]

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FilterFormValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: filters,
  })

  useEffect(() => {
    reset(filters)
  }, [filters, reset])

  const onSubmit = (values: FilterFormValues) => {
    applyFilters(values)
  }

  const handleReset = () => {
    reset(defaultFilters)
    applyFilters(defaultFilters)
  }

  return (
    <Card className="panel-grid rounded-[32px] p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.34em] text-emerald-200/70">
            Prototype Search
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">GitHub 프로토타입 검색 패널</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            선택한 카테고리 안에서 프로토타입 링크를 검색하고, 상태별로 분류해서 공유할 수 있습니다.
          </p>
        </div>
        {selectedCategory ? (
          <AddPrototypeDialog
            categoryId={selectedCategory.id}
            categoryTitle={selectedCategory.title}
          />
        ) : null}
      </div>

      <form className="grid gap-4 lg:grid-cols-3" onSubmit={handleSubmit(onSubmit)}>
        <label className="space-y-2">
          <span className="text-sm text-slate-300">키워드</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-3.5 size-4 text-slate-500" />
            <Input
              {...register('query')}
              className="pl-11"
              placeholder="프로토타입 이름, 설명, GitHub 링크"
            />
          </div>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">상태</span>
          <select
            className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-50 outline-none focus:border-emerald-300/60"
            {...register('status')}
          >
            <option value="all">전체 상태</option>
            <option value="draft">draft</option>
            <option value="building">building</option>
            <option value="ready">ready</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">공개 범위</span>
          <select
            className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-50 outline-none focus:border-emerald-300/60"
            {...register('visibility')}
          >
            <option value="all">전체</option>
            <option value="public">public</option>
            <option value="private">private</option>
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-3 lg:col-span-3">
          <Button type="submit" className="min-w-32">
            <SlidersHorizontal className="mr-2 size-4" />
            필터 적용
          </Button>
          <Button type="button" variant="secondary" onClick={handleReset}>
            초기화
          </Button>
          {errors.query ? (
            <span className="text-sm text-rose-300">{errors.query.message}</span>
          ) : (
            <span className="text-sm text-slate-400">
              카테고리별로 GitHub 프로토타입을 쌓아두고, 오른쪽 보드에서 바로 열 수 있습니다.
            </span>
          )}
        </div>
      </form>
    </Card>
  )
}
