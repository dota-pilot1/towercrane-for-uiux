export type BoardKind = 'NOTICE' | 'INQUIRY' | 'QNA' | 'FREE' | 'FAQ' | 'EVENT' | 'GENERAL'
export type BoardStatus = 'PUBLISHED' | 'HIDDEN' | 'DRAFT'

export type BoardConfig = {
  id: string
  code: string
  kind: BoardKind
  name: string
  description: string | null
  allowUserWrite: boolean
  allowComment: boolean
  isActive: boolean
  orderIdx: number
  createdAt: string
  updatedAt: string
}

export type BoardSummary = {
  id: string
  boardCode: string
  boardName: string
  title: string
  authorId: string | null
  authorName: string
  status: BoardStatus
  pinned: boolean
  answered: boolean
  viewCount: number
  createdAt: string
  updatedAt: string
}

export type BoardDetail = BoardSummary & {
  content: string
  canEdit: boolean
}

export type BoardComment = {
  id: string
  boardId: string
  authorId: string | null
  authorName: string
  content: string
  adminReply: boolean
  createdAt: string
  updatedAt: string
}

export type BoardFilters = {
  page?: number
  pageSize?: number
  q?: string
  status?: BoardStatus
}

export type BoardListResponse = {
  config: BoardConfig
  items: BoardSummary[]
  total: number
  page: number
  pageSize: number
}

export type CreateBoardRequest = {
  title: string
  content: string
}

export type UpdateBoardRequest = Partial<CreateBoardRequest>

export type CreateBoardConfigRequest = {
  code: string
  kind: BoardKind
  name: string
  description?: string
  allowUserWrite: boolean
  allowComment: boolean
  isActive: boolean
  orderIdx: number
}

export type UpdateBoardConfigRequest = Partial<Omit<CreateBoardConfigRequest, 'code'>>
