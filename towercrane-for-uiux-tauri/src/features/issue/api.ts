import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { apiRequest } from "../../shared/api/client";

// 웹의 /project-issues 와 동일한 데이터.
// 서버가 Bearer 토큰으로 권한을 판정하므로 token 만 넘기면 된다.

export type ProjectIssueType =
  | "BUG"
  | "FEATURE"
  | "IMPROVEMENT"
  | "QUESTION"
  | "RISK"
  | "OTHER";

export const ISSUE_TYPE_LABELS: Record<ProjectIssueType, string> = {
  BUG: "버그",
  FEATURE: "기능",
  IMPROVEMENT: "개선",
  QUESTION: "질문",
  RISK: "리스크",
  OTHER: "기타",
};

export type ProjectIssueStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "TESTING"
  | "CLOSED"
  | "HOLD";

export const ISSUE_STATUS_LABELS: Record<ProjectIssueStatus, string> = {
  OPEN: "열림",
  IN_PROGRESS: "진행 중",
  TESTING: "테스트",
  CLOSED: "닫힘",
  HOLD: "보류",
};

export type ProjectIssuePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export const ISSUE_PRIORITY_LABELS: Record<ProjectIssuePriority, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  URGENT: "긴급",
};

export type ProjectIssueWorkspace = {
  id: string;
  name: string;
  description: string;
  orderIdx: number;
  archived: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  issueCount: number;
};

