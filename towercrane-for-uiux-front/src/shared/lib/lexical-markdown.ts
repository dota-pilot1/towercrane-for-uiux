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

function textNode(text: string) {
  return {
    detail: 0,
    format: 0,
    mode: 'normal',
    style: '',
    text,
    type: 'text',
    version: 1,
  }
}

function paragraphNode(text: string) {
  return {
    children: text ? [textNode(text)] : [],
    direction: null,
    format: '',
    indent: 0,
    type: 'paragraph',
    version: 1,
    textFormat: 0,
    textStyle: '',
  }
}

function headingNode(text: string, tag: 'h1' | 'h2' | 'h3') {
  return {
    children: [textNode(text)],
    direction: null,
    format: '',
    indent: 0,
    tag,
    type: 'heading',
    version: 1,
  }
}

function listNode(items: string[], ordered: boolean) {
  return {
    children: items.map((item, index) => ({
      children: [textNode(item)],
      direction: null,
      format: '',
      indent: 0,
      type: 'listitem',
      value: index + 1,
      version: 1,
    })),
    direction: null,
    format: '',
    indent: 0,
    listType: ordered ? 'number' : 'bullet',
    start: 1,
    tag: ordered ? 'ol' : 'ul',
    type: 'list',
    version: 1,
  }
}

function quoteNode(text: string) {
  return {
    children: [textNode(text)],
    direction: null,
    format: '',
    indent: 0,
    type: 'quote',
    version: 1,
  }
}

function codeNode(text: string) {
  return {
    children: [textNode(text)],
    direction: null,
    format: '',
    indent: 0,
    language: '',
    type: 'code',
    version: 1,
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

export function createLexicalJsonFromMarkdown(value: string) {
  const lines = value.replace(/\r\n/g, '\n').split('\n')
  const nodes: ReturnType<
    typeof paragraphNode | typeof headingNode | typeof listNode | typeof quoteNode | typeof codeNode
  >[] = []
  let paragraph: string[] = []
  let listItems: string[] = []
  let listOrdered = false
  let codeLines: string[] | null = null

  const flushParagraph = () => {
    const text = paragraph.join(' ').replace(/\s+/g, ' ').trim()
    if (text) nodes.push(paragraphNode(text))
    paragraph = []
  }

  const flushList = () => {
    if (listItems.length > 0) nodes.push(listNode(listItems, listOrdered))
    listItems = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      if (codeLines) {
        nodes.push(codeNode(codeLines.join('\n').trim()))
        codeLines = null
      } else {
        flushParagraph()
        flushList()
        codeLines = []
      }
      continue
    }

    if (codeLines) {
      codeLines.push(rawLine)
      continue
    }

    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      flushList()
      const tag = heading[1].length === 1 ? 'h1' : heading[1].length === 2 ? 'h2' : 'h3'
      nodes.push(headingNode(heading[2].trim(), tag))
      continue
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/)
    if (bullet) {
      flushParagraph()
      if (listItems.length > 0 && listOrdered) flushList()
      listOrdered = false
      listItems.push(bullet[1].trim())
      continue
    }

    const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/)
    if (ordered) {
      flushParagraph()
      if (listItems.length > 0 && !listOrdered) flushList()
      listOrdered = true
      listItems.push(ordered[1].trim())
      continue
    }

    if (trimmed.startsWith('>')) {
      flushParagraph()
      flushList()
      nodes.push(quoteNode(trimmed.replace(/^>\s?/, '').trim()))
      continue
    }

    flushList()
    paragraph.push(trimmed)
  }

  flushParagraph()
  flushList()
  if (codeLines) nodes.push(codeNode(codeLines.join('\n').trim()))

  return JSON.stringify({
    root: {
      children: nodes.length > 0 ? nodes : [paragraphNode('')],
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  })
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
          ? paragraphs.map(paragraphNode)
          : [paragraphNode('')],
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  })
}
