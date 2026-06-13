import {
  ClipboardList,
  BookOpen,
  Cpu,
  ArrowRight,
  GitBranch,
  Sparkles,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

const PRIORITIES = [
  {
    icon: ClipboardList,
    title: '프로젝트 업무 관리',
    desc: '부서 및 프로젝트 단위의 워크스페이스에서 태스크와 이슈를 관리하고, 개인 학습 기록 및 팀 코드 챌린지 현황을 추적합니다.',
    badge: 'Workspace',
    href: 'task_group',
  },
  {
    icon: BookOpen,
    title: '개발자 온보딩 가이드',
    desc: '로컬 개발 환경 설정 방법, 필수 환경 변수(env) 구성 조건 및 시스템 아키텍처 개요 등 신속한 기여를 위한 가이드를 제공합니다.',
    badge: 'Onboarding',
    href: 'readme',
  },
]

const TECH_STACK = [
  'React 19', 'TypeScript', 'Vite', 'TanStack Router',
  'React Flow', 'Tailwind CSS v4', 'Zustand', 'TanStack Query',
  'NestJS', 'SQLite · Drizzle ORM',
]

export function HomePage() {
  const navigate = useNavigate()

  function go(sectionId: string) {
    const map: Record<string, string> = {
      task_group: '/task',
      readme: '/readme',
    }
    navigate({ to: map[sectionId] ?? '/task' })
  }

  return (
    <div className="space-y-8 pb-10 max-w-5xl mx-auto">

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-raised px-8 py-10 md:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_srgb,var(--brand-primary)_8%,transparent),transparent)]" />
        <div className="relative max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-border bg-brand-glass px-3 py-1">
            <Sparkles className="size-3.5 text-brand-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">
              Task & Onboarding Portal
            </span>
          </div>
          <h1 className="text-2xl font-black leading-tight ui-text-primary md:text-3xl">
            Towercrane<br />
            <span className="text-brand-primary">개발 & 업무 협업 콘솔</span>
          </h1>
          <p className="mt-3 text-sm leading-6 ui-text-secondary">
            성공적인 프로젝트 수행을 위한 실시간 태스크 관리와 신규 개발자 온보딩 프로세스를 효율적으로 지원하는 통합 허브입니다.
          </p>
        </div>
      </section>

      {/* 핵심 우선순위 메뉴 */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Cpu className="size-4 text-brand-primary" />
          <h2 className="text-xs font-black uppercase tracking-widest ui-text-secondary">
            우선순위 바로가기
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {PRIORITIES.map((p) => {
            const Icon = p.icon
            return (
              <button
                key={p.title}
                onClick={() => go(p.href)}
                className="group rounded-xl border border-surface-border bg-surface-raised p-6 text-left transition-all hover:border-brand-border hover:bg-brand-glass/30 hover:shadow-md active:scale-[0.99]"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg border border-surface-border bg-surface-muted group-hover:border-brand-border group-hover:bg-brand-glass transition-colors">
                    <Icon className="size-5 ui-text-secondary group-hover:text-brand-primary transition-colors" />
                  </div>
                  <span className="rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ui-text-muted group-hover:border-brand-border/50 group-hover:text-brand-primary transition-colors">
                    {p.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold ui-text-primary group-hover:text-brand-primary transition-colors">
                  {p.title}
                </h3>
                <p className="mt-2 text-xs leading-5 ui-text-secondary">{p.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  이동하기 <ArrowRight className="size-3" />
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* 기술 스택 */}
      <section className="rounded-xl border border-surface-border bg-surface-raised p-5">
        <div className="mb-3 flex items-center gap-2">
          <GitBranch className="size-4 text-brand-primary" />
          <h2 className="text-xs font-black uppercase tracking-widest ui-text-secondary">
            주요 개발 기술 스택
          </h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TECH_STACK.map((tech) => (
            <span
              key={tech}
              className="rounded-md border border-surface-border-soft bg-surface-muted px-2.5 py-1 text-[11px] font-semibold ui-text-secondary"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}

