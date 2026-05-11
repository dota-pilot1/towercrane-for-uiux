import { ExternalLink } from 'lucide-react'

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}
import { LexicalEditor } from '../../../../shared/ui/lexical/lexical-editor'
import { Mermaid } from '../../../../shared/ui/mermaid'
import {
  parseBlock,
  parseChecklist,
  serializeChecklist,
  parseGitHub,
  toFigmaEmbedUrl,
  BLOCK_META,
} from '../lib/block-types'

interface BlockViewerProps {
  content: string
  onChecklistToggle?: (newContent: string) => void
}

export function BlockViewer({ content, onChecklistToggle }: BlockViewerProps) {
  const block = parseBlock(content)

  switch (block.blockType) {
    case 'NOTE':
      return <NoteView data={block.data} />
    case 'MMD':
      return <MmdView data={block.data} />
    case 'FIGMA':
      return <FigmaView data={block.data} />
    case 'GITHUB':
      return <GitHubView data={block.data} />
    case 'CHECKLIST':
      return (
        <ChecklistView
          data={block.data}
          onToggle={onChecklistToggle ? (newData) => {
            const newBlock = { blockType: 'CHECKLIST' as const, data: newData }
            onChecklistToggle(JSON.stringify(newBlock))
          } : undefined}
        />
      )
    default:
      return <p className="text-sm ui-text-secondary whitespace-pre-wrap">{content}</p>
  }
}

// ─── NOTE ───────────────────────────────────────────────────────────────────

function NoteView({ data }: { data: string }) {
  // Lexical JSON이면 에디터 readOnly로, 아니면 plain text
  const isLexical = (() => {
    try { return Boolean(JSON.parse(data)?.root) } catch { return false }
  })()

  if (!data) return <p className="text-sm ui-text-muted">(내용 없음)</p>

  if (isLexical) {
    return (
      <div className="[&_.bg-surface-raised]:bg-transparent">
        <LexicalEditor
          initialState={data}
          onChange={() => {}}
          readOnly
          minHeight="auto"
        />
      </div>
    )
  }

  return <p className="text-sm ui-text-secondary whitespace-pre-wrap leading-relaxed">{data}</p>
}

// ─── MMD ────────────────────────────────────────────────────────────────────

function MmdView({ data }: { data: string }) {
  if (!data.trim()) return <p className="text-sm ui-text-muted">(다이어그램 없음)</p>
  return (
    <div className="overflow-auto">
      <Mermaid chart={data} />
    </div>
  )
}

// ─── FIGMA ──────────────────────────────────────────────────────────────────

function FigmaView({ data }: { data: string }) {
  const embedUrl = toFigmaEmbedUrl(data)
  if (!embedUrl) return <p className="text-sm ui-text-muted">(Figma URL 없음)</p>
  return (
    <div className="rounded-md overflow-hidden border border-surface-border">
      <iframe src={embedUrl} className="w-full" style={{ height: 400 }} allowFullScreen />
    </div>
  )
}

// ─── GITHUB ─────────────────────────────────────────────────────────────────

function GitHubView({ data }: { data: string }) {
  const gh = parseGitHub(data)
  if (!gh.url) return <p className="text-sm ui-text-muted">(GitHub URL 없음)</p>

  const displayTitle = gh.title || gh.url.replace('https://github.com/', '')

  return (
    <a
      href={gh.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 p-3 rounded-md border border-surface-border hover:bg-surface-muted transition-colors"
    >
      <GitHubIcon className="size-5 ui-text-secondary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium ui-text-primary truncate">{displayTitle}</p>
        {gh.description && (
          <p className="text-xs ui-text-muted mt-0.5 line-clamp-2">{gh.description}</p>
        )}
        <p className="text-xs text-brand-primary mt-1 truncate">{gh.url}</p>
      </div>
      <ExternalLink className="size-3.5 ui-text-muted shrink-0 mt-0.5" />
    </a>
  )
}

// ─── CHECKLIST ──────────────────────────────────────────────────────────────

function ChecklistView({
  data,
  onToggle,
}: {
  data: string
  onToggle?: (newData: string) => void
}) {
  const items = parseChecklist(data)
  if (items.length === 0) return <p className="text-sm ui-text-muted">(항목 없음)</p>

  const checkedCount = items.filter((i) => i.checked).length

  return (
    <div className="space-y-2">
      <p className="text-xs ui-text-muted">{checkedCount} / {items.length} 완료</p>
      {items.map((item) => (
        <label
          key={item.id}
          className="flex items-center gap-2 cursor-pointer group"
          onClick={(e) => {
            if (!onToggle) return
            e.preventDefault()
            const updated = items.map((i) => i.id === item.id ? { ...i, checked: !i.checked } : i)
            onToggle(serializeChecklist(updated))
          }}
        >
          <input
            type="checkbox"
            checked={item.checked}
            readOnly
            className="shrink-0 size-4 rounded accent-brand-primary"
          />
          <span className={`text-sm transition-colors ${
            item.checked ? 'line-through ui-text-muted' : 'ui-text-secondary group-hover:ui-text-primary'
          }`}>
            {item.text}
          </span>
        </label>
      ))}
    </div>
  )
}

// 블록 타입 배지 (NoteCard 상단에 표시)
export function BlockTypeBadge({ content }: { content: string }) {
  const { blockType } = parseBlock(content)
  if (blockType === 'NOTE') return null
  const meta = BLOCK_META[blockType]
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-brand-glass text-brand-primary border border-brand-border">
      {meta.icon} {meta.label}
    </span>
  )
}
