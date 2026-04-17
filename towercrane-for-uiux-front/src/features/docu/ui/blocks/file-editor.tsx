import { parseFileContent, type FileContent } from '../../types/block'

export function FileBlockEditor({
  content,
  onChange,
}: {
  content: string
  onChange: (val: string) => void
}) {
  const file = parseFileContent(content)

  const update = (field: keyof FileContent, value: string) => {
    onChange(JSON.stringify({ ...file, [field]: value }))
  }

  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="text-xs text-slate-400 mb-1 block font-medium">파일 URL</label>
        <input
          type="url"
          value={file.url}
          onChange={(e) => update('url', e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 text-sm text-slate-100 bg-slate-950/40 border border-white/10 rounded-lg outline-none focus:border-emerald-500/40 placeholder:text-slate-600"
        />
      </div>
      <div>
        <label className="text-xs text-slate-400 mb-1 block font-medium">파일명</label>
        <input
          type="text"
          value={file.filename}
          onChange={(e) => update('filename', e.target.value)}
          placeholder="example.pdf"
          className="w-full px-3 py-2 text-sm text-slate-100 bg-slate-950/40 border border-white/10 rounded-lg outline-none focus:border-emerald-500/40 placeholder:text-slate-600"
        />
      </div>
      <div>
        <label className="text-xs text-slate-400 mb-1 block font-medium">설명</label>
        <textarea
          value={file.description}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
          placeholder="파일에 대한 설명"
          className="w-full px-3 py-2 text-sm text-slate-100 bg-slate-950/40 border border-white/10 rounded-lg outline-none focus:border-emerald-500/40 resize-y placeholder:text-slate-600"
        />
      </div>
    </div>
  )
}
