export type BlockType = 'NOTE' | 'MMD' | 'CHECKLIST' | 'GITHUB' | 'FIGMA' | 'FILE' | 'DBTABLE'

export interface Block {
  id: string
  blockType: BlockType
  blockTitle: string | null
  content: string
  orderIdx: number
  createdAt: string
  updatedAt: string
}

export interface BlockInput {
  blockType: BlockType
  blockTitle: string | null
  content: string
}

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  NOTE: '메모',
  MMD: 'Mermaid',
  CHECKLIST: '체크리스트',
  GITHUB: 'GitHub',
  FIGMA: 'Figma',
  FILE: '파일',
  DBTABLE: 'DB 테이블',
}

export const BLOCK_TYPE_DESCRIPTIONS: Record<BlockType, string> = {
  NOTE: '텍스트 메모',
  MMD: '다이어그램',
  CHECKLIST: '체크 항목들',
  GITHUB: 'GitHub 링크',
  FIGMA: 'Figma 임베드',
  FILE: '파일 업로드',
  DBTABLE: '테이블 스키마',
}
