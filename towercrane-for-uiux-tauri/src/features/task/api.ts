import { apiRequest } from "../../shared/api/client";

// 웹의 /task/my (내 업무 워크스페이스)와 동일한 데이터.
// 서버가 토큰으로 "나" 기준 필터링하므로 scope=my 만 붙이면 됨.

export type TaskWorkspace = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  orderIdx: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  openTaskCount: number;
};

export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "HOLD";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "대기",
  IN_PROGRESS: "진행 중",
  REVIEW: "검토",
  DONE: "완료",
  HOLD: "보류",
};

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  URGENT: "긴급",
};

export type TaskType =
  | "FEATURE"
  | "BUG"
  | "DOCS"
  | "DESIGN"
  | "REFACTOR"
  | "QA"
  | "CHORE";

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  FEATURE: "기능",
  BUG: "버그",
  DOCS: "문서",
  DESIGN: "디자인",
  REFACTOR: "리팩토링",
  QA: "QA",
  CHORE: "기타",
};

export type Task = {
  id: string;
  title: string;
  content: string;
  taskType: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string | null;
  assigneeName?: string | null;
  reporterName?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskReferenceType = "FIGMA" | "DOC" | "GITHUB" | "URL";

export const TASK_REFERENCE_TYPE_LABELS: Record<TaskReferenceType, string> = {
  FIGMA: "Figma",
  DOC: "문서",
  GITHUB: "GitHub",
  URL: "URL",
};

export type TaskReference = {
  id: string;
  taskId: string;
  referenceType: TaskReferenceType;
  title: string;
  url: string;
  orderIdx: number;
};

export type TaskAttachment = {
  id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  contentType: string;
  fileSize: number;
  createdAt: string;
};

export type TaskChecklist = {
  id: string;
  taskId: string;
  content: string;
  completed: boolean;
  orderIdx: number;
};

export type TaskComment = {
  id: string;
  taskId: string;
  userName?: string | null;
  content: string;
  createdAt: string;
};

export type AssignableUser = {
  id: string;
  name: string;
  email: string;
};

export type UpdateTaskInput = {
  title?: string;
  content?: string;
  taskType?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
};

type TaskListResponse = {
  items: Task[];
  total: number;
};

// 내 업무 워크스페이스 목록 (요약 카운트 포함)
export async function getMyWorkspaces(token: string): Promise<TaskWorkspace[]> {
  return apiRequest<TaskWorkspace[]>("/tasks/workspaces?scope=my", {
    token,
    errorMessage: "워크스페이스를 불러오지 못했습니다.",
  });
}

// 특정 워크스페이스의 내 업무 목록
export async function getMyWorkspaceTasks(
  token: string,
  workspaceId: string,
): Promise<Task[]> {
  const res = await apiRequest<TaskListResponse>(
    `/tasks/workspaces/${workspaceId}/tasks?scope=my&archived=false&sort=order&page=1&pageSize=100`,
    { token, errorMessage: "업무를 불러오지 못했습니다." },
  );
  return res.items;
}

// ── 상세 ──────────────────────────────────────────────────────────────────

export async function getTask(token: string, taskId: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}`, {
    token,
    errorMessage: "업무를 불러오지 못했습니다.",
  });
}

export async function updateTask(
  token: string,
  taskId: string,
  body: UpdateTaskInput,
): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "업무를 저장하지 못했습니다.",
  });
}

// 인라인 빠른 변경 (활동 로그 기록용 전용 엔드포인트)
export async function updateTaskStatus(
  token: string,
  taskId: string,
  status: TaskStatus,
): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}/status`, {
    method: "PATCH",
    body: { status },
    token,
    errorMessage: "상태를 변경하지 못했습니다.",
  });
}

export async function updateTaskPriority(
  token: string,
  taskId: string,
  priority: TaskPriority,
): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}/priority`, {
    method: "PATCH",
    body: { priority },
    token,
    errorMessage: "우선순위를 변경하지 못했습니다.",
  });
}

export async function updateTaskAssignee(
  token: string,
  taskId: string,
  assigneeId: string | null,
): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}/assignee`, {
    method: "PATCH",
    body: { assigneeId },
    token,
    errorMessage: "담당자를 변경하지 못했습니다.",
  });
}

export async function getChecklists(
  token: string,
  taskId: string,
): Promise<TaskChecklist[]> {
  return apiRequest<TaskChecklist[]>(`/tasks/${taskId}/checklists`, {
    token,
    errorMessage: "체크리스트를 불러오지 못했습니다.",
  });
}

export async function toggleChecklist(
  token: string,
  taskId: string,
  checklistId: string,
): Promise<TaskChecklist> {
  return apiRequest<TaskChecklist>(
    `/tasks/${taskId}/checklists/${checklistId}/toggle`,
    { method: "PATCH", token, errorMessage: "체크리스트를 변경하지 못했습니다." },
  );
}

export async function getComments(
  token: string,
  taskId: string,
): Promise<TaskComment[]> {
  return apiRequest<TaskComment[]>(`/tasks/${taskId}/comments`, {
    token,
    errorMessage: "댓글을 불러오지 못했습니다.",
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

// ── 참고 링크 ───────────────────────────────────────────────────────────────

export async function getReferences(
  token: string,
  taskId: string,
): Promise<TaskReference[]> {
  return apiRequest<TaskReference[]>(`/tasks/${taskId}/references`, {
    token,
    errorMessage: "참고 링크를 불러오지 못했습니다.",
  });
}

export async function createReference(
  token: string,
  taskId: string,
  body: { referenceType: TaskReferenceType; title: string; url: string },
): Promise<TaskReference> {
  return apiRequest<TaskReference>(`/tasks/${taskId}/references`, {
    method: "POST",
    body,
    token,
    errorMessage: "참고 링크를 추가하지 못했습니다.",
  });
}

export async function deleteReference(
  token: string,
  taskId: string,
  referenceId: string,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(
    `/tasks/${taskId}/references/${referenceId}`,
    { method: "DELETE", token, errorMessage: "참고 링크를 삭제하지 못했습니다." },
  );
}

// ── 첨부 (보기) ─────────────────────────────────────────────────────────────

export async function getAttachments(
  token: string,
  taskId: string,
): Promise<TaskAttachment[]> {
  return apiRequest<TaskAttachment[]>(`/tasks/${taskId}/attachments`, {
    token,
    errorMessage: "첨부를 불러오지 못했습니다.",
  });
}
