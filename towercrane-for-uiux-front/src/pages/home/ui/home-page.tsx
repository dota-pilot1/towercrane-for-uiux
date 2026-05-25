import {
  Bot,
  ClipboardList,
  BookOpen,
  CheckSquare,
  Cpu,
  ArrowRight,
  GitBranch,
  Layers,
  Shield,
  BarChart3,
  Sparkles,
  Workflow,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'AI 서비스 신청 · 관리',
    desc: '부서/프로젝트별 AI 서비스 사용 권한을 신청하고 팀장 → AI 관리자 단계별 승인 워크플로우를 통해 안전하게 발급합니다.',
    badge: 'Step Wizard',
    href: 'ai_service_request',
  },
  {
    icon: BarChart3,
    title: 'AI 서비스 모니터링',
    desc: 'API 호출량 · 토큰 사용량 · 비용 · 에러율을 실시간 대시보드로 시각화합니다. 이상 사용 감지와 자동 한도 제어를 지원합니다.',
    badge: 'Dashboard',
    href: 'chatbot_monitoring',
  },
  {
    icon: Bot,
    title: '지식채널 & AI Chatbot',
    desc: '공지사항 · FAQ · AI 자료 · 개발 자료를 벡터 임베딩으로 저장하고 RAG 방식으로 질문에 답하는 지능형 헬프데스크입니다.',
    badge: 'RAG · SSE',
    href: 'knowledge_channel',
  },
  {
    icon: Workflow,
    title: 'AI 워크플로우 빌더',
    desc: 'React Flow로 프롬프트 → RAG → LLM → 가드레일 노드를 드래그 앤 드롭으로 연결해 AI 파이프라인을 시각적으로 설계합니다.',
    badge: 'React Flow',
    href: 'chatbot_flow',
  },
  {
    icon: CheckSquare,
    title: '업무 관리 · 학습 일지',
    desc: '태스크 · 프로젝트 이슈를 워크스페이스 단위로 관리하고, 개인 학습 기록과 팀 코드 챌린지 현황을 추적합니다.',
    badge: 'Workspace',
    href: 'task_group',
  },
  {
    icon: Layers,
    title: '바이브 코딩 환경',
    desc: 'Semantic Token 기반 디자인 시스템과 ui-* 유틸 프리셋으로 AI 어시스턴트가 테마를 깨뜨리지 않고 고품질 React 코드를 생성합니다.',
    badge: 'Design System',
    href: 'prototype',
  },
]

const TECH_STACK = [
  'React 19', 'TypeScript', 'Vite', 'TanStack Router',
  'React Flow', 'Tailwind CSS v4', 'Zustand', 'TanStack Query',
  'NestJS', 'SQLite · Drizzle ORM', 'OpenAI API', 'AWS S3 · CloudFront',
]

