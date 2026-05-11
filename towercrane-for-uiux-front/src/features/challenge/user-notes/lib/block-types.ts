export type BlockType = 'NOTE' | 'MMD' | 'FIGMA' | 'GITHUB' | 'CHECKLIST'

export interface ChecklistItem {
  id: string
  text: string
  checked: boolean
}

export interface GitHubData {
  url: string
  title: string
  description: string
}

export interface NoteBlock {
  blockType: BlockType
  data: string
}

export const BLOCK_META: Record<BlockType, { label: string; icon: string; placeholder: string }> = {
  NOTE:      { label: '노트',       icon: '📝', placeholder: '내용을 입력하세요...' },
  MMD:       { label: '다이어그램', icon: '📊', placeholder: 'graph TD\n  A --> B' },
  FIGMA:     { label: 'Figma',      icon: '🎨', placeholder: 'https://www.figma.com/design/...' },
  GITHUB:    { label: 'GitHub',     icon: '🐙', placeholder: 'https://github.com/...' },
  CHECKLIST: { label: '체크리스트', icon: '✅', placeholder: '항목 입력 후 Enter' },
}

export function parseBlock(raw: string): NoteBlock {
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.blockType && parsed?.data !== undefined) return parsed as NoteBlock
  } catch {}
  return { blockType: 'NOTE', data: raw }
}

export function serializeBlock(block: NoteBlock): string {
  return JSON.stringify(block)
}

export function parseChecklist(data: string): ChecklistItem[] {
  try {
    const parsed = JSON.parse(data)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  return []
}

export function serializeChecklist(items: ChecklistItem[]): string {
  return JSON.stringify(items)
}

export function parseGitHub(data: string): GitHubData {
  try {
    const parsed = JSON.parse(data)
    if (parsed?.url !== undefined) return parsed
  } catch {}
  return { url: data, title: '', description: '' }
}

export function toFigmaEmbedUrl(url: string): string {
  if (!url.trim()) return ''
  if (url.includes('figma.com/embed')) return url
  return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`
}
