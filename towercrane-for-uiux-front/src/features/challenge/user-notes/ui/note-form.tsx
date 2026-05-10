import { useState } from 'react'
import { Lock, Users, Globe } from 'lucide-react'

interface NoteFormProps {
  onSubmit: (data: { title?: string; content: string; visibility: string; pinned: boolean }) => void
  onCancel: () => void
  loading?: boolean
}

export function NoteForm({ onSubmit, onCancel, loading = false }: NoteFormProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'shared' | 'public'>('private')
  const [pinned, setPinned] = useState(false)

  const handleSubmit = () => {
    if (!content.trim()) return
    onSubmit({
      title: title || undefined,
      content,
      visibility,
      pinned,
    })
  }

  return (
    <div className="ui-panel-soft rounded-md p-4 space-y-3">
      <input
        type="text"
        placeholder="제목 (선택)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="ui-input text-sm"
      />

      <textarea
        placeholder="노트 내용을 입력하세요"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="ui-input min-h-24 text-sm"
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold ui-text-secondary">공개:</label>
          <div className="flex items-center gap-1.5">
            {[
              { value: 'private' as const, icon: <Lock className="size-3.5" /> },
              { value: 'shared' as const, icon: <Users className="size-3.5" /> },
              { value: 'public' as const, icon: <Globe className="size-3.5" /> },
            ].map(({ value, icon }) => (
              <button
                key={value}
                onClick={() => setVisibility(value)}
                className={`p-1.5 rounded transition-colors ${
                  visibility === value
                    ? 'bg-brand-glass text-brand-primary'
                    : 'border border-surface-border text-surface-border hover:text-text-secondary'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            className="size-4 rounded border border-surface-border"
          />
          <span className="text-xs ui-text-secondary">고정</span>
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-3 py-1.5 text-xs rounded border border-surface-border ui-text-secondary hover:bg-surface-muted disabled:opacity-50"
        >
          취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !content.trim()}
          className="px-3 py-1.5 text-xs rounded bg-brand-primary text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}