export type ProjectIssue = {
  id: string;
  projectId: string;
  title: string;
  content: string;
  issueType: ProjectIssueType;
  status: ProjectIssueStatus;
  priority: ProjectIssuePriority;
  reporterId: string;
  reporterName?: string | null;
  reporterEmail?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  dueDate?: string | null;
  orderIdx: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

type IssueListResponse = {
  items: ProjectIssue[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateIssueInput = {
  projectId: string;
  title: string;
  content?: string;
  issueType?: ProjectIssueType;
  priority?: ProjectIssuePriority;
};

export type UpdateIssueInput = {
  title?: string;
  content?: string;
  issueType?: ProjectIssueType;
  status?: ProjectIssueStatus;
  priority?: ProjectIssuePriority;
  assigneeId?: string | null;
  dueDate?: string | null;
};

export type ProjectIssueChecklist = {
  id: string;
  projectIssueId: string;
  content: string;
  completed: boolean;
  orderIdx: number;
  createdAt: string;
  updatedAt: string;
};

export type ProjectIssueComment = {
  id: string;
  projectIssueId: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectIssueActivityType =
  | "CREATED"
  | "STATUS"
  | "ASSIGNEE"
  | "PRIORITY"
  | "UPDATED"
  | "ARCHIVED"
  | "RESTORED";

export const ISSUE_ACTIVITY_LABELS: Record<ProjectIssueActivityType, string> = {
  CREATED: "생성",
  STATUS: "상태 변경",
  ASSIGNEE: "담당자 변경",
  PRIORITY: "우선순위 변경",
  UPDATED: "수정",
  ARCHIVED: "보관",
  RESTORED: "복원",
};

export type ProjectIssueActivityLog = {
  id: string;
  projectIssueId: string;
  actorId?: string | null;
  actorName?: string | null;
  activityType: ProjectIssueActivityType;
  fromValue?: string | null;
  toValue?: string | null;
  message?: string | null;
  createdAt: string;
};

export type AssignableUser = {
  id: string;
  name: string;
  email: string;
};

// ── 워크스페이스 ──────────────────────────────────────────────────────────────

export async function getWorkspaces(
  token: string,
): Promise<ProjectIssueWorkspace[]> {
  return apiRequest<ProjectIssueWorkspace[]>(
    "/project-issues/workspaces?archived=false",
    { token, errorMessage: "워크스페이스를 불러오지 못했습니다." },
  );
}

export async function createWorkspace(
  token: string,
  body: { name: string; description?: string },
): Promise<ProjectIssueWorkspace> {
  return apiRequest<ProjectIssueWorkspace>("/project-issues/workspaces", {
    method: "POST",
    body,
    token,
    errorMessage: "워크스페이스를 만들지 못했습니다.",
  });
}

// ── 이슈 ─────────────────────────────────────────────────────────────────────

// 특정 워크스페이스(projectId)의 이슈 목록
export async function getWorkspaceIssues(
  token: string,
  projectId: string,
): Promise<ProjectIssue[]> {
  const res = await apiRequest<IssueListResponse>(
    `/project-issues?projectId=${projectId}&archived=false&sort=order&page=1&pageSize=100`,
    { token, errorMessage: "이슈를 불러오지 못했습니다." },
  );
  return res.items;
}

export async function createIssue(
  token: string,
  body: CreateIssueInput,
): Promise<ProjectIssue> {
  return apiRequest<ProjectIssue>("/project-issues", {
    method: "POST",
    body,
    token,
    errorMessage: "이슈를 만들지 못했습니다.",
  });
}

// 인라인 빠른 변경 (활동 로그 기록용 전용 엔드포인트)
export async function updateIssueStatus(
  token: string,
  issueId: string,
  status: ProjectIssueStatus,
): Promise<ProjectIssue> {
  return apiRequest<ProjectIssue>(`/project-issues/${issueId}/status`, {
    method: "PATCH",
    body: { status },
    token,
    errorMessage: "상태를 변경하지 못했습니다.",
  });
}

export async function updateIssuePriority(
  token: string,
  issueId: string,
  priority: ProjectIssuePriority,
): Promise<ProjectIssue> {
  return apiRequest<ProjectIssue>(`/project-issues/${issueId}/priority`, {
    method: "PATCH",
    body: { priority },
    token,
    errorMessage: "우선순위를 변경하지 못했습니다.",
  });
}

// ── 상세 ─────────────────────────────────────────────────────────────────────

export async function getIssue(
  token: string,
  issueId: string,
): Promise<ProjectIssue> {
  return apiRequest<ProjectIssue>(`/project-issues/${issueId}`, {
    token,
    errorMessage: "이슈를 불러오지 못했습니다.",
  });
}

export async function updateIssue(
  token: string,
  issueId: string,
  body: UpdateIssueInput,
): Promise<ProjectIssue> {
  return apiRequest<ProjectIssue>(`/project-issues/${issueId}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "이슈를 저장하지 못했습니다.",
  });
}

export async function updateIssueAssignee(
  token: string,
  issueId: string,
  assigneeId: string | null,
): Promise<ProjectIssue> {
  return apiRequest<ProjectIssue>(`/project-issues/${issueId}/assignee`, {
    method: "PATCH",
    body: { assigneeId },
    token,
    errorMessage: "담당자를 변경하지 못했습니다.",
  });
}

export async function getAssignableUsers(
  token: string,
): Promise<AssignableUser[]> {
  return apiRequest<AssignableUser[]>("/users/assignable", {
    token,
    errorMessage: "담당자 목록을 불러오지 못했습니다.",
  });
}

// ── 체크리스트 ────────────────────────────────────────────────────────────────

export async function getIssueChecklists(
  token: string,
  issueId: string,
): Promise<ProjectIssueChecklist[]> {
  return apiRequest<ProjectIssueChecklist[]>(
    `/project-issues/${issueId}/checklists`,
    { token, errorMessage: "체크리스트를 불러오지 못했습니다." },
  );
}

export async function createIssueChecklist(
  token: string,
  issueId: string,
  content: string,
): Promise<ProjectIssueChecklist> {
  return apiRequest<ProjectIssueChecklist>(
    `/project-issues/${issueId}/checklists`,
    {
      method: "POST",
      body: { content },
      token,
      errorMessage: "체크리스트를 추가하지 못했습니다.",
    },
  );
}

export async function toggleIssueChecklist(
  token: string,
  issueId: string,
  checklistId: string,
): Promise<ProjectIssueChecklist> {
  return apiRequest<ProjectIssueChecklist>(
    `/project-issues/${issueId}/checklists/${checklistId}/toggle`,
    { method: "PATCH", token, errorMessage: "체크리스트를 변경하지 못했습니다." },
  );
}

export async function deleteIssueChecklist(
  token: string,
  issueId: string,
  checklistId: string,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(
    `/project-issues/${issueId}/checklists/${checklistId}`,
    { method: "DELETE", token, errorMessage: "체크리스트를 삭제하지 못했습니다." },
  );
}

// ── 댓글 ─────────────────────────────────────────────────────────────────────

export async function getIssueComments(
  token: string,
  issueId: string,
): Promise<ProjectIssueComment[]> {
  return apiRequest<ProjectIssueComment[]>(
    `/project-issues/${issueId}/comments`,
    { token, errorMessage: "댓글을 불러오지 못했습니다." },
  );
}

export async function createIssueComment(
  token: string,
  issueId: string,
  content: string,
): Promise<ProjectIssueComment> {
  return apiRequest<ProjectIssueComment>(
    `/project-issues/${issueId}/comments`,
    {
      method: "POST",
      body: { content },
      token,
      errorMessage: "댓글을 등록하지 못했습니다.",
    },
  );
}

export async function deleteIssueComment(
  token: string,
  issueId: string,
  commentId: string,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(
    `/project-issues/${issueId}/comments/${commentId}`,
    { method: "DELETE", token, errorMessage: "댓글을 삭제하지 못했습니다." },
  );
}

// ── 활동 로그 ─────────────────────────────────────────────────────────────────

export async function getIssueActivity(
  token: string,
  issueId: string,
): Promise<ProjectIssueActivityLog[]> {
  return apiRequest<ProjectIssueActivityLog[]>(
    `/project-issues/${issueId}/activity`,
    { token, errorMessage: "활동 로그를 불러오지 못했습니다." },
  );
}

// ── 첨부 ─────────────────────────────────────────────────────────────────────

export type ProjectIssueAttachment = {
  id: string;
  projectIssueId: string;
  userId?: string | null;
  fileName: string;
  fileUrl: string;
  contentType: string;
  fileSize: number;
  createdAt: string;
};

export async function getIssueAttachments(
  token: string,
  issueId: string,
): Promise<ProjectIssueAttachment[]> {
  return apiRequest<ProjectIssueAttachment[]>(
    `/project-issues/${issueId}/attachments`,
    { token, errorMessage: "첨부를 불러오지 못했습니다." },
  );
}

export async function createIssueAttachment(
  token: string,
  issueId: string,
  body: {
    fileName: string;
    fileUrl: string;
    contentType: string;
    fileSize: number;
  },
): Promise<ProjectIssueAttachment> {
  return apiRequest<ProjectIssueAttachment>(
    `/project-issues/${issueId}/attachments`,
    {
      method: "POST",
      body,
      token,
      errorMessage: "첨부를 등록하지 못했습니다.",
    },
  );
}

export async function deleteIssueAttachment(
  token: string,
  issueId: string,
  attachmentId: string,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(
    `/project-issues/${issueId}/attachments/${attachmentId}`,
    { method: "DELETE", token, errorMessage: "첨부를 삭제하지 못했습니다." },
  );
}

// presigned URL 발급 → S3 직접 PUT → 첨부 등록까지 한 번에 처리한다.
// (웹 src/shared/api/upload.ts 와 동일 흐름, S3 PUT 은 Tauri HTTP 플러그인으로 CORS 우회)
export async function uploadIssueAttachment(
  token: string,
  issueId: string,
  file: File,
): Promise<ProjectIssueAttachment> {
  const contentType = file.type || "application/octet-stream";
  const presign = await apiRequest<{ presignedUrl: string; publicUrl: string }>(
    "/upload/presign",
    {
      method: "POST",
      body: { filename: file.name, contentType },
      token,
      errorMessage: "업로드 URL을 발급받지 못했습니다.",
    },
  );

  const bytes = new Uint8Array(await file.arrayBuffer());
  const putRes = await tauriFetch(presign.presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: bytes,
  });
  if (!putRes.ok) {
    throw new Error(`파일 업로드에 실패했습니다 (${putRes.status}).`);
  }

  return createIssueAttachment(token, issueId, {
    fileName: file.name,
    fileUrl: presign.publicUrl,
    contentType,
    fileSize: file.size,
  });
}
