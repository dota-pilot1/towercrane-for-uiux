import { zodResolver } from '@hookform/resolvers/zod'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { defaultFilters, useUiStore } from '../../../shared/store/ui-store'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'
import { filterSchema, type FilterFormValues } from '../model/filter-schema'

const teamOptions = [
  { value: 'all', label: '전체 팀' },
  { value: 'crm', label: 'CRM' },
  { value: 'growth', label: 'Growth' },
  { value: 'ops', label: 'Ops' },
  { value: 'finance', label: 'Finance' },
]

const statusOptions = [
  { value: 'all', label: '전체 상태' },
  { value: 'ready', label: 'Ready' },
  { value: 'review', label: 'Review' },
  { value: 'issued', label: 'Issued' },
  { value: 'hold', label: 'Hold' },
]

export function WorkbenchFilterForm() {
  const filters = useUiStore((state) => state.filters)
  const applyFilters = useUiStore((state) => state.applyFilters)

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
            Complex Search Form
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">업무 검색 패널</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            쿠폰 발급, 결제 관리, 검색폼 패턴을 공통 구조로 맞추기 위한 기본 샘플입니다.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs text-slate-300">
          react-hook-form + zod + Zustand
        </div>
      </div>

      <form className="grid gap-4 lg:grid-cols-4" onSubmit={handleSubmit(onSubmit)}>
        <label className="space-y-2">
          <span className="text-sm text-slate-300">키워드</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-3.5 size-4 text-slate-500" />
            <Input {...register('keyword')} className="pl-11" placeholder="고객사, 시나리오, ID" />
          </div>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">운영 팀</span>
          <select
            className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-50 outline-none focus:border-emerald-300/60"
            {...register('team')}
          >
            {teamOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">상태</span>
          <select
            className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-50 outline-none focus:border-emerald-300/60"
            {...register('status')}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">최소 예산</span>
          <Input
            {...register('minAmount', { valueAsNumber: true })}
            type="number"
            min={0}
            step={100000}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3 lg:col-span-4">
          <Button type="submit" className="min-w-32">
            <SlidersHorizontal className="mr-2 size-4" />
            필터 적용
          </Button>
          <Button type="button" variant="secondary" onClick={handleReset}>
            초기화
          </Button>
          {errors.minAmount ? (
            <span className="text-sm text-rose-300">{errors.minAmount.message}</span>
          ) : (
            <span className="text-sm text-slate-400">
              검색 조건은 전역 상태로 관리되어 위젯 간 공유됩니다.
            </span>
          )}
        </div>
      </form>
    </Card>
  )
}
