import mermaid from 'mermaid'
import { useEffect, useId, useRef } from 'react'

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#1e293b',
    primaryTextColor: '#e2e8f0',
    primaryBorderColor: '#475569',

    attributeBackgroundColorOdd: '#0f172a',
    attributeBackgroundColorEven: '#1e293b',

    lineColor: '#64748b',
    edgeLabelBackground: '#1e293b',
    tertiaryTextColor: '#e2e8f0',

    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '13px',
  },
  er: {
    diagramPadding: 24,
    useMaxWidth: true,
    layoutDirection: 'TB',
    minEntityWidth: 100,
    minEntityHeight: 75,
    entityPadding: 15,
  },
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
        if (!containerRef.current) return
        containerRef.current.innerHTML = svg

        const svgEl = containerRef.current.querySelector('svg')
        if (!svgEl) return
        svgEl.style.width = '100%'
        svgEl.style.height = 'auto'
        svgEl.removeAttribute('width')
        svgEl.removeAttribute('height')

        // PK/FK 강조
        svgEl.querySelectorAll<SVGElement>('.er.attributeBoxEven, .er.attributeBoxOdd').forEach((row) => {
          const texts = row.querySelectorAll('text')
          texts.forEach((t) => {
            if (t.textContent?.trim() === 'PK') {
              t.style.fill = '#34d399'
              t.style.fontWeight = '700'
              const rect = row.querySelector('rect')
              if (rect) rect.style.fill = '#064e3b'
            }
            if (t.textContent?.trim() === 'FK') {
              t.style.fill = '#fbbf24'
              t.style.fontWeight = '700'
            }
          })
        })
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
