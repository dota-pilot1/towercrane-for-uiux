import { useState } from 'react'
import { Card } from '../../../shared/ui/card'
import { ChallengeSidebar } from '../../../features/challenge/ui/challenge-sidebar'
import { ChallengeTopicsList } from '../../../features/challenge/ui/challenge-topics-list'
import { ChallengeMainPanel } from '../../../features/challenge/ui/challenge-main-panel'

export function ChallengePage() {
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)

  return (
    <div className="flex h-[calc(100vh-120px)] gap-3">
      <ChallengeSidebar selectedCategory={selectedSection} onSelectCategory={setSelectedSection} />
      {selectedSection && (
        <ChallengeTopicsList
          sectionId={selectedSection}
          selectedTopic={selectedTopic}
          onSelectTopic={setSelectedTopic}
        />
      )}
      {selectedTopic ? (
        <ChallengeMainPanel topicId={selectedTopic} sectionId={selectedSection} />
      ) : (
        <Card className="flex-1 flex items-center justify-center rounded-md">
          <div className="text-center">
            <p className="ui-text-muted text-sm">주제를 선택하여 시작하세요</p>
          </div>
        </Card>
      )}
    </div>
  )
}
