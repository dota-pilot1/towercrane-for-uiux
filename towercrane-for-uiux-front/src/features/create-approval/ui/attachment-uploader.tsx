import { useRef, useState } from 'react'
import { Loader2, Paperclip, X } from 'lucide-react'
import type { Attachment } from '../../../shared/api/approval'
import { uploadFile } from '../../../shared/api/upload'

export function AttachmentUploader({
  files,
  onChange,
}: {
  files: Attachment[]
  onChange: (f: Attachment[]) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return
    setUploading(true)
    setErr(null)
    try {
      const uploaded: Attachment[] = []
      for (const file of Array.from(list)) {
        const url = await uploadFile(file)
        uploaded.push({ name: file.name, url, size: file.size, contentType: file.type })
      }
      onChange([...files, ...uploaded])
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border bg-surface-raised text-[12px] font-semibold text-text-secondary hover:border-brand-border hover:text-brand-primary transition-colors disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Paperclip className="size-3.5" />
        )}
        {uploading ? '업로드 중…' : '파일 첨부'}
      </button>
      {err && <p className="text-[12px] text-destructive">{err}</p>}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-surface-muted border border-surface-border-soft"
            >
              <Paperclip className="size-3.5 text-text-muted shrink-0" />
              <span className="flex-1 min-w-0 truncate text-[12px] text-text-primary">{f.name}</span>
              <span className="text-[11px] text-text-muted shrink-0">
                {f.size ? `${(f.size / 1024).toFixed(0)}KB` : ''}
              </span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                className="text-text-muted hover:text-destructive transition-colors shrink-0"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
