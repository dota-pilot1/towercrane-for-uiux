import { useState } from 'react'
import { Plus, MessageCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../shared/ui/tabs'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

interface Thread {
  id: string
  title: string
  model: string
  isShared: boolean
  messages: Message[]
}

interface GptChatPanelProps {
  threads: Thread[]
  selectedThreadId: string | null
  onSelectThread: (id: string) => void
  onCreateThread: () => Promise<void>
  onSendMessage: (threadId: string, content: string) => Promise<void>
  loading?: boolean
}

export function GptChatPanel({
  threads,
  selectedThreadId,
  onSelectThread,
  onCreateThread,
  onSendMessage,
  loading = false,
}: GptChatPanelProps) {
  const [chatTab, setChatTab] = useState('mine')
  const selectedThread = threads.find((t) => t.id === selectedThreadId)

  const myThreads = threads.filter((t) => !t.isShared)
  const sharedThreads = threads.filter((t) => t.isShared && t.id !== selectedThreadId)

  return (
    <div className="flex gap-3 h-full">
      {/* Sidebar */}
      <div className="w-64 border-r border-surface-border overflow-y-auto flex flex-col">
        <button
          onClick={onCreateThread}
          disabled={loading}
          className="m-3 flex items-center justify-center gap-2 rounded-md bg-brand-primary text-white px-3 py-2 text-xs font-medium hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="size-4" />
          새 스레드
        </button>

        <Tabs value={chatTab} onValueChange={setChatTab} className="flex-1 flex flex-col">
          <TabsList className="border-b border-surface-border rounded-none bg-surface-muted px-0 justify-start">
            <TabsTrigger value="mine" className="text-xs py-2">
              내 대화 ({myThreads.length})
            </TabsTrigger>
            <TabsTrigger value="shared" className="text-xs py-2">
              공유 ({sharedThreads.length})
            </TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto">
            <TabsContent value="mine" className="p-2 space-y-1 m-0">
              {myThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => onSelectThread(thread.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-xs truncate transition-colors ${
                    selectedThreadId === thread.id
                      ? 'bg-brand-glass ui-text-primary'
                      : 'ui-text-secondary hover:bg-surface-muted'
                  }`}
                >
                  {thread.title}
                </button>
              ))}
            </TabsContent>

            <TabsContent value="shared" className="p-2 space-y-1 m-0">
              {sharedThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => onSelectThread(thread.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-xs truncate transition-colors ${
                    selectedThreadId === thread.id
                      ? 'bg-brand-glass ui-text-primary'
                      : 'ui-text-secondary hover:bg-surface-muted'
                  }`}
                >
                  {thread.title}
                </button>
              ))}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Chat area */}
      {selectedThread ? (
        <div className="flex-1 flex flex-col bg-surface-muted rounded-md overflow-hidden">
          <div className="border-b border-surface-border p-3 bg-surface-raised">
            <h3 className="text-sm font-bold ui-text-primary">{selectedThread.title}</h3>
            <p className="text-xs ui-text-secondary">{selectedThread.model}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedThread.messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <p className="text-xs ui-text-muted">대화를 시작해보세요</p>
              </div>
            ) : (
              selectedThread.messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))
            )}
          </div>

          <MessageInput
            onSend={(content) => onSendMessage(selectedThread.id, content)}
            disabled={loading}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-surface-muted rounded-md">
          <div className="text-center">
            <MessageCircle className="size-8 text-surface-border mx-auto mb-2" />
            <p className="text-xs ui-text-muted">스레드를 선택하거나 새로 만들어보세요</p>
          </div>
        </div>
      )}
    </div>
  )
}
