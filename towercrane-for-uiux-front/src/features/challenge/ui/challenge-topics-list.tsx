import { Card } from '../../../shared/ui/card'
import { Code2, FileText, CheckSquare } from 'lucide-react'

interface ChallengeTopicsListProps {
  sectionId: string
  selectedTopic: string | null
  onSelectTopic: (id: string) => void
}

const blockTypeIcons = {
  NOTE: <FileText className="size-3.5" />,
  MMD: <Code2 className="size-3.5" />,
  CHECKLIST: <CheckSquare className="size-3.5" />,
  GITHUB: <Code2 className="size-3.5" />,
  FIGMA: <FileText className="size-3.5" />,
  FILE: <FileText className="size-3.5" />,
  DBTABLE: <Code2 className="size-3.5" />,
}

export function ChallengeTopicsList({ sectionId, selectedTopic, onSelectTopic }: ChallengeTopicsListProps) {
  // TODO: Replace with useQuery hook
  const topics = [
    { id: '1', blockType: 'NOTE', blockTitle: '스프링 소개' },
    { id: '2', blockType: 'CHECKLIST', blockTitle: '체크리스트' },
    { id: '3', blockType: 'CODE', blockTitle: '예제 코드' },
  ]

  return (
    <Card className="w-[260px] overflow-y-auto rounded-md p-0">
      <div className="sticky top-0 border-b border-surface-border bg-surface-muted p-3">
        <p className="text-xs font-bold ui-text-primary">주제 (3)</p>
      </div>

      <div className="space-y-1 p-2">
        {topics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onSelectTopic(topic.id)}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs transition-colors ${
              selectedTopic === topic.id
                ? 'bg-brand-glass ui-text-primary'
                : 'ui-text-secondary hover:bg-surface-muted'
            }`}
          >
            <span className="text-brand-primary">
              {blockTypeIcons[topic.blockType as keyof typeof blockTypeIcons]}
            </span>
            <span className="truncate font-medium">{topic.blockTitle}</span>
          </button>
        ))}
      </div>
    </Card>
  )
}
