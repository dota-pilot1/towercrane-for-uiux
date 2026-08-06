import { useNavigate, useSearch } from '@tanstack/react-router'
import { ChevronLeft, Trophy } from 'lucide-react'
import { PageHeader } from '../../../shared/ui/page-header'
import { DevChallengeCategoryPanel } from '../../../features/dev-challenge/ui/dev-challenge-category-panel'
import { DevChallengeSectionPanel } from '../../../features/dev-challenge/ui/dev-challenge-section-panel'
import { DevChallengeMainPanel } from '../../../features/dev-challenge/ui/dev-challenge-main-panel'
import { useDevChallengeWorkspace } from '../../../features/dev-challenge/lib/hooks'

type DevChallengePageProps = {
  workspaceId?: string
}

export function DevChallengePage({ workspaceId }: DevChallengePageProps) {
  const search = useSearch({ strict: false }) as { cat?: string; sec?: string; asgn?: string }
  const navigate = useNavigate()
  const workspaceQuery = useDevChallengeWorkspace(workspaceId ?? '')
  const workspace = workspaceQuery.data

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
        title={workspace?.name ?? 'Challenge Playbook'}
        description={workspace?.description || '실전 과제를 문서화하고 참가자 제출을 함께 관리합니다.'}
        actions={
          workspaceId ? (
            <button
              type="button"
              className="inline-flex h-8 items-center justify-center rounded-sm border border-background bg-background px-3 text-sm font-semibold text-text-primary transition hover:bg-surface-raised"
              onClick={() => navigate({ to: '/challenge-playbook' })}
            >
              <ChevronLeft className="mr-1.5 size-4" />
              워크스페이스
            </button>
          ) : null
        }
      />

      <div className="flex h-[calc(100vh-200px)] gap-3">
        <DevChallengeCategoryPanel
          workspaceId={workspaceId}
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
