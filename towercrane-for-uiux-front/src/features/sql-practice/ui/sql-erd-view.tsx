import mermaid from 'mermaid'
import { useEffect, useId, useRef } from 'react'

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#e0f2fe',        // 테이블 헤더: 연한 하늘
    primaryTextColor: '#0c4a6e',    // 헤더 텍스트: 진한 파랑
    primaryBorderColor: '#38bdf8',  // 테이블 테두리: 스카이블루

    attributeBackgroundColorOdd: '#ffffff',
    attributeBackgroundColorEven: '#f8fafc',

    lineColor: '#94a3b8',
    edgeLabelBackground: '#f1f5f9',

    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '13px',
  },
  er: {
    diagramPadding: 24,
    useMaxWidth: false,
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
        svgEl.style.display = 'block'
        svgEl.style.maxWidth = '100%'
        svgEl.style.height = 'auto'
        svgEl.style.margin = '0 auto'
        svgEl.removeAttribute('height')

        // PK/FK 강조
        svgEl.querySelectorAll<SVGElement>('.er.attributeBoxEven, .er.attributeBoxOdd').forEach((row) => {
          const texts = row.querySelectorAll('text')
          texts.forEach((t) => {
            if (t.textContent?.trim() === 'PK') {
              t.style.fill = '#db2777'
              t.style.fontWeight = '800'
              const rect = row.querySelector('rect')
              if (rect) rect.style.fill = '#fdf2f8'
            }
            if (t.textContent?.trim() === 'FK') {
              t.style.fill = '#0284c7'
              t.style.fontWeight = '700'
            }
          })
        })

        // 일반 컬럼 텍스트 다크
        svgEl.querySelectorAll<SVGTextElement>('.er.attributeBoxEven text, .er.attributeBoxOdd text').forEach((t) => {
          if (!['PK', 'FK'].includes(t.textContent?.trim() ?? '')) {
            t.style.fill = '#1e293b'
          }
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
