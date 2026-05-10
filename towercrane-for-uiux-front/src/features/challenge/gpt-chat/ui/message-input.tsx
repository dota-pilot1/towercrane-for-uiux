import { useState } from 'react'
import { Send } from 'lucide-react'

interface MessageInputProps {
  onSend: (content: string) => void
  disabled?: boolean
}

export function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const [content, setContent] = useState('')
  const [rows, setRows] = useState(1)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (content.trim() && !disabled) {
      onSend(content)
      setContent('')
      setRows(1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e as any)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    const newRows = Math.min(Math.max(e.target.scrollHeight / 24, 1), 6)
    setRows(newRows)
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-surface-border bg-surface-raised p-3 space-y-2">
      <textarea
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="메시지 입력... (Cmd/Ctrl + Enter로 전송)"
        disabled={disabled}
        rows={rows}
        className="ui-input text-sm resize-none"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={disabled || !content.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-brand-primary text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
        >
          <Send className="size-3" />
          {disabled ? '전송 중...' : '전송'}
        </button>
      </div>
    </form>
  )
}
