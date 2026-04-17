import type { DocBlockType } from '../../../shared/api/docu'

export type BlockMeta = {
  icon: string
  label: string
  color: string
}

export const TYPE_META: Record<DocBlockType, BlockMeta> = {
  NOTE: { icon: '📝', label: '노트', color: 'bg-blue-500/15 text-blue-300 border border-blue-400/20' },
  MMD: { icon: '📊', label: '다이어그램', color: 'bg-purple-500/15 text-purple-300 border border-purple-400/20' },
  FIGMA: { icon: '🎨', label: 'Figma', color: 'bg-pink-500/15 text-pink-300 border border-pink-400/20' },
  FILE: { icon: '📎', label: '첨부파일', color: 'bg-green-500/15 text-green-300 border border-green-400/20' },
  DBTABLE: { icon: '🗄️', label: 'DB테이블', color: 'bg-amber-500/15 text-amber-300 border border-amber-400/20' },
  GITHUB: { icon: '🐙', label: 'GitHub', color: 'bg-slate-500/15 text-slate-300 border border-slate-400/20' },
}

export type FileContent = {
  url: string
  filename: string
  description: string
}

export type GithubContent = {
  url: string
  title: string
  description: string
  type: 'repo' | 'pr' | 'issue' | 'gist' | 'other'
}

export type DbColumn = {
  no: number
  name: string
  comment: string
  type: string
  size: string
  pk: boolean
  notNull: boolean
  note: string
}

export type DbTableContent = {
  tableName: string
  schema: string
  category: string
  description: string
  headers?: string[]
  columns: DbColumn[]
}

export type DraftBlock = {
  localId: string
  blockType: DocBlockType
  blockTitle: string | null
  content: string
}

export function parseFileContent(content: string): FileContent {
  try {
    const parsed = JSON.parse(content) as Partial<FileContent>
    return {
      url: parsed.url ?? '',
      filename: parsed.filename ?? '',
      description: parsed.description ?? '',
    }
  } catch {
    return { url: '', filename: '', description: '' }
  }
}

export function parseGithubContent(content: string): GithubContent {
  try {
    const parsed = JSON.parse(content) as Partial<GithubContent>
    return {
      url: parsed.url ?? '',
      title: parsed.title ?? '',
      description: parsed.description ?? '',
      type: (parsed.type as GithubContent['type']) ?? 'repo',
    }
  } catch {
    return { url: '', title: '', description: '', type: 'repo' }
  }
}

export function parseDbTableContent(content: string): DbTableContent {
  try {
    const parsed = JSON.parse(content) as Partial<DbTableContent>
    return {
      tableName: parsed.tableName ?? '',
      schema: parsed.schema ?? '',
      category: parsed.category ?? '',
      description: parsed.description ?? '',
      headers: parsed.headers ?? [],
      columns: parsed.columns ?? [],
    }
  } catch {
    return {
      tableName: '',
      schema: '',
      category: '',
      description: '',
      headers: [],
      columns: [],
    }
  }
}

export function parseTsvToColumns(tsv: string): DbColumn[] {
  const lines = tsv.trim().split('\n')
  if (lines.length === 0) return []
  const rows = lines.map((line) => line.split('\t'))
  const parsed: DbColumn[] = []

  for (const row of rows) {
    if (row.length < 2) continue
    const name = row[0]?.trim() || ''
    const typeRaw = row[1]?.trim() || ''
    const sizeRaw = row[2]?.trim() || ''
    const isNullable = row[3]?.trim().toUpperCase() || ''
    if (!name) continue

    let type = typeRaw
    const lower = typeRaw.toLowerCase()
    if (lower.includes('character varying')) type = 'VARCHAR'
    else if (lower.includes('timestamp without')) type = 'TIMESTAMP'
    else if (lower.includes('timestamp with')) type = 'TIMESTAMPTZ'
    else type = typeRaw.toUpperCase()

    const size = sizeRaw === '[NULL]' || !sizeRaw ? '' : sizeRaw

    parsed.push({
      no: parsed.length + 1,
      name,
      comment: '',
      type,
      size,
      pk: false,
      notNull: isNullable === 'NO',
      note: '',
    })
  }

  return parsed
}

let draftCounter = 0
export function createDraftBlock(blockType: DocBlockType, blockTitle: string): DraftBlock {
  draftCounter += 1
  return {
    localId: `draft-${Date.now()}-${draftCounter}`,
    blockType,
    blockTitle: blockTitle.trim() || null,
    content: '',
  }
}
