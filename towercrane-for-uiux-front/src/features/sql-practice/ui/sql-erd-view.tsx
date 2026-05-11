import mermaid from 'mermaid'
import { useEffect, useId, useRef } from 'react'

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    // 테이블 헤더 배경 (entity title)
    primaryColor: '#1e293b',
    primaryTextColor: '#f1f5f9',
    primaryBorderColor: '#334155',

    // 컬럼 행 배경 (홀수/짝수)
    attributeBackgroundColorOdd: '#f8fafc',
    attributeBackgroundColorEven: '#f1f5f9',

    // 관계선
    lineColor: '#64748b',
    edgeLabelBackground: '#ffffff',

    // 폰트
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

        // PK 셀 강조
        svgEl.querySelectorAll<SVGElement>('.er.attributeBoxEven, .er.attributeBoxOdd').forEach((row) => {
          const texts = row.querySelectorAll('text')
          texts.forEach((t) => {
            if (t.textContent?.trim() === 'PK') {
              t.style.fill = '#10b981'
              t.style.fontWeight = '700'
              const rect = row.querySelector('rect')
              if (rect) rect.style.fill = '#f0fdf4'
            }
            if (t.textContent?.trim() === 'FK') {
              t.style.fill = '#f59e0b'
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
