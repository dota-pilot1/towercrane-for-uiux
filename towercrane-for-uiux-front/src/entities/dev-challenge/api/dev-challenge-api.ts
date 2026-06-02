import { apiRequest } from '../../../shared/api/http'
import type {
  DevChallengeAssignment,
  DevChallengeAssignmentBlock,
  DevChallengeAssignmentDetail,
  DevChallengeAssignmentStatus,
  DevChallengeCategory,
  DevChallengeChecklistItem,
  DevChallengeSection,
  DevChallengeSubmission,
  DevChallengeSubmissionWithAuthor,
  DevChallengeWorkspace,
  DevChallengeWorkspaceMember,
  DevChallengeWorkspaceRole,
} from '../model/types'

export const devChallengeApi = {
  listWorkspaces: () => apiRequest<DevChallengeWorkspace[]>('/dev-challenge/workspaces'),

  getWorkspace: (workspaceId: string) =>
    apiRequest<DevChallengeWorkspace>(`/dev-challenge/workspaces/${workspaceId}`),

  createWorkspace: (data: { name: string; description?: string; icon?: string }) =>
    apiRequest<DevChallengeWorkspace>('/dev-challenge/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateWorkspace: (
    workspaceId: string,
    data: Partial<{ name: string; description: string; icon: string; archived: boolean; orderIdx: number }>,
  ) =>
    apiRequest<DevChallengeWorkspace>(`/dev-challenge/workspaces/${workspaceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteWorkspace: (workspaceId: string) =>
    apiRequest<{ success: boolean }>(`/dev-challenge/workspaces/${workspaceId}`, {
      method: 'DELETE',
    }),

  reorderWorkspaces: (workspaceIds: string[]) =>
    apiRequest<{ success: boolean }>('/dev-challenge/workspaces/reorder', {
      method: 'POST',
      body: JSON.stringify({ workspaceIds }),
    }),

  listWorkspaceMembers: (workspaceId: string) =>
    apiRequest<DevChallengeWorkspaceMember[]>(
      `/dev-challenge/workspaces/${workspaceId}/members`,
    ),

  upsertWorkspaceMember: (
    workspaceId: string,
    data: { userId: string; role: DevChallengeWorkspaceRole },
  ) =>
    apiRequest<DevChallengeWorkspaceMember[]>(
      `/dev-challenge/workspaces/${workspaceId}/members`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),

  deleteWorkspaceMember: (workspaceId: string, memberId: string) =>
    apiRequest<{ success: boolean }>(
      `/dev-challenge/workspaces/${workspaceId}/members/${memberId}`,
      { method: 'DELETE' },
    ),

  listWorkspaceCategories: (workspaceId: string) =>
    apiRequest<DevChallengeCategory[]>(
      `/dev-challenge/workspaces/${workspaceId}/categories`,
    ),

  createWorkspaceCategory: (workspaceId: string, data: { name: string }) =>
    apiRequest<DevChallengeCategory>(
      `/dev-challenge/workspaces/${workspaceId}/categories`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),

  reorderWorkspaceCategories: (workspaceId: string, categoryIds: string[]) =>
    apiRequest<{ success: boolean }>(
      `/dev-challenge/workspaces/${workspaceId}/categories/reorder`,
      {
        method: 'POST',
        body: JSON.stringify({ categoryIds }),
      },
    ),

  listCategories: () => apiRequest<DevChallengeCategory[]>('/dev-challenge/categories'),

  createCategory: (data: { name: string }) =>
    apiRequest<DevChallengeCategory>('/dev-challenge/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCategory: (id: string, data: { name: string }) =>
    apiRequest<DevChallengeCategory>(`/dev-challenge/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteCategory: (id: string) =>
    apiRequest<void>(`/dev-challenge/categories/${id}`, { method: 'DELETE' }),

  reorderCategories: (categoryIds: string[]) =>
    apiRequest<{ success: boolean }>('/dev-challenge/categories/reorder', {
      method: 'POST',
      body: JSON.stringify({ categoryIds }),
    }),

  listSections: (categoryId: string) =>
    apiRequest<DevChallengeSection[]>(`/dev-challenge/categories/${categoryId}/sections`),

  createSection: (data: { categoryId: string; title: string }) =>
    apiRequest<DevChallengeSection>('/dev-challenge/sections', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSection: (id: string, data: { title: string }) =>
    apiRequest<DevChallengeSection>(`/dev-challenge/sections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteSection: (id: string) =>
    apiRequest<void>(`/dev-challenge/sections/${id}`, { method: 'DELETE' }),

  reorderSections: (categoryId: string, sectionIds: string[]) =>
    apiRequest<{ success: boolean }>('/dev-challenge/sections/reorder', {
      method: 'POST',
      body: JSON.stringify({ categoryId, sectionIds }),
    }),

  listAssignments: (sectionId: string) =>
    apiRequest<DevChallengeAssignment[]>(`/dev-challenge/sections/${sectionId}/assignments`),

  getAssignment: (assignmentId: string) =>
    apiRequest<DevChallengeAssignmentDetail>(`/dev-challenge/assignments/${assignmentId}`),

  createAssignment: (data: {
    sectionId: string
    title: string
    summary?: string
    difficulty: string
    status: DevChallengeAssignmentStatus
    noteContent?: string
    checklistItems: DevChallengeChecklistItem[]
  }) =>
    apiRequest<DevChallengeAssignmentDetail>('/dev-challenge/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAssignment: (
    assignmentId: string,
    data: Partial<{
      title: string
      summary: string
      difficulty: string
      status: DevChallengeAssignmentStatus
    }>,
  ) =>
    apiRequest<DevChallengeAssignmentDetail>(`/dev-challenge/assignments/${assignmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  createAssignmentBlock: (
    assignmentId: string,
    data: { blockType: string; title?: string; content: string },
  ) =>
    apiRequest<DevChallengeAssignmentBlock>(`/dev-challenge/assignments/${assignmentId}/blocks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAssignmentBlock: (
    blockId: string,
    data: Partial<{ title: string; content: string }>,
  ) =>
    apiRequest<DevChallengeAssignmentBlock>(`/dev-challenge/blocks/${blockId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteAssignment: (assignmentId: string) =>
    apiRequest<void>(`/dev-challenge/assignments/${assignmentId}`, { method: 'DELETE' }),

  reorderAssignments: (sectionId: string, assignmentIds: string[]) =>
    apiRequest<{ success: boolean }>('/dev-challenge/assignments/reorder', {
      method: 'POST',
      body: JSON.stringify({ sectionId, assignmentIds }),
    }),

  getMySubmission: (assignmentId: string) =>
    apiRequest<DevChallengeSubmission | null>(`/dev-challenge/assignments/${assignmentId}/submissions/my`),

  getSubmissionsByAssignment: (assignmentId: string) =>
    apiRequest<DevChallengeSubmissionWithAuthor[]>(`/dev-challenge/assignments/${assignmentId}/submissions`),

  createSubmission: (data: {
    assignmentId: string
    comment: string
    githubUrl?: string
    checkedItems: string[]
  }) =>
    apiRequest<DevChallengeSubmission>('/dev-challenge/submissions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSubmission: (
    submissionId: string,
    data: {
      comment: string
      githubUrl?: string
      checkedItems: string[]
    },
  ) =>
    apiRequest<DevChallengeSubmission>(`/dev-challenge/submissions/${submissionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}
