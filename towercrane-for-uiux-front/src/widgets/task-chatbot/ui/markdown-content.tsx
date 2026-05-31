import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * 작은 챗봇 버블에 맞춘 컴팩트 마크다운 렌더러.
 * 굵게/목록/줄바꿈/링크/인라인 코드만 가볍게 처리한다(코드블록 UI는 의도적으로 제외).
 */
export function MarkdownContent({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="my-1 first:mt-0 last:mb-0">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="my-1 list-disc space-y-0.5 pl-4">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-1 list-decimal space-y-0.5 pl-4">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="rounded bg-black/10 px-1 py-0.5 text-[11px]">
            {children}
          </code>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  )
}
