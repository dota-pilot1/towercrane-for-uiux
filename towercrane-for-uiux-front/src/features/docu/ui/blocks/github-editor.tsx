import { parseGithubContent, type GithubContent } from '../../types/block'

export function GithubBlockEditor({
  content,
  onChange,
}: {
  content: string
  onChange: (val: string) => void
}) {
  const github = parseGithubContent(content)

  const update = (field: keyof GithubContent, value: string) => {
    onChange(JSON.stringify({ ...github, [field]: value }))
  }

  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block font-medium">GitHub URL *</label>
          <input
            type="url"
            value={github.url}
            onChange={(e) => update('url', e.target.value)}
            placeholder="https://github.com/org/repo"
            className="w-full px-3 py-2 text-sm text-slate-100 bg-slate-950/40 border border-white/10 rounded-lg outline-none focus:border-emerald-500/40 placeholder:text-slate-600"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block font-medium">종류</label>
          <select
            value={github.type}
            onChange={(e) => update('type', e.target.value)}
            className="w-full px-3 py-2 text-sm text-slate-100 bg-slate-950/40 border border-white/10 rounded-lg outline-none focus:border-emerald-500/40"
          >
            <option value="repo">📁 Repository</option>
            <option value="pr">🔀 Pull Request</option>
            <option value="issue">🐛 Issue</option>
            <option value="gist">📋 Gist</option>
            <option value="other">🔗 기타</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-400 mb-1 block font-medium">제목</label>
        <input
          type="text"
          value={github.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="레포지토리 이름 또는 제목"
          className="w-full px-3 py-2 text-sm text-slate-100 bg-slate-950/40 border border-white/10 rounded-lg outline-none focus:border-emerald-500/40 placeholder:text-slate-600"
        />
      </div>
      <div>
        <label className="text-xs text-slate-400 mb-1 block font-medium">설명</label>
        <textarea
          value={github.description}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
          placeholder="이 레포/PR/이슈에 대한 설명"
          className="w-full px-3 py-2 text-sm text-slate-100 bg-slate-950/40 border border-white/10 rounded-lg outline-none focus:border-emerald-500/40 resize-y placeholder:text-slate-600"
        />
      </div>
    </div>
  )
}
