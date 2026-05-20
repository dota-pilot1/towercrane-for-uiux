import { useNavigate, useSearch } from '@tanstack/react-router'
import { Trophy } from 'lucide-react'
import { PageHeader } from '../../../shared/ui/page-header'
import { DevChallengeCategoryPanel } from '../../../features/dev-challenge/ui/dev-challenge-category-panel'
import { DevChallengeSectionPanel } from '../../../features/dev-challenge/ui/dev-challenge-section-panel'
import { DevChallengeMainPanel } from '../../../features/dev-challenge/ui/dev-challenge-main-panel'

export function DevChallengePage() {
  const search = useSearch({ strict: false }) as { cat?: string; sec?: string; asgn?: string }
  const navigate = useNavigate()

  const selectedCategoryId = search.cat ?? null
  const selectedSectionId = search.sec ?? null
  const selectedAssignmentId = search.asgn ?? null

  // 단일 navigate 호출로 병합 — 두 번 호출 시 두 번째가 첫 번째를 덮어쓰는 문제 방지
  const setSelectedCategoryId = (id: string | null) => {
    navigate({ search: { cat: id ?? undefined, sec: undefined, asgn: undefined }, replace: true })
  }

  const setSelectedSectionId = (id: string | null) => {
    navigate({ search: { cat: search.cat, sec: id ?? undefined, asgn: undefined }, replace: true })
  }

  const setSelectedAssignmentId = (id: string | null) => {
    navigate({ search: { cat: search.cat, sec: search.sec, asgn: id ?? undefined }, replace: true })
  }

  return (
    <section className="space-y-4 ui-page-bg pb-4">
      <PageHeader
        icon={Trophy}
        title="Dev Challenge"
        description="개발 챌린지를 출제하고 제출을 관리합니다."
      />

      <div className="flex h-[calc(100vh-200px)] gap-3">
        <DevChallengeCategoryPanel
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          onResetSection={() => {}} // setSelectedCategoryId가 sec·asgn 초기화까지 포함
        />

        <DevChallengeSectionPanel
          categoryId={selectedCategoryId ?? ''}
          selectedSectionId={selectedSectionId}
          onSelectSection={setSelectedSectionId}
        />

        <DevChallengeMainPanel
          sectionId={selectedSectionId}
          selectedAssignmentId={selectedAssignmentId}
          onSelectAssignment={setSelectedAssignmentId}
        />
      </div>
    </section>
  )
}
