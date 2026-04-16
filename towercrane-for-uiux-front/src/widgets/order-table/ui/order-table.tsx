import * as Tabs from '@radix-ui/react-tabs'
import { useQuery } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Boxes, LoaderCircle } from 'lucide-react'
import { fetchOrders } from '../../../entities/order/model/orders-query'
import { orderColumns } from '../../../entities/order/model/order-columns'
import { useUiStore } from '../../../shared/store/ui-store'
import { Card } from '../../../shared/ui/card'

export function OrderTable() {
  const filters = useUiStore((state) => state.filters)
  const activeWorkspace = useUiStore((state) => state.activeWorkspace)
  const setActiveWorkspace = useUiStore((state) => state.setActiveWorkspace)

  const { data = [], isFetching } = useQuery({
    queryKey: ['orders', filters],
    queryFn: () => fetchOrders(filters),
  })

  // TanStack Table intentionally returns stable helpers outside React Compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: orderColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card className="overflow-hidden rounded-[32px]">
      <Tabs.Root value={activeWorkspace} onValueChange={setActiveWorkspace}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Enterprise Widget Set
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              탭 분할 + 데이터 위젯 관리
            </h3>
          </div>
          <Tabs.List className="flex flex-wrap gap-2 rounded-full border border-white/10 bg-slate-950/30 p-1">
            <Tabs.Trigger
              value="layout-system"
              className="rounded-full px-4 py-2 text-sm text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-950"
            >
              Layout
            </Tabs.Trigger>
            <Tabs.Trigger
              value="search-lab"
              className="rounded-full px-4 py-2 text-sm text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-950"
            >
              Search
            </Tabs.Trigger>
            <Tabs.Trigger
              value="operations"
              className="rounded-full px-4 py-2 text-sm text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-950"
            >
              Operations
            </Tabs.Trigger>
          </Tabs.List>
        </div>

        <Tabs.Content value="layout-system" className="space-y-6 p-6">
          <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/30 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">쿠폰/결제 관리자 리스트</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    TanStack Table 기반 목록
                  </p>
                </div>
                {isFetching ? (
                  <LoaderCircle className="size-4 animate-spin text-emerald-200" />
                ) : null}
              </div>

              <div className="overflow-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th key={header.id} className="px-3 py-2 text-slate-400">
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[28px] border border-white/10 bg-slate-950/30 p-5">
                <p className="text-sm text-slate-400">문서화 대상</p>
                <ul className="mt-4 space-y-3 text-sm text-slate-200">
                  <li>레이아웃 배치와 슬롯 구조</li>
                  <li>복잡한 검색폼과 검증 규칙</li>
                  <li>메뉴 + DB 연결용 엔티티 패턴</li>
                  <li>레거시 to 모던 컨벤션 전파</li>
                </ul>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-slate-950/30 p-5">
                <p className="text-sm text-slate-400">파일 검색 최적화</p>
                <p className="mt-3 text-sm leading-6 text-slate-200">
                  파일 이름만으로 찾기 쉬운 계층과 역할 기반 네이밍을 유지하도록 설계했습니다.
                </p>
              </div>
            </div>
          </section>
        </Tabs.Content>

        <Tabs.Content value="search-lab" className="p-6">
          <div className="rounded-[28px] border border-dashed border-emerald-200/25 bg-emerald-300/5 p-6 text-sm text-slate-200">
            검색 패턴 슬라이드 문서화를 염두에 둔 샘플 탭입니다. 실제 프로젝트에서는 검색 조건 DSL,
            저장된 프리셋, 서버 필터 매핑을 이 영역으로 확장하면 됩니다.
          </div>
        </Tabs.Content>

        <Tabs.Content value="operations" className="p-6">
          <div className="rounded-[28px] border border-dashed border-sky-200/25 bg-sky-300/5 p-6 text-sm text-slate-200">
            <div className="flex items-center gap-3">
              <Boxes className="size-5 text-sky-200" />
              쿠폰 발급, 결제 관리, 상태 전이 위젯을 모듈형으로 추가하기 위한 작업 탭입니다.
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </Card>
  )
}
