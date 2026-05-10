interface BlockRendererProps {
  topic: {
    id: string
    blockType: string
    content: string
  }
}

export function BlockRenderer({ topic }: BlockRendererProps) {
  const { blockType, content } = topic

  switch (blockType) {
    case 'NOTE':
      return <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm ui-text-secondary">{content}</div>

    case 'CHECKLIST': {
      try {
        const items = JSON.parse(content)
        if (!Array.isArray(items)) return <p className="text-sm ui-text-secondary">{content}</p>
        return (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm ui-text-secondary">
                <input type="checkbox" disabled className="mt-0.5 cursor-not-allowed" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        )
      } catch {
        return <p className="text-sm ui-text-secondary">{content}</p>
      }
    }

    case 'MMD':
      return (
        <div className="rounded bg-surface-muted p-4">
          <p className="text-xs ui-text-muted">Mermaid 다이어그램:</p>
          <pre className="mt-2 text-xs ui-text-secondary overflow-x-auto">{content}</pre>
        </div>
      )

    case 'GITHUB':
      return (
        <div className="rounded bg-surface-muted p-4">
          <p className="text-xs ui-text-muted">GitHub 링크:</p>
          <p className="mt-2 text-sm ui-text-secondary break-all">{content}</p>
        </div>
      )

    case 'FIGMA':
      return (
        <div className="rounded bg-surface-muted p-4">
          <p className="text-xs ui-text-muted">Figma 링크:</p>
          <p className="mt-2 text-sm ui-text-secondary break-all">{content}</p>
        </div>
      )

    case 'FILE':
      return (
        <div className="rounded bg-surface-muted p-4">
          <p className="text-xs ui-text-muted">파일:</p>
          <p className="mt-2 text-sm ui-text-secondary break-all">{content}</p>
        </div>
      )

    case 'DBTABLE':
      return (
        <div className="rounded bg-surface-muted p-4">
          <p className="text-xs ui-text-muted">데이터베이스 테이블:</p>
          <pre className="mt-2 text-xs ui-text-secondary overflow-x-auto">{content}</pre>
        </div>
      )

    default:
      return <p className="text-sm ui-text-secondary">{content}</p>
  }
}
