import { useState } from 'react'
import { BookOpen, Loader2 } from 'lucide-react'
import { Card } from '../../../shared/ui/card'
import { PageHeader } from '../../../shared/ui/page-header'
import { UserNotesPanel } from '../../../features/challenge/user-notes/ui/user-notes-panel'
import {
  useCreateStudyDiaryNote,
  useDeleteStudyDiaryNote,
  useStudyDiary,
  useStudyDiaryMyNotes,
  useUpdateStudyDiaryNote,
} from '../../../features/study-diary/lib/hooks'
import { StudyDiarySectionList } from '../../../features/study-diary/ui/study-diary-section-list'
import { StudyDiarySidebar } from '../../../features/study-diary/ui/study-diary-sidebar'

export function StudyDiaryPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)

  const { data: diary, isLoading: diaryLoading } = useStudyDiary()
  const { data: myNotes = [] } = useStudyDiaryMyNotes(selectedSection || '')
  const createNote = useCreateStudyDiaryNote()
  const updateNote = useUpdateStudyDiaryNote()
  const deleteNote = useDeleteStudyDiaryNote()

  const handleSelectCategory = (categoryId: string | null) => {
    setSelectedCategory(categoryId)
    setSelectedSection(null)
  }

  return (
    <section className="space-y-4 ui-page-bg pb-4">
      <PageHeader
        icon={BookOpen}
        title={diary?.title ?? '스터디 다이어리'}
        description="학습 주제와 노트를 개인 공간에 정리합니다."
      />

      {diaryLoading ? (
        <Card className="flex h-[calc(100vh-200px)] items-center justify-center rounded-md">
          <Loader2 className="size-5 animate-spin ui-text-secondary" />
        </Card>
      ) : (
        <div className="flex h-[calc(100vh-200px)] gap-3">
          <StudyDiarySidebar
            selectedCategory={selectedCategory}
            onSelectCategory={handleSelectCategory}
          />

          <StudyDiarySectionList
            categoryId={selectedCategory ?? ''}
            selectedSection={selectedSection}
            onSelectSection={setSelectedSection}
          />

          {selectedSection ? (
            <Card className="flex flex-1 flex-col overflow-hidden rounded-md">
              <UserNotesPanel
                sectionId={selectedSection}
                myNotes={myNotes}
                onCreateNote={async (data) => {
                  await createNote.mutateAsync({ sectionId: selectedSection, ...data })
                }}
                onUpdateNote={async (id, data) => {
                  await updateNote.mutateAsync({ id, data })
                }}
                onDeleteNote={(id) => {
                  setDeletingNoteId(id)
                  deleteNote.mutate(id, {
                    onSettled: () => setDeletingNoteId(null),
                  })
                }}
                isDeletingNoteId={deletingNoteId}
                deleteNoteError={deleteNote.isError ? (deleteNote.error as Error)?.message ?? '삭제 실패' : null}
                loading={createNote.isPending || updateNote.isPending || deleteNote.isPending}
              />
            </Card>
          ) : (
            <Card className="flex flex-1 items-center justify-center rounded-md">
              <div className="text-center">
                <p className="text-sm ui-text-muted">2차 주제를 선택하여 노트를 시작하세요</p>
              </div>
            </Card>
          )}
        </div>
      )}
    </section>
  )
}
