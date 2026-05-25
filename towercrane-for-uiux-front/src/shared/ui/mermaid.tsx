import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
})

type MermaidProps = {
  chart: string
  className?: string
}

export function Mermaid({ chart, className = '' }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isRendering, setIsRendering] = useState(true)

  useEffect(() => {
    if (!containerRef.current || !chart.trim()) {
      setIsRendering(false)
      return
    }

    let cancelled = false
    setIsRendering(true)

    const render = async () => {
      try {
        const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        const { svg } = await mermaid.render(uniqueId, chart)
        if (cancelled) return
        if (containerRef.current) {
          containerRef.current.innerHTML = svg
        }
        setIsRendering(false)
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : String(error)
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="p-3 rounded-lg border border-rose-500/30 bg-rose-500/5 text-xs text-rose-200">
              <p class="font-semibold mb-1.5">❌ Mermaid 렌더링 실패</p>
              <pre class="whitespace-pre-wrap text-[11px] text-rose-200/80 font-mono">${escapeHtml(message)}</pre>
            </div>
          `
        }
        
        // Mermaid가 렌더링 실패 시 document.body 하단에 에러 노드를 강제로 주입하고 방치하는 SPA의 고질적 버그 방어 코드
        setTimeout(() => {
          const badNodes = document.querySelectorAll('div[id^="dmermaid"], div[id^="mermaid-"], svg[id^="mermaid-"]');
          badNodes.forEach((node) => node.remove());
        }, 50);

        setIsRendering(false)
      }
    }

    render()
    return () => {
      cancelled = true
    }
  }, [chart])

  if (!chart.trim()) {
    return (
      <div className="p-4 text-sm text-text-muted text-center">
        Mermaid 다이어그램 코드가 없습니다.
      </div>
    )
  }

  return (
    <div className="relative">
      {isRendering ? (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-muted z-10 rounded-lg">
          <div className="text-xs text-text-secondary">렌더링 중...</div>
        </div>
      ) : null}
      <div ref={containerRef} className={className} />
    </div>
  )
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
