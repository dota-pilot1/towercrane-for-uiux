export type CodeReviewSourceType = 'commit' | 'pr' | 'compare' | 'diff_url'
export type CodeReviewRiskLevel = 'low' | 'medium' | 'high'
export type CodeReviewFindingSeverity = 'low' | 'medium' | 'high'
export type CodeReviewSection =
  | 'structure'
  | 'process'
  | 'code'
  | 'syntax'
  | 'architecture'
  | 'diagram'

export type CodeReviewFinding = {
  category?:
    | 'structure'
    | 'process'
    | 'code'
    | 'syntax'
    | 'architecture'
    | 'clean_code'
    | 'diagram'
    | 'risk'
  severity: CodeReviewFindingSeverity
  title: string
  body: string
  filePath: string | null
  lineNumber: number | null
  recommendation: string
}

export type GithubPrReviewCriterion = {
  id: string
  title: string
  instruction: string
  enabled: boolean
  orderIdx: number
}

export type GithubPrCriterionFinding = {
  severity: CodeReviewFindingSeverity
  message: string
  filePath: string | null
  lineNumber: number | null
  evidence: string
  recommendation: string
}

export type GithubPrCriterionResult = {
  criterionId: string
  criterionTitle: string
  status: 'problem' | 'warning' | 'no_finding' | 'not_applicable'
  summary: string
  findings: GithubPrCriterionFinding[]
}

export type CodeReviewChangedFile = {
  path: string
  additions: number
  deletions: number
  reviewed: boolean
  excludedReason: string | null
}

export type CodeReviewSummary = {
  id: string
  taskId: string | null
  sourceType: CodeReviewSourceType
  sourceUrl: string
  repository: string
  title: string
  summary: string
  riskLevel: CodeReviewRiskLevel
  findingCount: number
  highSeverityCount: number
  testGapCount: number
  changedFileCount: number
  excludedFileCount: number
  model: string | null
  prNumber: number | null
  prTitle: string | null
  prState: string | null
  prAuthorLogin: string | null
  baseRef: string | null
  headRef: string | null
  headSha: string | null
  prUpdatedAt: string | null
  reviewNote: string | null
  criteriaSnapshot: GithubPrReviewCriterion[]
  criterionResults: GithubPrCriterionResult[]
  promptContractVersion: string | null
  createdBy: string | null
  createdByName: string
  createdAt: string
  updatedAt: string
}

export type CodeReviewDetail = CodeReviewSummary & {
  findings: CodeReviewFinding[]
  testGaps: string[]
  changedFiles: CodeReviewChangedFile[]
  excludedFiles: CodeReviewChangedFile[]
  diffHash: string
  diffSnapshot: string | null
  canEdit: boolean
  canDelete: boolean
  duplicate?: boolean
}

export type CodeReviewListResponse = {
  items: CodeReviewSummary[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type CodeReviewListParams = {
  q?: string
  repository?: string
  taskId?: string
  sourceType?: CodeReviewSourceType
  riskLevel?: CodeReviewRiskLevel
  page: number
  pageSize: number
}

export type AnalyzeCodeReviewPayload = {
  sourceUrl: string
  repositoryUrl?: string
  reviewGoal?: string
  sections?: CodeReviewSection[]
}

export type AnalyzeGithubPrReviewPayload = {
  sourceUrl: string
  reviewNote?: string
}

export type GithubPrReviewPreferences = {
  criteria: GithubPrReviewCriterion[]
  version: number
  updatedAt: string
}

export type SaveGithubPrReviewPreferencesPayload = {
  criteria: GithubPrReviewCriterion[]
}

export type CreateCodeReviewPayload = {
  taskId?: string | null
  sourceType: CodeReviewSourceType
  sourceUrl: string
  repository: string
  title: string
  summary: string
  riskLevel: CodeReviewRiskLevel
  findings: CodeReviewFinding[]
  testGaps: string[]
  changedFiles: CodeReviewChangedFile[]
  excludedFiles: CodeReviewChangedFile[]
  diffHash: string
  diffSnapshot?: string | null
  model?: string | null
}

export type CodeReviewRepositoryValidation = {
  valid: boolean
  repository: string
  repositoryUrl: string
  defaultBranch: string | null
  message: string
}

export type UpdateCodeReviewPayload = {
  title?: string
  summary?: string
  riskLevel?: CodeReviewRiskLevel
  taskId?: string | null
}
