import * as Tabs from '@radix-ui/react-tabs'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUpRight, DatabaseZap, LayoutTemplate } from 'lucide-react'
import { useMemo } from 'react'
import { DeletePrototypeButton } from '../../../features/prototype-management/ui/delete-prototype-button'
import { EditPrototypeDialog } from '../../../features/prototype-management/ui/edit-prototype-dialog'
import type { PrototypeItem, ScenarioCategory } from '../../../shared/config/catalog'
import { useUiStore } from '../../../shared/store/ui-store'
import { Card } from '../../../shared/ui/card'

const columnHelper = createColumnHelper<PrototypeItem>()

const basePrototypeColumns = [
  columnHelper.accessor('title', {
    header: '프로토타입',
    cell: (info) => <span className="font-medium text-slate-100">{info.getValue()}</span>,
  }),
  columnHelper.accessor('summary', {
    header: '설명',
  }),
  columnHelper.accessor('status', {
    header: '상태',
    cell: (info) => (
      <span className="rounded-full bg-emerald-300/10 px-2.5 py-1 text-xs uppercase text-emerald-200">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('visibility', {
    header: '공개',
  }),
  columnHelper.accessor('updatedAt', {
    header: '업데이트',
  }),
  columnHelper.display({
    id: 'link',
    header: '링크',
    cell: ({ row }) => (
      <a
        href={row.original.repoUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 text-emerald-200 hover:text-emerald-100"
      >
        열기
        <ArrowUpRight className="size-4" />
      </a>
    ),
  }),
]

type OrderTableProps = {
  categories: ScenarioCategory[]
  activeCategoryId: string
}

export function OrderTable({ categories, activeCategoryId }: OrderTableProps) {
  const activeWorkspace = useUiStore((state) => state.activeWorkspace)
  const setActiveWorkspace = useUiStore((state) => state.setActiveWorkspace)
  const filters = useUiStore((state) => state.filters)

  const selectedCategory = useMemo(
    () =>
      categories.find((category) => category.id === activeCategoryId) ?? categories[0],
    [activeCategoryId, categories],
  )
  const prototypes = useMemo(
    () =>
      selectedCategory?.prototypes.filter((prototype) => {
        const query = filters.query.trim().toLowerCase()
        const matchesQuery =
          query.length === 0 ||
          [prototype.title, prototype.summary, prototype.repoUrl].some((value) =>
            value.toLowerCase().includes(query),
          )
        const matchesStatus =
          filters.status === 'all' || prototype.status === filters.status
        const matchesVisibility =
          filters.visibility === 'all' || prototype.visibility === filters.visibility

        return matchesQuery && matchesStatus && matchesVisibility
      }) ?? [],
    [filters, selectedCategory],
  )

  const prototypeColumns = useMemo(
    () => [
      ...basePrototypeColumns,
      columnHelper.display({
        id: 'actions',
        header: '관리',
        cell: ({ row }) =>
          selectedCategory ? (
            <div className="flex items-center justify-end gap-1">
              <EditPrototypeDialog
                categoryId={selectedCategory.id}
                prototype={row.original}
              />
              <DeletePrototypeButton
                categoryId={selectedCategory.id}
                prototypeId={row.original.id}
              />
            </div>
          ) : null,
      }),
    ],
    [selectedCategory],
  )

  // TanStack Table intentionally returns stable helpers outside React Compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: prototypes,
    columns: prototypeColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card className="overflow-hidden rounded-[24px]">
      <Tabs.Root
        value={activeWorkspace}
        onValueChange={(value) =>
          setActiveWorkspace(value as 'overview' | 'prototypes' | 'backend')
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Prototype Workspace
            </p>
            <h3 className="mt-1.5 text-lg font-semibold text-white">프로토타입 보드</h3>
          </div>
          <Tabs.List className="flex flex-wrap gap-1.5 rounded-full border border-white/10 bg-slate-950/30 p-1">
            <Tabs.Trigger
              value="overview"
              className="rounded-full px-3.5 py-1.5 text-sm text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-950"
            >
              Overview
            </Tabs.Trigger>
            <Tabs.Trigger
              value="prototypes"
              className="rounded-full px-3.5 py-1.5 text-sm text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-950"
            >
              Prototypes
            </Tabs.Trigger>
            <Tabs.Trigger
              value="backend"
              className="rounded-full px-3.5 py-1.5 text-sm text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-950"
            >
              Backend
            </Tabs.Trigger>
          </Tabs.List>
        </div>
        <Tabs.Content value="overview" className="space-y-5 p-5">
          <section className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-[22px] border border-white/10 bg-slate-950/30 p-4">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-400">{selectedCategory?.group ?? 'custom'}</p>
                  <p className="mt-1 text-base font-semibold text-white">
                    {selectedCategory?.title ?? '선택된 카테고리 없음'}
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-slate-300">
                  prototypes {selectedCategory?.prototypes.length ?? 0}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[18px] border border-white/10 bg-white/4 p-3.5">
                  <p className="text-xs text-slate-400">체크리스트</p>
                  <ul className="mt-2.5 space-y-1.5 text-sm text-slate-200">
                    {selectedCategory?.checklist.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/4 p-3.5">
                  <p className="text-xs text-slate-400">태그</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {selectedCategory?.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-xs text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-[22px] border border-white/10 bg-slate-950/30 p-4">
                <p className="text-xs text-slate-400">요약</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-200">
                  <li>카테고리 누적</li>
                  <li>프로토타입 공유</li>
                  <li>프런트/서버 분리</li>
                  <li>패턴 카탈로그화</li>
                </ul>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-slate-950/30 p-4">
                <p className="text-xs text-slate-400">링크 전략</p>
                <p className="mt-2.5 text-sm leading-6 text-slate-200">repo / folder / branch</p>
              </div>
            </div>
          </section>
        </Tabs.Content>

        <Tabs.Content value="prototypes" className="p-5">
          <div className="overflow-auto rounded-[22px] border border-white/10 bg-slate-950/30 p-4">
            <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-3 py-2 text-slate-400">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="rounded-2xl bg-white/4">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-2.5 text-slate-200 first:rounded-l-2xl last:rounded-r-2xl">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-8 text-slate-400" colSpan={prototypeColumns.length}>
                      등록된 프로토타입이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Tabs.Content>

        <Tabs.Content value="backend" className="p-5">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-[22px] border border-dashed border-sky-200/25 bg-sky-300/5 p-5 text-sm text-slate-200">
              <div className="flex items-center gap-3">
                <DatabaseZap className="size-5 text-sky-200" />
                `towercrane-for-uiux-server`
              </div>
            </div>
            <div className="rounded-[22px] border border-dashed border-emerald-200/25 bg-emerald-300/5 p-5 text-sm text-slate-200">
              <div className="flex items-center gap-3">
                <LayoutTemplate className="size-5 text-emerald-200" />
                catalog ui / storage split
              </div>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </Card>
  )
}
