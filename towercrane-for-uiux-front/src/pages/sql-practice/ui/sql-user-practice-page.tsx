import {
  FileUp,
  ListPlus,
  PanelRight,
  ShieldCheck,
} from 'lucide-react'

import { Card } from '../../../shared/ui/card'

type SqlUserPracticePageProps = {
  mode: 'user' | 'personal'
}

const pageCopy = {
  user: {
    title: 'SQL 연습장(유저)',
    description: '유저들이 업로드한 SQL 파일과 직접 낸 문제를 함께 풀 수 있는 공간입니다.',
    plannedItems: [
      {
        icon: FileUp,
        title: '유저 SQL 파일 업로드',
        description: '유저가 seed SQL 파일을 올리고 공유 가능한 연습 DB를 구성합니다.',
      },
      {
        icon: PanelRight,
        title: '공유 파일 설정 사이드바',
        description: '오른쪽 패널에서 유저가 올린 SQL 파일을 선택하고 초기화합니다.',
      },
      {
        icon: ListPlus,
        title: '유저 문제 출제',
        description: '왼쪽 문제 목록에 유저가 만든 문제와 정답 SQL을 등록합니다.',
      },
    ],
  },
  personal: {
    title: 'SQL 연습장(개인)',
    description: '본인만 쓰는 SQL 파일과 문제를 따로 관리할 개인 연습 공간입니다.',
    plannedItems: [
      {
        icon: FileUp,
        title: '개인 SQL 파일 업로드',
        description: '내 계정에서만 보이는 SQL 파일을 올리고 개인 연습 DB를 구성합니다.',
      },
      {
        icon: PanelRight,
        title: '개인 파일 설정 사이드바',
        description: '오른쪽 패널에서 내 SQL 파일을 선택하고 리셋합니다.',
      },
      {
        icon: ListPlus,
        title: '개인 문제 추가',
        description: '혼자 풀 문제와 정답 SQL을 직접 추가합니다.',
      },
    ],
  },
} as const

export function SqlUserPracticePage({ mode }: SqlUserPracticePageProps) {
  const copy = pageCopy[mode]

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-170px)] w-full max-w-[1720px] flex-col gap-4">
      <Card className="flex min-h-[calc(100dvh-220px)] flex-col overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised p-0">
        <div className="border-b border-surface-border-soft px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
              <ShieldCheck className="size-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black leading-none text-text-primary">{copy.title}</h1>
              <p className="mt-2 text-sm font-medium text-text-muted">
                {copy.description}
              </p>
            </div>
          </div>
        </div>

        <div className="grid flex-1 gap-4 p-5 lg:grid-cols-[18rem_minmax(0,1fr)_20rem]">
          <section className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted/60 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-text-muted">
              Problems
            </p>
            <div className="mt-4 space-y-2">
              {Array.from({ length: 5 }, (_, index) => (
                <div
                  key={index}
                  className="h-11 rounded-md border border-surface-border-soft bg-surface-raised/70"
                />
              ))}
            </div>
          </section>

          <section className="flex items-center justify-center rounded-md border border-dashed border-surface-border-soft bg-surface-muted/40 p-6">
            <div className="w-full max-w-2xl space-y-4">
              {copy.plannedItems.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.title}
                    className="flex gap-3 rounded-md border border-surface-border-soft bg-surface-raised/75 p-4"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-black text-text-primary">{item.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-text-muted">
                        {item.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted/60 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-text-muted">
              Files
            </p>
            <div className="mt-4 rounded-md border border-surface-border-soft bg-surface-raised/70 p-4">
              <div className="h-4 w-28 rounded bg-surface-muted" />
              <div className="mt-4 space-y-2">
                <div className="h-3 rounded bg-surface-muted" />
                <div className="h-3 w-2/3 rounded bg-surface-muted" />
                <div className="h-3 w-1/2 rounded bg-surface-muted" />
              </div>
            </div>
          </section>
        </div>
      </Card>
    </div>
  )
}
