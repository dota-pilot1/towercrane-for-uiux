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
  useCreateSubmission,
  useCreateGptThread,
  useSendGptMessage,
} from '../lib/hooks'
import { BlockRenderer } from '../block-editor/ui/block-renderer'
import { SubmissionForm } from '../submission/ui/submission-form'
import { SubmissionCard } from '../submission/ui/submission-card'
import { UserNotesPanel } from '../user-notes/ui/user-notes-panel'

interface ChallengeMainPanelProps {
  topicId: string
  sectionId?: string
}

export function ChallengeMainPanel({ topicId, sectionId }: ChallengeMainPanelProps) {
  const [activeTab, setActiveTab] = useState('topic')
  const { data: topic, isLoading: topicLoading } = useTopicById(topicId)
  const { data: submission, refetch: refetchSubmission } = useMySubmission(topicId)
  const sectionIdForNotes = sectionId || (topic?.sectionId as string)
  const { data: myNotes = [] } = useMyNotes(sectionIdForNotes)
  const { data: sharedNotes = [] } = useSharedNotes(sectionIdForNotes)
  const { data: gptThreads = [] } = useGptThreads(sectionIdForNotes)
  const createSubmission = useCreateSubmission()
  const updateSubmission = useUpdateSubmission()
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
                      await createSubmission.mutateAsync({
                        topicId,
                        content,
                        checkedItems,
                      })
                      await refetchSubmission()
                    }}
                    loading={createSubmission.isPending}
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
              <GptChatContent sectionId={sectionIdForNotes} topicId={topicId} />
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

function GptChatContent({ sectionId, topicId }: { sectionId: string; topicId: string }) {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const { data: gptThreads = [] } = useGptThreads(sectionId)
  const createThread = useCreateGptThread()
  const sendMessage = useSendGptMessage()

  const selectedThread = gptThreads.find((t) => t.id === selectedThreadId)

  const handleCreateThread = async () => {
    const thread = await createThread.mutateAsync({
      sectionId,
      title: `${new Date().toLocaleString()} - Study Session`,
      model: 'gpt-4o-mini',
    })
    setSelectedThreadId(thread.id)
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex gap-2">
        <button
          onClick={handleCreateThread}
          className="px-3 py-1.5 text-xs rounded bg-brand-primary text-white hover:opacity-90 disabled:opacity-50"
          disabled={createThread.isPending}
        >
          {createThread.isPending ? '생성 중...' : '새 대화 시작'}
        </button>
      </div>

      {gptThreads.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm ui-text-muted">대화를 시작하려면 &quot;새 대화 시작&quot;을 클릭하세요</p>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-y-auto">
          {gptThreads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => setSelectedThreadId(thread.id)}
              className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                selectedThreadId === thread.id
                  ? 'bg-brand-glass ui-text-primary'
                  : 'ui-text-secondary hover:bg-surface-muted'
              }`}
            >
              {thread.title}
            </button>
          ))}
        </div>
      )}

      {selectedThread && (
        <div className="border-t border-surface-border pt-4">
          <p className="text-xs ui-text-secondary mb-3">대화 기능은 추후 구현 예정입니다</p>
        </div>
      )}
    </div>
  )
}
