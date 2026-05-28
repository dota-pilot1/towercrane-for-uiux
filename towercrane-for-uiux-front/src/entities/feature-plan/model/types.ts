export type FeaturePlanSummary = {
  id: string
  linkedTaskId: string | null
  title: string
  summary: string
  checklistCount: number
  sourceFileName: string | null
  createdBy: string | null
  createdByName: string
  createdAt: string
  updatedAt: string
}

export type FeaturePlanDetail = FeaturePlanSummary & {
  content: string
  acceptanceCriteria: string
  plan: string
  folderStructure: string
  checklist: string[]
  mmdContent: string
  canEdit: boolean
  canDelete: boolean
}

export type FeaturePlanListResponse = {
  items: FeaturePlanSummary[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type FeaturePlanListParams = {
  q?: string
  page: number
  pageSize: number
}

export type CreateFeaturePlanPayload = {
  title: string
  summary: string
  content?: string
  acceptanceCriteria?: string
  plan?: string
  folderStructure?: string
  checklist?: string[]
  mmdContent?: string
  sourceFileName?: string | null
  linkedTaskId?: string | null
}

export type UpdateFeaturePlanPayload = Partial<CreateFeaturePlanPayload>

export type RegisterFeaturePlanTaskResponse = FeaturePlanDetail & {
  taskId: string
  taskUrl: string
}
