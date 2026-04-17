import { useState } from 'react'
import { Mermaid } from '../../../../shared/ui/mermaid'

export function MermaidBlockEditor({
  content,
  onChange,
  readOnly = false,
}: {
  content: string
  onChange: (val: string) => void
  readOnly?: boolean
}) {
  const [mode, setMode] = useState<'edit' | 'preview'>(content.trim() ? 'preview' : 'edit')

  if (readOnly) {
    return (
      <div className="p-4 bg-surface-muted min-h-[180px]">
        <Mermaid chart={content} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-[320px]">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-surface-border-soft bg-surface-muted shrink-0">
        <button
          onClick={() => setMode('edit')}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            mode === 'edit'
              ? 'bg-brand-glass text-brand-primary border border-brand-border'
              : 'text-text-secondary hover:bg-surface-muted'
          }`}
        >
          코드 편집
        </button>
        <button
          onClick={() => setMode('preview')}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            mode === 'preview'
              ? 'bg-brand-glass text-brand-primary border border-brand-border'
              : 'text-text-secondary hover:bg-surface-muted'
          }`}
        >
          미리보기
        </button>
      </div>
      {mode === 'edit' ? (
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={'sequenceDiagram\n    A->>B: Hello'}
          className="w-full flex-1 px-5 py-4 text-sm font-mono text-text-primary bg-surface-muted border-0 outline-none resize-none leading-relaxed placeholder:text-text-muted"
        />
      ) : (
        <div className="flex-1 overflow-auto p-4 bg-surface-muted">
          <Mermaid chart={content} />
        </div>
      )}
    </div>
  )
}
