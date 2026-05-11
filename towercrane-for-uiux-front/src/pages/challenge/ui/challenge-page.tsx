import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { Card } from '../../../shared/ui/card'
import { PageHeader } from '../../../shared/ui/page-header'
import { ChallengeSidebar } from '../../../features/challenge/ui/challenge-sidebar'
import { ChallengeTopicsList } from '../../../features/challenge/ui/challenge-topics-list'
import { useMyNotes, useSharedNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../../../features/challenge/lib/hooks'
import { UserNotesPanel } from '../../../features/challenge/user-notes/ui/user-notes-panel'

export function ChallengePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)

  const { data: myNotes = [] } = useMyNotes(selectedSection || '')
  const { data: sharedNotes = [] } = useSharedNotes(selectedSection || '')
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()

  return (
    <section className="space-y-4 ui-page-bg pb-4">
      <PageHeader
        icon={BookOpen}
        title="Study Diary"
        description="학습 주제와 노트를 관리합니다."
      />
    <div className="flex h-[calc(100vh-200px)] gap-3">
      {/* 1차: 카테고리 */}
      <ChallengeSidebar selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />

      {/* 2차: 섹션 */}
      <ChallengeTopicsList
        sectionId={selectedCategory ?? ''}
        selectedTopic={selectedSection}
        onSelectTopic={setSelectedSection}
      />

      {/* 3차: 본문 - 노트 */}
      {selectedSection ? (
        <Card className="flex-1 flex flex-col rounded-md overflow-hidden">
          <UserNotesPanel
            sectionId={selectedSection}
            myNotes={myNotes}
            sharedNotes={sharedNotes}
            onCreateNote={(data) => createNote.mutateAsync({ sectionId: selectedSection, ...data })}
            onUpdateNote={(id, data) => updateNote.mutateAsync({ id, data })}
            onDeleteNote={(id) => deleteNote.mutate(id)}
            loading={createNote.isPending || updateNote.isPending || deleteNote.isPending}
          />
        </Card>
      ) : (
        <Card className="flex-1 flex items-center justify-center rounded-md">
          <div className="text-center">
            <p className="ui-text-muted text-sm">2차 카테고리를 선택하여 시작하세요</p>
          </div>
        </Card>
      )}
    </div>
    </section>
  )
}
