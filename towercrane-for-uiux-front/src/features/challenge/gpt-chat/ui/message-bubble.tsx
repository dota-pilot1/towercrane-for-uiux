import { Zap } from 'lucide-react'

interface MessageBubbleProps {
  message: {
    role: 'user' | 'assistant' | 'system'
    content: string
    createdAt: string
  }
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`flex items-start gap-2 max-w-xs lg:max-w-md xl:max-w-lg ${
          isUser ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {isAssistant && (
          <div className="ui-icon-button-brand rounded-md p-1.5 shrink-0">
            <Zap className="size-3" />
          </div>
        )}

        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            isUser
              ? 'bg-brand-glass ui-text-primary'
              : isAssistant
                ? 'bg-surface-raised ui-text-secondary'
                : 'bg-surface-muted ui-text-muted text-xs'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    </div>
  )
}
