import * as Tabs from '@radix-ui/react-tabs'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUpRight, DatabaseZap, LayoutTemplate } from 'lucide-react'
import { useCatalogCategories } from '../../../shared/api/catalog'
import type { PrototypeItem } from '../../../shared/config/catalog'
import { useUiStore } from '../../../shared/store/ui-store'
import { Card } from '../../../shared/ui/card'

const columnHelper = createColumnHelper<PrototypeItem>()

const prototypeColumns = [
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

export function OrderTable() {
  const activeCategoryId = useUiStore((state) => state.activeCategoryId)
  const activeWorkspace = useUiStore((state) => state.activeWorkspace)
  const setActiveWorkspace = useUiStore((state) => state.setActiveWorkspace)
  const filters = useUiStore((state) => state.filters)
  const { data: categories = [] } = useCatalogCategories()

  const selectedCategory =
    categories.find((category) => category.id === activeCategoryId) ?? categories[0]
  const prototypes =
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
    }) ?? []

  // TanStack Table intentionally returns stable helpers outside React Compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: prototypes,
    columns: prototypeColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card className="overflow-hidden rounded-[32px]">
      <Tabs.Root
        value={activeWorkspace}
        onValueChange={(value) =>
          setActiveWorkspace(value as 'overview' | 'prototypes' | 'backend')
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Prototype Workspace
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              카테고리별 깃허브 프로토타입 보드
            </h3>
          </div>
          <Tabs.List className="flex flex-wrap gap-2 rounded-full border border-white/10 bg-slate-950/30 p-1">
            <Tabs.Trigger
              value="overview"
              className="rounded-full px-4 py-2 text-sm text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-950"
            >
              Overview
            </Tabs.Trigger>
            <Tabs.Trigger
              value="prototypes"
              className="rounded-full px-4 py-2 text-sm text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-950"
            >
              Prototypes
            </Tabs.Trigger>
            <Tabs.Trigger
              value="backend"
              className="rounded-full px-4 py-2 text-sm text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-950"
            >
              Backend
            </Tabs.Trigger>
          </Tabs.List>
        </div>

        <Tabs.Content value="overview" className="space-y-6 p-6">
          <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/30 p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-400">{selectedCategory?.group ?? 'custom'}</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {selectedCategory?.title ?? '선택된 카테고리 없음'}
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-slate-300">
                  prototypes {selectedCategory?.prototypes.length ?? 0}
                </div>
              </div>

              <p className="max-w-3xl text-sm leading-7 text-slate-300">
                {selectedCategory?.summary}
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
                  <p className="text-sm text-slate-400">핵심 체크리스트</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-200">
                    {selectedCategory?.checklist.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
                  <p className="text-sm text-slate-400">태그</p>
                  <div className="mt-3 flex flex-wrap gap-2">
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

            <div className="space-y-4">
              <div className="rounded-[28px] border border-white/10 bg-slate-950/30 p-5">
                <p className="text-sm text-slate-400">왜 실용적인가</p>
                <ul className="mt-4 space-y-3 text-sm text-slate-200">
                  <li>왼쪽에서 카테고리를 계속 누적할 수 있습니다.</li>
                  <li>오른쪽에서 GitHub 프로토타입 링크를 바로 공유합니다.</li>
                  <li>프런트와 서버를 분리해도 개념 모델은 유지됩니다.</li>
                  <li>실무 패턴 카탈로그로 재사용 가능합니다.</li>
                </ul>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-slate-950/30 p-5">
                <p className="text-sm text-slate-400">공유 전략</p>
                <p className="mt-3 text-sm leading-6 text-slate-200">
                  각 프로토타입은 repo root, 특정 폴더, 브랜치 링크 단위로 등록할 수 있도록 설계했습니다.
                </p>
              </div>
            </div>
          </section>
        </Tabs.Content>

        <Tabs.Content value="prototypes" className="p-6">
          <div className="overflow-auto rounded-[28px] border border-white/10 bg-slate-950/30 p-5">
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
                        <td
                          key={cell.id}
                          className="px-3 py-3 text-slate-200 first:rounded-l-2xl last:rounded-r-2xl"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-8 text-slate-400" colSpan={prototypeColumns.length}>
                      아직 등록된 프로토타입이 없습니다. 상단 검색 패널에서 추가할 수 있습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Tabs.Content>

        <Tabs.Content value="backend" className="p-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[28px] border border-dashed border-sky-200/25 bg-sky-300/5 p-6 text-sm text-slate-200">
              <div className="flex items-center gap-3">
                <DatabaseZap className="size-5 text-sky-200" />
                `towercrane-for-uiux-server`는 NestJS + Drizzle + SQLite 기반으로 붙습니다.
              </div>
              <p className="mt-4 leading-6 text-slate-300">
                DB 파일을 교체하면 시나리오 카테고리와 GitHub 프로토타입 레지스트리를 그대로 옮길 수 있게 설계합니다.
              </p>
            </div>
            <div className="rounded-[28px] border border-dashed border-emerald-200/25 bg-emerald-300/5 p-6 text-sm text-slate-200">
              <div className="flex items-center gap-3">
                <LayoutTemplate className="size-5 text-emerald-200" />
                프런트는 카탈로그 UI, 서버는 패턴/프로토타입 저장소 역할로 분리됩니다.
              </div>
              <p className="mt-4 leading-6 text-slate-300">
                이후 SSE, 권한, 활동 로그까지 붙여도 모델이 흔들리지 않도록 카테고리-프로토타입 구조를 먼저 잡습니다.
              </p>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </Card>
  )
}
