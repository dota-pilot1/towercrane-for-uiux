export function FigmaBlockEditor({
  content,
  onChange,
  readOnly = false,
}: {
  content: string
  onChange: (val: string) => void
  readOnly?: boolean
}) {
  if (readOnly) {
    if (!content.trim()) {
      return (
        <div className="p-4 text-sm text-slate-500 text-center">
          Figma URL이 지정되지 않았습니다.
        </div>
      )
    }
    return (
      <div className="p-4">
        <a
          href={content}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm text-pink-300 hover:text-pink-200 break-all"
        >
          🎨 {content}
        </a>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="text-xs text-slate-400 mb-1 block font-medium">Figma URL</label>
        <input
          type="url"
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://www.figma.com/file/..."
          className="w-full px-3 py-2 text-sm text-slate-100 bg-slate-950/40 border border-white/10 rounded-lg outline-none focus:border-emerald-500/40 placeholder:text-slate-600"
        />
      </div>
      {content.trim() ? (
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Preview</p>
          <a
            href={content}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-emerald-300 hover:text-emerald-200 break-all"
          >
            {content}
          </a>
        </div>
      ) : null}
    </div>
  )
}
