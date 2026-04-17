import { useState } from 'react'
import { Mermaid } from '../../../../shared/ui/mermaid'

export function MermaidBlockEditor({
  content,
  onChange,
}: {
  content: string
  onChange: (val: string) => void
}) {
  const [mode, setMode] = useState<'edit' | 'preview'>(content.trim() ? 'preview' : 'edit')

  return (
    <div className="flex flex-col h-full min-h-[320px]">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5 bg-slate-950/40 shrink-0">
        <button
          onClick={() => setMode('edit')}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            mode === 'edit'
              ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
              : 'text-slate-400 hover:bg-white/5'
          }`}
        >
          코드 편집
        </button>
        <button
          onClick={() => setMode('preview')}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            mode === 'preview'
              ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
              : 'text-slate-400 hover:bg-white/5'
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
          className="w-full flex-1 px-5 py-4 text-sm font-mono text-slate-100 bg-slate-950/40 border-0 outline-none resize-none leading-relaxed placeholder:text-slate-600"
        />
      ) : (
        <div className="flex-1 overflow-auto p-4 bg-slate-900/40">
          <Mermaid chart={content} />
        </div>
      )}
    </div>
  )
}
