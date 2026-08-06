export type DevChallengeWorkspaceRole = 'owner' | 'editor' | 'member'

export type DevChallengeWorkspace = {
  id: string
  name: string
  description: string
  icon: string
  color?: string | null
  orderIdx: number
  archived: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
  myRole: DevChallengeWorkspaceRole
  categoryCount: number
  sectionCount: number
  assignmentCount: number
  memberCount: number
}

export type DevChallengeWorkspaceMember = {
  id: string
  workspaceId: string
  userId: string
  role: DevChallengeWorkspaceRole
  createdAt: string
  updatedAt: string
  userName?: string | null
  userEmail?: string | null
}

export type DevChallengeCategory = {
  id: string
  workspaceId: string
  name: string
  summary?: string | null
  icon: string
  orderIdx: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type DevChallengeSection = {
  id: string
  categoryId: string
  title: string
  summary?: string | null
  orderIdx: number
  createdAt: string
  updatedAt: string
}

export type DevChallengeAssignmentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export type DevChallengeBlockType = 'NOTE' | 'MMD' | 'CHECKLIST' | 'GITHUB' | 'FIGMA' | 'FILE' | 'DBTABLE'

export type DevChallengeAssignment = {
  id: string
  sectionId: string
  title: string
  summary?: string | null
  difficulty: string
  status: DevChallengeAssignmentStatus
  orderIdx: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type DevChallengeAssignmentBlock = {
  id: string
  assignmentId: string
  blockType: DevChallengeBlockType
  title?: string | null
  content: string
  orderIdx: number
  createdAt: string
  updatedAt: string
}

export type DevChallengeAssignmentDetail = DevChallengeAssignment & {
  blocks: DevChallengeAssignmentBlock[]
}

export type DevChallengeChecklistItem = {
  id: string
  label: string
}

export type DevChallengeSubmissionStatus = 'SUBMITTED' | 'NEEDS_CHANGES' | 'APPROVED' | 'REJECTED'

export type DevChallengeSubmission = {
  id: string
  assignmentId: string
  userId: string
  comment: string
  githubUrl?: string | null
  status: DevChallengeSubmissionStatus
  score: number
  maxScore: number
  checkedItems: string[]
  adminRating?: number | null
  adminFeedback?: string | null
  reviewedBy?: string | null
  createdAt: string
  updatedAt: string
}

export type DevChallengeSubmissionWithAuthor = DevChallengeSubmission & {
  authorName: string
  authorImageUrl?: string | null
}

export type DevChallengeSubmissionComment = {
  id: string
  submissionId: string
  userId: string
  content: string
  authorName: string
  authorImageUrl?: string | null
  createdAt: string
  updatedAt: string
}
