import { useState } from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { ArrowLeft, BookOpen, Check, Copy, Globe, Lock, Loader2 } from 'lucide-react'
import { Card } from '../../../shared/ui/card'
import { PageHeader } from '../../../shared/ui/page-header'
import { UserNotesPanel } from '../../../features/challenge/user-notes/ui/user-notes-panel'
import {
  useCreateStudyDiaryNote,
  useDeleteStudyDiaryNote,
  useStudyDiaryWorkspace,
  useStudyDiaryMyNotes,
  useUpdateStudyDiaryWorkspace,
  useUpdateStudyDiaryNote,
} from '../../../features/study-diary/lib/hooks'
import { StudyDiarySectionList } from '../../../features/study-diary/ui/study-diary-section-list'
import { StudyDiarySidebar } from '../../../features/study-diary/ui/study-diary-sidebar'

function ShareButton({ diary }: { diary: { id: string; visibility: string } | undefined }) {
  const [copied, setCopied] = useState(false)
  const updateDiary = useUpdateStudyDiaryWorkspace(diary?.id ?? '')

  const isShared = diary?.visibility === 'shared' || diary?.visibility === 'public'
  const shareUrl = diary ? `${window.location.origin}/study-diary/public/${diary.id}` : ''

  const handleToggleShare = async () => {
    if (!diary) return
    await updateDiary.mutateAsync({ visibility: isShared ? 'private' : 'shared' })
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      {isShared && (
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md border border-background/20 bg-background/10 px-3 py-1.5 text-xs text-background transition-colors hover:bg-background/20"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? '복사됨' : '링크 복사'}
        </button>
      )}
      <button
        onClick={handleToggleShare}
        disabled={updateDiary.isPending}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          isShared
            ? 'bg-background/20 border border-background/20 text-background hover:bg-background/30'
            : 'border border-background/20 bg-background/10 text-background/70 hover:bg-background/20'
        }`}
      >
        {isShared ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
        {isShared ? '공개 중' : '비공개'}
      </button>
    </div>
  )
}

export function StudyDiaryPage() {
  const params = useParams({ strict: false }) as { workspaceId?: string }
  const search = useSearch({ strict: false }) as { cat?: string; sec?: string }
  const navigate = useNavigate()
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)

  const workspaceId = params.workspaceId ?? ''
  const selectedCategory = search.cat ?? null
  const selectedSection = search.sec ?? null

  const setSelectedCategory = (id: string | null) => {
    navigate({
      to: '/study-diary/workspaces/$workspaceId',
      params: { workspaceId },
      search: { cat: id ?? undefined, sec: undefined },
      replace: true,
    })
  }
  const setSelectedSection = (id: string | null) => {
    navigate({
      to: '/study-diary/workspaces/$workspaceId',
      params: { workspaceId },
      search: { cat: search.cat, sec: id ?? undefined },
      replace: true,
    })
  }

  const { data: diary, isLoading: diaryLoading } = useStudyDiaryWorkspace(workspaceId)
  const { data: myNotes = [] } = useStudyDiaryMyNotes(selectedSection || '', workspaceId)
  const createNote = useCreateStudyDiaryNote()
  const updateNote = useUpdateStudyDiaryNote()
  const deleteNote = useDeleteStudyDiaryNote()

  const handleSelectCategory = (categoryId: string | null) => {
    setSelectedCategory(categoryId)
  }

  if (!workspaceId) {
    return (
      <section className="space-y-4 ui-page-bg pb-4">
        <Card className="flex h-[calc(100vh-200px)] items-center justify-center rounded-md">
          <p className="text-sm ui-text-muted">워크스페이스를 찾을 수 없습니다.</p>
        </Card>
      </section>
    )
  }

  return (
    <section className="space-y-4 ui-page-bg pb-4">
      <PageHeader
        icon={BookOpen}
        title={diary?.title ?? '스터디 다이어리'}
        description={diary?.description ?? '학습 주제와 노트를 워크스페이스에 정리합니다.'}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate({ to: '/study-diary' })}
              className="flex items-center gap-1.5 rounded-md border border-background/20 bg-background/10 px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-background/20"
              aria-label="워크스페이스 목록으로 돌아가기"
              title="워크스페이스 목록"
            >
              <ArrowLeft className="size-3.5" />
              워크스페이스
            </button>
            <ShareButton diary={diary} />
          </div>
        }
      />

      {diaryLoading ? (
        <Card className="flex h-[calc(100vh-200px)] items-center justify-center rounded-md">
          <Loader2 className="size-5 animate-spin ui-text-secondary" />
        </Card>
      ) : (
        <div className="flex h-[calc(100vh-200px)] gap-3">
          <StudyDiarySidebar
            workspaceId={workspaceId}
            selectedCategory={selectedCategory}
            onSelectCategory={handleSelectCategory}
          />

          <StudyDiarySectionList
            workspaceId={workspaceId}
            categoryId={selectedCategory ?? ''}
            selectedSection={selectedSection}
            onSelectSection={setSelectedSection}
          />

          {selectedSection ? (
            <Card className="flex flex-1 flex-col overflow-hidden rounded-md">
              <UserNotesPanel
                sectionId={selectedSection}
                myNotes={myNotes}
                shareUrl={`${window.location.origin}/study-diary/public/${workspaceId}?cat=${selectedCategory}&sec=${selectedSection}`}
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
