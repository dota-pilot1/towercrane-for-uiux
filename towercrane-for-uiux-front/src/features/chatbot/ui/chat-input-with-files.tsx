import { useRef, useMemo, useEffect } from 'react'
import { Paperclip, X, FileText, File, Send } from 'lucide-react'

type Props = {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  disabled: boolean
  attachedFiles: File[]
  onFilesChange: (files: File[]) => void
}

function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith('image/')
  const objUrl = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(objUrl), [objUrl])

  return (
    <div className="relative group shrink-0">
      {isImage ? (
        <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-surface-border bg-surface-muted">
          <img src={objUrl} className="w-full h-full object-cover" />
          <button
            onClick={onRemove}
            className="absolute top-0.5 right-0.5 size-4 rounded-full bg-surface-strong/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary hover:text-brand-primary"
          >
            <X className="size-2.5" />
          </button>
        </div>
      ) : (
        <div className="relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-surface-border bg-surface-muted max-w-[130px]">
          {file.type === 'application/pdf'
            ? <FileText className="size-3.5 text-text-muted shrink-0" />
            : <File className="size-3.5 text-text-muted shrink-0" />
          }
          <span className="text-xs text-text-secondary truncate">{file.name}</span>
          <button
            onClick={onRemove}
            className="ml-auto text-text-muted hover:text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="size-3" />
          </button>
        </div>
      )}
    </div>
  )
}

const MAX_SIZE_MB = 20

export function ChatInputWithFiles({
  value, onChange, onSend, onKeyDown, disabled,
  attachedFiles, onFilesChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function filterAndMerge(incoming: File[]) {
    const valid = incoming.filter((f) => f.size <= MAX_SIZE_MB * 1024 * 1024)
    onFilesChange([...attachedFiles, ...valid].slice(0, 5))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    filterAndMerge(Array.from(e.target.files ?? []))
    e.target.value = ''
  }

  function handlePaste(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData.files)
    if (files.length === 0) return
    e.preventDefault()
    filterAndMerge(files)
  }

  return (
    <div className="rounded-lg border border-surface-border-soft bg-surface-muted focus-within:border-brand-border focus-within:ring-2 focus-within:ring-brand-border/10 transition-all">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />

      {/* 첨부 파일 미리보기 */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-2.5">
          {attachedFiles.map((f, i) => (
            <FilePreview
              key={i}
              file={f}
              onRemove={() => onFilesChange(attachedFiles.filter((_, idx) => idx !== i))}
            />
          ))}
        </div>
      )}

      {/* 텍스트 입력 */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={handlePaste}
        placeholder="메시지를 입력하세요... (Enter 전송, Shift+Enter 줄바꿈, Ctrl+V로 파일 붙여넣기)"
        rows={3}
        className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm leading-relaxed outline-none ui-text-primary placeholder:text-text-muted"
      />

      {/* 하단 툴바 */}
      <div className="flex items-center justify-between px-2 pb-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg p-2 text-text-muted hover:text-brand-primary hover:bg-surface-raised transition-colors"
          title="파일 첨부 (최대 5개, 10MB)"
        >
          <Paperclip className="size-4" />
        </button>

        <button
          onClick={onSend}
          disabled={disabled}
          className="ui-icon-button-brand flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-40 transition-opacity"
        >
          <Send className="size-3.5" />
          <span>전송</span>
        </button>
      </div>
    </div>
  )
}
