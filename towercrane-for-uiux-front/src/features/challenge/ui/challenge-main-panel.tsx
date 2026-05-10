import { useState } from 'react'
import { Card } from '../../../shared/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/ui/tabs'
import { BookOpen, CheckCircle, MessageCircle, NotebookPen } from 'lucide-react'

interface ChallengeMainPanelProps {
  topicId: string
}

export function ChallengeMainPanel({ topicId }: ChallengeMainPanelProps) {
  const [activeTab, setActiveTab] = useState('topic')

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
            <div className="space-y-4">
              <div>
                <h3 className="font-bold ui-text-primary mb-2">주제 제목</h3>
                <p className="text-sm ui-text-secondary">주제 설명과 내용이 여기에 표시됩니다</p>
              </div>
              <div className="ui-panel-soft p-4 rounded-md">
                <p className="text-sm ui-text-secondary">블록 타입에 따른 렌더링 (NOTE, CHECKLIST 등)</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="submission" className="p-4">
            <div className="space-y-4">
              <div className="ui-panel-soft p-4 rounded-md">
                <p className="text-sm ui-text-secondary">풀이 폼 (M6에서 구현)</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gpt" className="p-4">
            <div className="space-y-4">
              <div className="ui-panel-soft p-4 rounded-md">
                <p className="text-sm ui-text-secondary">GPT 챗 인터페이스 (M7에서 구현)</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="p-4">
            <div className="space-y-4">
              <div className="ui-panel-soft p-4 rounded-md">
                <p className="text-sm ui-text-secondary">노트 목록 및 에디터 (M8에서 구현)</p>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  )
}
