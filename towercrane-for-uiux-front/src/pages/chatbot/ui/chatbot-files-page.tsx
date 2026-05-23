import { useState, useRef } from 'react'
import { Paperclip, Send, Bot, User, X, FileText, Image, File } from 'lucide-react'

type AttachedFile = { id: string; name: string; size: number; type: string }
type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  files?: AttachedFile[]
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <Image className="size-3.5" />
  if (type === 'application/pdf' || type.includes('text')) return <FileText className="size-3.5" />
  return <File className="size-3.5" />
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ChatbotFilesPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: '파일 첨부 실습 페이지입니다. 파일을 첨부하고 메시지를 보내보세요.',
    },
  ])
  const [input, setInput] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const newFiles: AttachedFile[] = files.map((f) => ({
      id: Date.now().toString() + f.name,
      name: f.name,
      size: f.size,
      type: f.type,
    }))
    setAttachedFiles((prev) => [...prev, ...newFiles])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeFile(id: string) {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  function handleSend() {
    const text = input.trim()
    if (!text && attachedFiles.length === 0) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text || '(파일만 첨부)',
      files: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
    }

    const fileNames = attachedFiles.map((f) => f.name).join(', ')
    const replyContent = attachedFiles.length > 0
      ? `파일을 받았습니다: ${fileNames}. 실제 API 연동 시 파일 내용을 분석해 답변합니다.`
      : '메시지를 받았습니다. 실제 API 연동 시 AI가 답변합니다.'

    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: replyContent,
    }

    setMessages((prev) => [...prev, userMsg, botMsg])
    setInput('')
    setAttachedFiles([])
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-120px)] max-w-3xl flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="ui-icon-button-brand rounded-md p-2.5">
          <Paperclip className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold ui-text-primary">파일 첨부</h1>
          <p className="text-xs ui-text-secondary">파일 업로드 UI · 첨부 미리보기 · 전송 흐름 실습</p>
        </div>
      </div>

      <div className="ui-panel flex-1 overflow-y-auto rounded-lg p-4">
        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                msg.role === 'assistant' ? 'bg-brand-glass border border-brand-border' : 'bg-[var(--surface-strong)]'
              }`}>
                {msg.role === 'assistant'
                  ? <Bot className="size-4 text-brand-primary" />
                  : <User className="size-4 ui-text-secondary" />}
              </div>
              <div className="flex max-w-[75%] flex-col gap-2">
                {msg.files && msg.files.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.files.map((f) => (
                      <div key={f.id} className="flex items-center gap-1.5 rounded-lg border border-[var(--surface-border-soft)] bg-[var(--surface-muted)] px-2.5 py-1.5 text-xs ui-text-secondary">
                        {fileIcon(f.type)}
                        <span className="max-w-[120px] truncate">{f.name}</span>
                        <span className="ui-text-muted">{formatBytes(f.size)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-brand-glass border border-brand-border text-brand-primary'
                    : 'bg-[var(--surface-raised)] border border-[var(--surface-border-soft)] ui-text-primary'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 첨부 파일 미리보기 */}
      {attachedFiles.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 rounded-lg border border-[var(--surface-border-soft)] bg-[var(--surface-muted)] p-2">
          {attachedFiles.map((f) => (
            <div key={f.id} className="flex items-center gap-1.5 rounded-md border border-[var(--surface-border-soft)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs ui-text-secondary">
              {fileIcon(f.type)}
              <span className="max-w-[100px] truncate">{f.name}</span>
              <button onClick={() => removeFile(f.id)} className="ml-0.5 ui-text-muted hover:text-brand-primary">
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="ui-icon-button self-end rounded-lg p-3"
          title="파일 첨부"
        >
          <Paperclip className="size-4" />
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하거나 파일을 첨부하세요..."
          rows={2}
          className="ui-input flex-1 resize-none rounded-lg px-4 py-3 text-sm"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() && attachedFiles.length === 0}
          className="ui-icon-button-brand flex items-center gap-2 self-end rounded-lg px-4 py-3 text-sm font-medium disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  )
}
