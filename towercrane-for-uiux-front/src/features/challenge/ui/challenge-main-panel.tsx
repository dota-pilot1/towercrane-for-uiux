import { useState } from 'react'
import { Card } from '../../../shared/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/ui/tabs'
import { BookOpen, CheckCircle, MessageCircle, NotebookPen, Loader2 } from 'lucide-react'
import {
  useTopicById,
  useMySubmission,
  useMyNotes,
  useSharedNotes,
  useGptThreads,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from '../lib/hooks'
import { BlockRenderer } from '../block-editor/ui/block-renderer'
import { SubmissionForm } from '../submission/ui/submission-form'
import { SubmissionCard } from '../submission/ui/submission-card'
import { GptChatPanel } from '../gpt-chat/ui/gpt-chat-panel'
import { UserNotesPanel } from '../user-notes/ui/user-notes-panel'

interface ChallengeMainPanelProps {
  topicId: string
  sectionId?: string
}

export function ChallengeMainPanel({ topicId, sectionId }: ChallengeMainPanelProps) {
  const [activeTab, setActiveTab] = useState('topic')
  const { data: topic, isLoading: topicLoading } = useTopicById(topicId)
  const { data: submission } = useMySubmission(topicId)
  const sectionIdForNotes = sectionId || (topic?.sectionId as string)
  const { data: myNotes = [] } = useMyNotes(sectionIdForNotes)
  const { data: sharedNotes = [] } = useSharedNotes(sectionIdForNotes)
  const { data: gptThreads = [] } = useGptThreads(sectionIdForNotes)
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()

  return (
    <Card className="flex-1 flex flex-col rounded-md overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="border-b border-surface-border rounded-none bg-surface-muted px-4">
          <TabsTrigger value="topic" className="flex items-center gap-2">
            <BookOpen className="size-4" />
            주제
          </TabsTrigger>
          <TabsTrigger value="submission" className="flex items-center gap-2">
            <CheckCircle className="size-4" />
            풀이
          </TabsTrigger>
          <TabsTrigger value="gpt" className="flex items-center gap-2">
            <MessageCircle className="size-4" />
            GPT
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <NotebookPen className="size-4" />
            노트
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="topic" className="p-4">
            {topicLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin ui-text-secondary" />
              </div>
            ) : topic ? (
              <div className="space-y-4">
                {topic.blockTitle && (
                  <div>
                    <h3 className="font-bold ui-text-primary mb-2">{topic.blockTitle}</h3>
                  </div>
                )}
                <div className="ui-panel-soft p-4 rounded-md">
                  <BlockRenderer topic={topic} />
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm ui-text-muted">주제를 찾을 수 없습니다</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="submission" className="p-4">
            {topic ? (
              <div className="space-y-4">
                {submission ? (
                  <SubmissionCard
                    id={submission.id}
                    score={submission.score}
                    maxScore={submission.maxScore}
                    content={submission.content}
                    adminRating={submission.adminRating}
                    adminFeedback={submission.adminFeedback}
                    isOwn={true}
                  />
                ) : (
                  <SubmissionForm
                    topicId={topicId}
                    blockType={topic.blockType}
                    blockTitle={topic.blockTitle}
                    onSubmit={async (content, checkedItems) => {
                      // Implementation will be added with mutation
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm ui-text-muted">주제를 선택하세요</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="gpt" className="p-4">
            {sectionIdForNotes && topic ? (
              <GptChatPanel sectionId={sectionIdForNotes} topicId={topicId} />
            ) : (
              <div className="text-center py-8">
                <p className="text-sm ui-text-muted">주제를 선택하세요</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="p-4">
            {sectionIdForNotes && topic ? (
              <UserNotesPanel
                sectionId={sectionIdForNotes}
                myNotes={myNotes}
                sharedNotes={sharedNotes}
                onCreateNote={(data) => createNote.mutateAsync({ sectionId: sectionIdForNotes, ...data })}
                onUpdateNote={(id, data) => updateNote.mutateAsync({ id, data })}
                onDeleteNote={(id) => deleteNote.mutateAsync(id)}
                loading={createNote.isPending || updateNote.isPending || deleteNote.isPending}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-sm ui-text-muted">주제를 선택하세요</p>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  )
}
