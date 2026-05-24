import { useState } from 'react'
import { useParams, useSearch } from '@tanstack/react-router'
import { BookOpen, Loader2 } from 'lucide-react'
import { Card } from '../../../shared/ui/card'
import { PageHeader } from '../../../shared/ui/page-header'
import { NoteCard } from '../../../features/challenge/user-notes/ui/note-card'
import {
  usePublicCategories,
  usePublicDiary,
  usePublicNotes,
  usePublicSections,
  usePublicWorkspace,
  usePublicWorkspaceCategories,
  usePublicWorkspaceNotes,
  usePublicWorkspaceSections,
} from '../../../features/study-diary/lib/hooks'

function PublicNotesPanel({
  targetUserId,
  workspaceId,
  sectionId,
}: {
  targetUserId: string
  workspaceId: string
  sectionId: string
}) {
  const userNotesQuery = usePublicNotes(targetUserId, sectionId)
  const workspaceNotesQuery = usePublicWorkspaceNotes(workspaceId, sectionId)
  const activeQuery = workspaceId ? workspaceNotesQuery : userNotesQuery
  const notes = activeQuery.data ?? []
  const isLoading = activeQuery.isLoading

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin ui-text-secondary" />
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm ui-text-muted">노트가 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 overflow-y-auto p-4">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          isMine={false}
          onUpdate={() => {}}
          onDelete={() => {}}
        />
      ))}
    </div>
  )
}

export function StudyDiaryPublicPage() {
  const { userId, workspaceId } = useParams({ strict: false }) as { userId?: string; workspaceId?: string }
  const search = useSearch({ strict: false }) as { cat?: string; sec?: string }
  const [selectedCategory, setSelectedCategory] = useState<string | null>(search.cat ?? null)
  const [selectedSection, setSelectedSection] = useState<string | null>(search.sec ?? null)

  const targetUserId = userId ?? ''
  const targetWorkspaceId = workspaceId ?? ''
  const publicDiaryQuery = usePublicDiary(targetUserId)
  const publicWorkspaceQuery = usePublicWorkspace(targetWorkspaceId)
  const categoriesQuery = usePublicCategories(targetUserId)
  const workspaceCategoriesQuery = usePublicWorkspaceCategories(targetWorkspaceId)
  const sectionsQuery = usePublicSections(targetUserId, selectedCategory ?? '')
  const workspaceSectionsQuery = usePublicWorkspaceSections(targetWorkspaceId, selectedCategory ?? '')

  const diaryQuery = targetWorkspaceId ? publicWorkspaceQuery : publicDiaryQuery
  const activeCategoriesQuery = targetWorkspaceId ? workspaceCategoriesQuery : categoriesQuery
  const activeSectionsQuery = targetWorkspaceId ? workspaceSectionsQuery : sectionsQuery
  const diary = diaryQuery.data
  const diaryLoading = diaryQuery.isLoading
  const isError = diaryQuery.isError
  const categories = activeCategoriesQuery.data ?? []
  const categoriesLoading = activeCategoriesQuery.isLoading
  const sections = activeSectionsQuery.data ?? []
  const sectionsLoading = activeSectionsQuery.isLoading

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setSelectedSection(null)
  }

  if (isError) {
    return (
      <section className="space-y-4 ui-page-bg pb-4">
        <Card className="flex h-[calc(100vh-200px)] items-center justify-center rounded-md">
          <div className="text-center">
            <p className="text-sm font-medium ui-text-primary">다이어리를 찾을 수 없습니다</p>
            <p className="mt-1 text-xs ui-text-muted">비공개이거나 존재하지 않는 다이어리입니다</p>
          </div>
        </Card>
      </section>
    )
  }

  return (
    <section className="space-y-4 ui-page-bg pb-4">
      <PageHeader
        icon={BookOpen}
        title={diaryLoading ? '스터디 다이어리' : (diary?.title ?? '스터디 다이어리')}
        description={diary ? `${diary.ownerName}의 스터디 다이어리 (읽기 전용)` : ''}
      />

      {diaryLoading ? (
        <Card className="flex h-[calc(100vh-200px)] items-center justify-center rounded-md">
          <Loader2 className="size-5 animate-spin ui-text-secondary" />
        </Card>
      ) : (
        <div className="flex h-[calc(100vh-200px)] gap-3">
          {/* 1차 주제 */}
          <Card className="w-[220px] overflow-y-auto rounded-md p-0">
            <div className="sticky top-0 border-b border-surface-border bg-surface-muted p-3">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-brand-primary" />
                <p className="text-xs font-bold ui-text-primary">1차 주제</p>
              </div>
            </div>
            <div className="space-y-0.5 p-2">
              {categoriesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-4 animate-spin ui-text-secondary" />
                </div>
              ) : categories.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs ui-text-muted">주제가 없습니다</p>
                </div>
              ) : (
                categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleSelectCategory(category.id)}
                    className={`w-full rounded-md px-3 py-2 text-left text-xs font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-brand-glass ui-text-primary'
                        : 'ui-text-secondary hover:bg-surface-muted'
                    }`}
                  >
                    {category.name}
                  </button>
                ))
              )}
            </div>
          </Card>

          {/* 2차 주제 */}
          <Card className="w-[260px] overflow-y-auto rounded-md p-0">
            <div className="sticky top-0 border-b border-surface-border bg-surface-muted p-3">
              <p className="text-xs font-bold ui-text-primary">2차 주제 ({sections.length})</p>
            </div>
            <div className="space-y-0.5 p-2">
              {!selectedCategory ? (
                <div className="py-8 text-center">
                  <p className="text-xs ui-text-muted">1차 주제를 선택하세요</p>
                </div>
              ) : sectionsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-4 animate-spin ui-text-secondary" />
                </div>
              ) : sections.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs ui-text-muted">주제가 없습니다</p>
                </div>
              ) : (
                sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setSelectedSection(section.id)}
                    className={`w-full rounded-md px-3 py-2 text-left text-xs font-medium transition-colors ${
                      selectedSection === section.id
                        ? 'bg-brand-glass ui-text-primary'
                        : 'ui-text-secondary hover:bg-surface-muted'
                    }`}
                  >
                    {section.title || '(제목 없음)'}
                  </button>
                ))
              )}
            </div>
          </Card>

          {/* 노트 패널 */}
          {selectedSection ? (
            <Card className="flex flex-1 flex-col overflow-hidden rounded-md">
              <PublicNotesPanel
                targetUserId={targetUserId}
                workspaceId={targetWorkspaceId}
                sectionId={selectedSection}
              />
            </Card>
          ) : (
            <Card className="flex flex-1 items-center justify-center rounded-md">
              <div className="text-center">
                <p className="text-sm ui-text-muted">2차 주제를 선택하여 노트를 확인하세요</p>
              </div>
            </Card>
          )}
        </div>
      )}
    </section>
  )
}
