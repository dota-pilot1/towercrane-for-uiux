export type CodeReviewSourceType = "commit" | "pr" | "compare" | "diff_url";
export type CodeReviewRiskLevel = "low" | "medium" | "high";
export type CodeReviewFindingSeverity = "low" | "medium" | "high";
export type CodeReviewSection =
  | "structure"
  | "process"
  | "code"
  | "syntax"
  | "architecture"
  | "diagram";

export type CodeReviewDocumentType =
  | "overview"
  | "review"
  | "checklist"
  | "issue"
  | "note";

export type CodeReviewDocument = {
  id: string;
  type: CodeReviewDocumentType;
  title: string;
  content: string;
  orderIdx: number;
  createdAt: string;
  updatedAt: string;
};

export type CodeReviewFinding = {
  category?:
    | "structure"
    | "process"
    | "code"
    | "syntax"
    | "architecture"
    | "clean_code"
    | "diagram"
    | "risk";
  severity: CodeReviewFindingSeverity;
  title: string;
  body: string;
  filePath: string | null;
  lineNumber: number | null;
  recommendation: string;
};

export type CodeReviewChangedFile = {
  path: string;
  additions: number;
  deletions: number;
  reviewed: boolean;
  excludedReason: string | null;
};

export type CodeReviewSummary = {
  id: string;
  taskId: string | null;
  sourceType: CodeReviewSourceType;
  sourceUrl: string;
  repository: string;
  title: string;
  summary: string;
  riskLevel: CodeReviewRiskLevel;
  findingCount: number;
  highSeverityCount: number;
  testGapCount: number;
  changedFileCount: number;
  excludedFileCount: number;
  documentCount: number;
  model: string | null;
  createdBy: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

export type CodeReviewDetail = CodeReviewSummary & {
  findings: CodeReviewFinding[];
  testGaps: string[];
  changedFiles: CodeReviewChangedFile[];
  excludedFiles: CodeReviewChangedFile[];
  reviewDocuments: CodeReviewDocument[];
  diffHash: string;
  diffSnapshot: string | null;
  canEdit: boolean;
  canDelete: boolean;
  duplicate?: boolean;
};

export type CreateManualCodeReviewPayload = {
  title: string;
  summary: string;
  repository?: string;
  riskLevel?: CodeReviewRiskLevel;
  documents?: CodeReviewDocument[];
};

export type CodeReviewListResponse = {
  items: CodeReviewSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CodeReviewListParams = {
  q?: string;
  repository?: string;
  riskLevel?: CodeReviewRiskLevel;
  page: number;
  pageSize: number;
};

export type AnalyzeCodeReviewPayload = {
  sourceUrl: string;
  repositoryUrl?: string;
  reviewGoal?: string;
  sections?: CodeReviewSection[];
};
