import * as Dialog from '@radix-ui/react-dialog'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { ArrowUpRight, FileText, Sparkles } from 'lucide-react'
import { WorkbenchFilterForm } from '../../../features/workbench-filter/ui/workbench-filter-form'
import { navigationItems } from '../../../shared/config/navigation'
import { useUiStore } from '../../../shared/store/ui-store'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { MetricsOverview } from '../../metrics-overview/ui/metrics-overview'
import { OrderTable } from '../../order-table/ui/order-table'

const principleSlides = [
  'FSD를 교과서적으로 유지하되, 관리자 화면 조립 속도를 떨어뜨리지 않는 실전형 레이어링',
  'Base44에 근접한 밀도와 완성도를 목표로 한 하이엔드 관리자 UI 톤',
  '레이아웃, 검색폼, 메뉴, 위젯, 상태 관리 패턴을 슬라이드처럼 문서화 가능한 구조',
]

export function AdminShell() {
  const activeMenu = useUiStore((state) => state.activeMenu)
  const setActiveMenu = useUiStore((state) => state.setActiveMenu)

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1600px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="overflow-hidden rounded-[36px]">
          <ScrollArea.Root className="h-full">
            <ScrollArea.Viewport className="h-full p-6">
              <div className="mb-8">
                <p className="text-xs uppercase tracking-[0.34em] text-emerald-200/70">
                  towercrane-for-uiux
                </p>
                <h1 className="mt-3 text-2xl font-semibold text-white">
                  Front Workbench
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  엔터프라이즈급 관리자 페이지를 빠르게 조립하기 위한 내부 프론트 스타터입니다.
                </p>
              </div>

              <nav className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeMenu === item.id

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveMenu(item.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                        isActive
                          ? 'bg-white text-slate-950'
                          : 'bg-white/4 text-slate-300 hover:bg-white/8'
                      }`}
                    >
                      <Icon className="size-4" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  )
                })}
              </nav>

              <div className="mt-8 rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
                <p className="text-sm text-slate-400">현재 선택</p>
                <p className="mt-2 text-lg font-semibold text-white">{activeMenu}</p>
                <p className="mt-3 text-sm text-slate-300">
                  메뉴 선택은 Zustand 전역 상태로 유지됩니다.
                </p>
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              orientation="vertical"
              className="flex w-2 touch-none select-none bg-transparent p-0.5"
            >
              <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/15" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-[36px] p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">
                  <Sparkles className="size-3.5" />
                  Base44-adjacent admin quality target
                </div>
                <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white">
                  디자인 패밀리룩과 하드코어 인터랙션을 한 프로젝트 안에서 문서화 가능한 형태로 묶습니다.
                </h2>
              </div>

              <Dialog.Root>
                <Dialog.Trigger asChild>
                  <Button variant="secondary">
                    <FileText className="mr-2 size-4" />
                    구현 원칙 보기
                  </Button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" />
                  <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[32px] p-6">
                    <Dialog.Title className="text-xl font-semibold text-white">
                      내부 구축 원칙
                    </Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm text-slate-300">
                      슬라이드 문서로 전환하기 쉬운 형태를 기준으로 구조를 정의합니다.
                    </Dialog.Description>
                    <div className="mt-6 space-y-3">
                      {principleSlides.map((item) => (
                        <div
                          key={item}
                          className="rounded-2xl border border-white/10 bg-white/4 p-4 text-sm leading-6 text-slate-200"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5">
                Vite + React + TypeScript
              </span>
              <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5">
                Tailwind + Radix UI
              </span>
              <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5">
                Zustand + React Query + React Table
              </span>
            </div>
          </Card>

          <MetricsOverview />
          <WorkbenchFilterForm />
          <OrderTable />

          <Card className="rounded-[32px] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">확장 가이드</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  Next.js 이전을 고려한 파일 네이밍 전략도 README에 요약해 두었습니다.
                </p>
              </div>
              <a
                href="#top"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
              >
                문서 중심 개발
                <ArrowUpRight className="size-4" />
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
