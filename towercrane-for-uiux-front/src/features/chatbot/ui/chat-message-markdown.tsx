import { useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Copy, Check } from 'lucide-react'

type Props = {
  content: string
}

function CodeBlock({ lang, children }: { lang: string; children: React.ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const text = preRef.current?.innerText ?? ''
    void navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="chat-code-block">
      <div className="chat-code-block-header">
        {lang && <span className="chat-code-block-lang">{lang}</span>}
        <button
          onClick={handleCopy}
          className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ui-text-muted hover:text-text-primary transition-colors"
          title="복사"
        >
          {copied
            ? <><Check className="size-3" /><span>복사됨</span></>
            : <><Copy className="size-3" /><span>복사</span></>
          }
        </button>
      </div>
      <pre ref={preRef}>{children}</pre>
    </div>
  )
}

export function ChatMessageMarkdown({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer">
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="chat-markdown-table">
            <table>{children}</table>
          </div>
        ),
        pre: ({ children, ...props }) => {
          const codeEl = (children as React.ReactElement)
          const className: string = codeEl?.props?.className ?? ''
          const match = /language-(\w+)/.exec(className)
          const lang = match?.[1] ?? ''
          return <CodeBlock lang={lang}>{children}</CodeBlock>
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
