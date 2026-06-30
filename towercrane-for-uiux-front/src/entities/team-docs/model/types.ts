export type TeamDocNodeType = 'FOLDER' | 'DOC' | 'FILE'

export type TeamDocNode = {
  id: string
  parentId: string | null
  type: TeamDocNodeType
  title: string
  orderIdx: number
  content?: string | null
  fileUrl?: string | null
  fileName?: string | null
  contentType?: string | null
  fileSize?: number | null
  createdByName?: string | null
  updatedByName?: string | null
  createdAt: string
  updatedAt: string
}

export type CreateTeamDocFileRequest = {
  parentId: string | null
  fileName: string
  fileUrl: string
  contentType: string
  fileSize: number
}

export type UpdateTeamDocNodeRequest = {
  title?: string
  content?: string
  parentId?: string | null
}
