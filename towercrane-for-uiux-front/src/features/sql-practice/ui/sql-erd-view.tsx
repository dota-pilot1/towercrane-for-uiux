import mermaid from 'mermaid'
import { useEffect, useId, useRef } from 'react'

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  er: { diagramPadding: 20, useMaxWidth: true },
})

type SqlErdViewProps = {
  mmd: string
}

export function SqlErdView({ mmd }: SqlErdViewProps) {
  const id = useId().replace(/:/g, '')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    mermaid
      .render(`erd-${id}`, mmd)
      .then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg
          const svgEl = containerRef.current.querySelector('svg')
          if (svgEl) {
            svgEl.style.width = '100%'
            svgEl.style.height = 'auto'
            svgEl.removeAttribute('width')
            svgEl.removeAttribute('height')
          }
        }
      })
      .catch(() => {
        if (containerRef.current) {
          containerRef.current.innerHTML =
            '<p class="text-xs text-text-muted p-4">ERD를 렌더링할 수 없습니다.</p>'
        }
      })
  }, [mmd, id])

  return <div ref={containerRef} className="w-full overflow-x-auto" />
}
