import { useEffect, useState } from 'react'
import { Card } from '../../../shared/ui/card'
import { ChallengeSidebar } from '../../../features/challenge/ui/challenge-sidebar'
import { ChallengeTopicsList } from '../../../features/challenge/ui/challenge-topics-list'
import { useCategories, useMyNotes, useSharedNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../../../features/challenge/lib/hooks'
import { UserNotesPanel } from '../../../features/challenge/user-notes/ui/user-notes-panel'

export function ChallengePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)

  const { data: categories = [] } = useCategories()

  useEffect(() => {
    if (selectedCategory === null && categories.length > 0) {
      setSelectedCategory(categories[0].id)
    }
  }, [categories, selectedCategory])

  const { data: myNotes = [] } = useMyNotes(selectedSection || '')
  const { data: sharedNotes = [] } = useSharedNotes(selectedSection || '')
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()

  return (
    <div className="flex h-[calc(100vh-120px)] gap-3">
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
            onDeleteNote={(id) => deleteNote.mutateAsync(id)}
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
  )
}
