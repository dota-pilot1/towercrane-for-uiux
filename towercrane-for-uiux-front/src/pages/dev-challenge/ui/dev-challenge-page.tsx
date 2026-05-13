import { useState } from 'react'
import { Trophy } from 'lucide-react'
import { PageHeader } from '../../../shared/ui/page-header'
import { DevChallengeCategoryPanel } from '../../../features/dev-challenge/ui/dev-challenge-category-panel'
import { DevChallengeSectionPanel } from '../../../features/dev-challenge/ui/dev-challenge-section-panel'
import { DevChallengeMainPanel } from '../../../features/dev-challenge/ui/dev-challenge-main-panel'

export function DevChallengePage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)

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
          onResetSection={() => setSelectedSectionId(null)}
        />

        <DevChallengeSectionPanel
          categoryId={selectedCategoryId ?? ''}
          selectedSectionId={selectedSectionId}
          onSelectSection={setSelectedSectionId}
        />

        <DevChallengeMainPanel sectionId={selectedSectionId} />
      </div>
    </section>
  )
}