export function HomePage() {
  const navigate = useNavigate()

  function go(sectionId: string) {
    const map: Record<string, string> = {
      ai_service_request: '/ai-service-request',
      chatbot_monitoring: '/admin/chatbot-monitoring',
      knowledge_channel: '/chatbot/knowledge',
      chatbot_flow: '/chatbot/flow',
      task_group: '/task',
      prototype: '/prototype',
    }
    navigate({ to: map[sectionId] ?? '/prototype' })
  }

  return (
    <div className="space-y-10 pb-10">

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-raised px-8 py-12 md:px-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_srgb,var(--brand-primary)_8%,transparent),transparent)]" />
        <div className="relative max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-border bg-brand-glass px-3 py-1">
            <Sparkles className="size-3.5 text-brand-primary" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-brand-primary">
              Enterprise AI Portal
            </span>
          </div>
          <h1 className="text-3xl font-black leading-tight ui-text-primary md:text-4xl">
            사내 AI 서비스<br />
            <span className="text-brand-primary">통합 관리 포털</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 ui-text-secondary">
            임직원이 AI 서비스를 안전하게 신청·승인받고, 사용량을 모니터링하며,
            RAG 기반 지식채널 챗봇과 시각적 워크플로우 빌더로 업무에 AI를 효율적으로 통합하는
            엔터프라이즈급 AX(AI Transformation) 플랫폼입니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => go('ai_service_request')}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-glass px-5 py-2.5 text-sm font-bold text-brand-primary transition-all hover:bg-brand-glass/80 active:scale-95"
            >
              <ClipboardList className="size-4" />
              AI 서비스 신청하기
              <ArrowRight className="size-3.5" />
            </button>
            <button
              onClick={() => go('knowledge_channel')}
              className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-2.5 text-sm font-bold ui-text-secondary transition-all hover:bg-surface-muted active:scale-95"
            >
              <Bot className="size-4" />
              AI 챗봇 사용하기
            </button>
          </div>
        </div>

        {/* 우측 장식 */}
        <div className="pointer-events-none absolute right-8 top-8 hidden xl:flex flex-col items-end gap-2 opacity-60">
          {['AI 신청 · 승인', 'RAG 지식채널', '사용량 모니터링', 'React Flow 빌더'].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-brand-border/40 bg-brand-glass/60 px-3 py-1 text-[11px] font-semibold text-brand-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      {/* 핵심 기능 */}
      <section>
        <div className="mb-5 flex items-center gap-3">
          <Cpu className="size-4 text-brand-primary" />
          <h2 className="text-sm font-black uppercase tracking-widest ui-text-secondary">
            핵심 기능
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <button
                key={f.title}
                onClick={() => go(f.href)}
                className="group rounded-xl border border-surface-border bg-surface-raised p-5 text-left transition-all hover:border-brand-border hover:bg-brand-glass/30 hover:shadow-md active:scale-[0.99]"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex size-9 items-center justify-center rounded-lg border border-surface-border bg-surface-muted group-hover:border-brand-border group-hover:bg-brand-glass transition-colors">
                    <Icon className="size-4 ui-text-secondary group-hover:text-brand-primary transition-colors" />
                  </div>
                  <span className="rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ui-text-muted group-hover:border-brand-border/50 group-hover:text-brand-primary transition-colors">
                    {f.badge}
                  </span>
                </div>
                <h3 className="text-sm font-bold ui-text-primary group-hover:text-brand-primary transition-colors">
                  {f.title}
                </h3>
                <p className="mt-2 text-xs leading-5 ui-text-muted">{f.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  바로가기 <ArrowRight className="size-3" />
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* 배경 · 기술 스택 */}
      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        {/* 프로젝트 배경 */}
        <section className="rounded-xl border border-surface-border bg-surface-raised p-6">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="size-4 text-brand-primary" />
            <h2 className="text-sm font-black uppercase tracking-widest ui-text-secondary">
              프로젝트 배경
            </h2>
          </div>
          <div className="space-y-4 text-sm leading-7 ui-text-secondary">
            <p>
              기업 내 AI 도입이 확산되면서 부서별·프로젝트별로 AI API를 무분별하게 사용하는 경우
              <strong className="ui-text-primary"> 보안 위반·비용 폭주</strong> 문제가 발생합니다.
            </p>
            <p>
              이 포털은 신청 → 승인 → 권한 발급의 결재 흐름으로 접근을 통제하고,
              사용량 모니터링으로 비용을 가시화하며, RAG 챗봇으로 구성원의 AI 활용 역량을 높입니다.
            </p>
            <p>
              디자인팀과의 협업을 전제로 <strong className="ui-text-primary">Semantic Token 기반 디자인 시스템</strong>을 구축해
              AI 어시스턴트(바이브 코딩)가 테마를 깨지 않고 고품질 컴포넌트를 자동 생성할 수 있는 환경을 제공합니다.
            </p>
          </div>
        </section>

        {/* 기술 스택 */}
        <section className="rounded-xl border border-surface-border bg-surface-raised p-6">
          <div className="mb-4 flex items-center gap-2">
            <GitBranch className="size-4 text-brand-primary" />
            <h2 className="text-sm font-black uppercase tracking-widest ui-text-secondary">
              기술 스택
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {TECH_STACK.map((tech) => (
              <span
                key={tech}
                className="rounded-md border border-surface-border-soft bg-surface-muted px-2.5 py-1 text-[11px] font-semibold ui-text-secondary"
              >
                {tech}
              </span>
            ))}
          </div>
          <a
            href="https://github.com/dota-pilot1/towercrane-for-uiux"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary hover:underline"
          >
            <GitBranch className="size-3.5" />
            GitHub 저장소 보기
          </a>
        </section>
      </div>
    </div>
  )
}
