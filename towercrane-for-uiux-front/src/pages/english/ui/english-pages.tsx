import type { ElementType } from 'react'
import { BookOpen, Construction, Headphones, Newspaper, Smile } from 'lucide-react'

// 영어 학습 코너 — 공통 스켈레톤 (구현 예정)
function EnglishPlaceholder({
  icon: Icon,
  title,
  desc,
  plan,
}: {
  icon: ElementType
  title: string
  desc: string
  plan: string
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="ui-panel-soft rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-brand-glass text-brand-primary">
            <Icon className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-text-primary">{title}</h1>
            <p className="text-sm text-text-secondary">{desc}</p>
          </div>
        </div>
      </div>

      <div className="ui-panel mt-6 flex flex-col items-center justify-center gap-3 rounded-xl px-6 py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-surface-muted text-text-muted">
          <Construction className="size-7" />
        </div>
        <p className="text-base font-bold text-text-primary">구현 예정</p>
        <p className="max-w-md text-sm text-text-secondary">{plan}</p>
      </div>
    </div>
  )
}

export function EnglishDiaryPage() {
  return (
    <EnglishPlaceholder
      icon={BookOpen}
      title="영어 개발 일기"
      desc="개발 일지를 영어로 작성하고 첨삭받기"
      plan="영어로 개발 일기를 쓰고 AI가 문법·표현을 교정해주는 기능이 추가될 예정입니다."
    />
  )
}

export function EnglishNewsPage() {
  return (
    <EnglishPlaceholder
      icon={Newspaper}
      title="영어 뉴스 보기"
      desc="기술 영어 뉴스 읽기 · 단어 학습"
      plan="개발·기술 관련 영어 뉴스를 읽고 모르는 단어를 학습하는 기능이 추가될 예정입니다."
    />
  )
}

export function EnglishListeningPage() {
  return (
    <EnglishPlaceholder
      icon={Headphones}
      title="영어 듣기 연습"
      desc="듣고 받아쓰기 · 발음 연습"
      plan="영어 음성을 듣고 받아쓰며 듣기·발음을 연습하는 기능이 추가될 예정입니다."
    />
  )
}

export function EnglishCharacterPage() {
  return (
    <EnglishPlaceholder
      icon={Smile}
      title="영어 챗봇 캐릭터 회화"
      desc="3D 캐릭터와 영어 롤플레이 회화"
      plan="3D 캐릭터(R3F)와 상황별 롤플레이로 영어 회화를 연습하는 기능이 추가될 예정입니다."
    />
  )
}
