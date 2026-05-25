type SerializedLexicalNode = {
  type?: string
  text?: string
  tag?: string
  children?: SerializedLexicalNode[]
}

type SerializedLexicalState = {
  root?: {
    children?: SerializedLexicalNode[]
  }
}

function textFromChildren(children: SerializedLexicalNode[] | undefined): string {
  return (children ?? []).map(nodeToMarkdown).join('')
}

function listItemToMarkdown(node: SerializedLexicalNode, ordered: boolean, index: number) {
  const marker = ordered ? `${index + 1}.` : '-'
  const text = textFromChildren(node.children).trim()
  return `${marker} ${text}`
}

function tableToMarkdown(node: SerializedLexicalNode) {
  const rows = node.children ?? []
  return rows
    .map((row) =>
      (row.children ?? [])
        .map((cell) => textFromChildren(cell.children).replace(/\s+/g, ' ').trim())
        .join(' | '),
    )
    .filter(Boolean)
    .join('\n')
}

function nodeToMarkdown(node: SerializedLexicalNode): string {
  if (node.type === 'text') return node.text ?? ''

  if (node.type === 'heading') {
    const level = node.tag === 'h1' ? '#' : node.tag === 'h2' ? '##' : '###'
    return `${level} ${textFromChildren(node.children).trim()}\n\n`
  }

  if (node.type === 'paragraph') {
    const text = textFromChildren(node.children).trim()
    return text ? `${text}\n\n` : ''
  }

  if (node.type === 'quote') {
    const text = textFromChildren(node.children).trim()
    return text ? `> ${text}\n\n` : ''
  }

  if (node.type === 'code') {
    return `\`\`\`\n${textFromChildren(node.children).trim()}\n\`\`\`\n\n`
  }

  if (node.type === 'list') {
    const ordered = node.tag === 'ol'
    return `${(node.children ?? [])
      .map((child, index) => listItemToMarkdown(child, ordered, index))
      .join('\n')}\n\n`
  }

  if (node.type === 'listitem') {
    return textFromChildren(node.children)
  }

  if (node.type === 'link') {
    return textFromChildren(node.children)
  }

  if (node.type === 'table') {
    const text = tableToMarkdown(node)
    return text ? `${text}\n\n` : ''
  }

  if (node.type === 'image') return '[이미지]\n\n'
  if (node.type === 'youtube') return '[YouTube]\n\n'

  return textFromChildren(node.children)
}

export function lexicalJsonToMarkdown(value: string) {
  try {
    const parsed = JSON.parse(value) as SerializedLexicalState
    return (parsed.root?.children ?? [])
      .map(nodeToMarkdown)
      .join('')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  } catch {
    return ''
  }
}

export function createLexicalJsonFromText(value: string) {
  const paragraphs = value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return JSON.stringify({
    root: {
      children:
        paragraphs.length > 0
          ? paragraphs.map((paragraph) => ({
              children: [
                {
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: paragraph,
                  type: 'text',
                  version: 1,
                },
              ],
              direction: null,
              format: '',
              indent: 0,
              type: 'paragraph',
              version: 1,
              textFormat: 0,
              textStyle: '',
            }))
          : [
              {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1,
                textFormat: 0,
                textStyle: '',
              },
            ],
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  })
}
