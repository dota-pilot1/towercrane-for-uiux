import { parseFileContent, type FileContent } from '../../types/block'

export function FileBlockEditor({
  content,
  onChange,
  readOnly = false,
}: {
  content: string
  onChange: (val: string) => void
  readOnly?: boolean
}) {
  const file = parseFileContent(content)

  const update = (field: keyof FileContent, value: string) => {
    onChange(JSON.stringify({ ...file, [field]: value }))
  }

  if (readOnly) {
    if (!file.url && !file.filename && !file.description) {
      return (
        <div className="p-4 text-sm text-slate-500 text-center">
          파일 정보가 지정되지 않았습니다.
        </div>
      )
    }
    return (
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span>📎</span>
          {file.url ? (
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-green-300 hover:text-green-200 break-all font-medium"
            >
              {file.filename || file.url}
            </a>
          ) : (
            <span className="text-sm text-slate-200 font-medium">{file.filename}</span>
          )}
        </div>
        {file.description ? (
          <p className="text-sm text-slate-400 leading-relaxed pl-6">{file.description}</p>
        ) : null}
      </div>
    )
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
