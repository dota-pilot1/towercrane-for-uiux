import * as Dialog from '@radix-ui/react-dialog'
import { BookOpenText, Copy, Loader2, X } from 'lucide-react'
import { useState } from 'react'

export function SqlSupplementExplanationDialog({
  open,
  onOpenChange,
  title,
  body,
  error,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: string
  error: string
  isLoading: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!body.trim()) return
    await navigator.clipboard.writeText(body)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[220] ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-[221] flex max-h-[min(760px,calc(100vh-2rem))] w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border border-surface-border shadow-2xl">
          <div className="flex items-center justify-between gap-4 border-b border-surface-border px-5 py-4">
            <div className="flex min-w-0 items-center gap-2">
              <div className="ui-icon-button-brand size-8 shrink-0">
                <BookOpenText className="size-4" />
              </div>
              <Dialog.Title className="truncate text-base font-black text-text-primary">
                {title}
              </Dialog.Title>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="ui-icon-button h-8 gap-1.5 px-3 text-xs font-bold"
                onClick={handleCopy}
                disabled={!body.trim() || isLoading}
                title="Markdown 복사"
              >
                <Copy className="size-3.5" />
                {copied ? '복사됨' : '복사'}
              </button>
              <Dialog.Close asChild>
                <button type="button" className="ui-icon-button size-8 shrink-0" aria-label="닫기">
                  <X className="size-4" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-surface-muted/50 p-5">
            <div className="rounded-md border border-surface-border-soft bg-surface-raised px-6 py-5">
              {isLoading ? (
                <div className="flex min-h-40 items-center justify-center gap-2 text-sm font-semibold text-text-muted">
                  <Loader2 className="size-4 animate-spin" />
                  보충 설명을 생성하는 중입니다.
                </div>
              ) : error ? (
                <p className="text-sm font-semibold text-destructive">{error}</p>
              ) : (
                <MarkdownPreview markdown={body || '보충 설명이 아직 없습니다.'} />
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const blocks = markdown.split(/(```[\s\S]*?```)/g).filter((block) => block.length > 0)

  return (
    <div className="space-y-3 text-sm leading-7 text-text-secondary">
      {blocks.map((block, blockIndex) => {
        const codeMatch = block.match(/^```(\w+)?\n?([\s\S]*?)```$/)
        if (codeMatch) {
          return (
            <pre
              key={`code-${blockIndex}`}
              className="overflow-auto rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3 font-mono text-xs leading-6 text-text-primary"
            >
              <code>{codeMatch[2].trim()}</code>
            </pre>
          )
        }

        return block
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line, lineIndex) => {
            const key = `text-${blockIndex}-${lineIndex}`
            if (line.startsWith('## ')) {
              return (
                <h3 key={key} className="pt-1 text-base font-black text-text-primary">
                  {line.replace(/^##\s+/, '')}
                </h3>
              )
            }
            if (line.startsWith('# ')) {
              return (
                <h2 key={key} className="text-lg font-black text-text-primary">
                  {line.replace(/^#\s+/, '')}
                </h2>
              )
            }
            if (line.startsWith('- ') || line.startsWith('* ')) {
              return (
                <p key={key} className="pl-4 text-text-secondary">
                  <span className="mr-2 text-brand-primary">-</span>
                  <InlineMarkdown text={line.replace(/^[-*]\s+/, '')} />
                </p>
              )
            }
            return (
              <p key={key} className="text-text-secondary">
                <InlineMarkdown text={line} />
              </p>
            )
          })
      })}
    </div>
  )
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean)

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={`${part}-${index}`}
              className="rounded-sm border border-surface-border-soft bg-surface-muted px-1.5 py-0.5 font-mono text-[0.9em] text-text-primary"
            >
              {part.slice(1, -1)}
            </code>
          )
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={`${part}-${index}`} className="font-black text-text-primary">
              {part.slice(2, -2)}
            </strong>
          )
        }
        return part
      })}
    </>
  )
}
