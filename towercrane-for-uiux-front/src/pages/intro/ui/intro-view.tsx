import { useState } from 'react'
import { ArrowRight, BookOpenText, FileText, GitBranch } from 'lucide-react'
import { Card } from '../../../shared/ui/card'

type IntroTab = 'intro' | 'github'

const INTRO_REPO_URL = 'https://github.com/dota-pilot1/towercrane-for-uiux'

type PurposeCard = { title: string; description: string }

export function IntroView({
  projectPurposeCards,
}: {
  projectPurposeCards: PurposeCard[]
}) {
  const [tab, setTab] = useState<IntroTab>('intro')

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <Card className="rounded-[28px] p-0 overflow-hidden">
        <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="border-r border-[var(--surface-border-soft)] bg-[var(--surface-muted)] p-5">
            <div className="flex items-center gap-3 text-brand-primary mb-6 font-medium">
              <BookOpenText className="size-4" />
              <span className="text-sm tracking-wide">Menu</span>
            </div>
            <div className="space-y-1.5 font-medium">
              <SidebarButton
                active={tab === 'intro'}
                onClick={() => setTab('intro')}
                icon={<FileText className="size-4" />}
                label="소개"
              />
              <SidebarButton
                active={tab === 'github'}
                onClick={() => setTab('github')}
                icon={<GitBranch className="size-4" />}
                label="깃허브"
              />
            </div>
          </div>

          <div className="p-6">
            {tab === 'intro' ? (
              <IntroPanel cards={projectPurposeCards} />
            ) : (
              <GithubPanel />
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

function SidebarButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-[16px] border px-4 py-2.5 text-left text-[13px] transition ${
        active
          ? 'border-brand-border bg-brand-glass ui-text-primary'
          : 'border-transparent bg-transparent ui-text-secondary hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function IntroPanel({ cards }: { cards: PurposeCard[] }) {
  return (
    <div className="ui-panel-soft rounded-[24px] p-6">
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-primary">
          Project Purpose
        </span>
        <h2 className="text-2xl font-bold ui-text-primary">
          팀의 프로토타입과 문서를 한 곳에 모으는 개발 워크스페이스
        </h2>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-[20px] border border-[var(--surface-border-soft)] bg-[var(--surface-muted)] p-4 transition-all hover:border-brand-border hover:bg-brand-glass"
          >
            <h3 className="text-sm font-semibold ui-text-primary">{card.title}</h3>
            <p className="mt-2 text-[13px] leading-6 ui-text-secondary">{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function GithubPanel() {
  return (
    <div className="ui-panel-soft rounded-[24px] p-8">
      <div className="flex items-start gap-4 mb-6">
        <div className="ui-icon-button rounded-2xl p-3">
          <svg className="size-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
          </svg>
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-primary">
            Source
          </span>
          <h2 className="mt-1 text-2xl font-bold ui-text-primary">GitHub Repository</h2>
          <p className="mt-2 text-sm leading-6 ui-text-secondary">
            프로젝트 전체 코드와 이슈 트래킹은 GitHub 저장소에서 확인할 수 있습니다.
          </p>
        </div>
      </div>

      <a
        href={INTRO_REPO_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-2xl border border-brand-border bg-brand-glass px-5 py-3 text-sm font-semibold text-brand-primary transition-all hover:brightness-110"
      >
        <GitBranch className="size-4" />
        {INTRO_REPO_URL.replace('https://', '')}
        <ArrowRight className="size-4" />
      </a>
    </div>
  )
}
