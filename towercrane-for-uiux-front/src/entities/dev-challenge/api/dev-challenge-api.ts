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
  DevChallengeSubmissionComment,
  DevChallengeSubmissionWithAuthor,
  DevChallengeWorkspace,
  DevChallengeWorkspaceMember,
  DevChallengeWorkspaceRole,
} from '../model/types'

export const devChallengeApi = {
  listWorkspaces: () => apiRequest<DevChallengeWorkspace[]>('/challenge-playbook/workspaces'),

  getWorkspace: (workspaceId: string) =>
    apiRequest<DevChallengeWorkspace>(`/challenge-playbook/workspaces/${workspaceId}`),

  createWorkspace: (data: { name: string; description?: string; icon?: string }) =>
    apiRequest<DevChallengeWorkspace>('/challenge-playbook/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateWorkspace: (
    workspaceId: string,
    data: Partial<{ name: string; description: string; icon: string; archived: boolean; orderIdx: number }>,
  ) =>
    apiRequest<DevChallengeWorkspace>(`/challenge-playbook/workspaces/${workspaceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteWorkspace: (workspaceId: string) =>
    apiRequest<{ success: boolean }>(`/challenge-playbook/workspaces/${workspaceId}`, {
      method: 'DELETE',
    }),

  reorderWorkspaces: (workspaceIds: string[]) =>
    apiRequest<{ success: boolean }>('/challenge-playbook/workspaces/reorder', {
      method: 'POST',
      body: JSON.stringify({ workspaceIds }),
    }),

  listWorkspaceMembers: (workspaceId: string) =>
    apiRequest<DevChallengeWorkspaceMember[]>(
      `/challenge-playbook/workspaces/${workspaceId}/members`,
    ),

  upsertWorkspaceMember: (
    workspaceId: string,
    data: { userId: string; role: DevChallengeWorkspaceRole },
  ) =>
    apiRequest<DevChallengeWorkspaceMember[]>(
      `/challenge-playbook/workspaces/${workspaceId}/members`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),

  deleteWorkspaceMember: (workspaceId: string, memberId: string) =>
    apiRequest<{ success: boolean }>(
      `/challenge-playbook/workspaces/${workspaceId}/members/${memberId}`,
      { method: 'DELETE' },
    ),

  listWorkspaceCategories: (workspaceId: string) =>
    apiRequest<DevChallengeCategory[]>(
      `/challenge-playbook/workspaces/${workspaceId}/categories`,
    ),

  createWorkspaceCategory: (workspaceId: string, data: { name: string }) =>
    apiRequest<DevChallengeCategory>(
      `/challenge-playbook/workspaces/${workspaceId}/categories`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),

  reorderWorkspaceCategories: (workspaceId: string, categoryIds: string[]) =>
    apiRequest<{ success: boolean }>(
      `/challenge-playbook/workspaces/${workspaceId}/categories/reorder`,
      {
        method: 'POST',
        body: JSON.stringify({ categoryIds }),
      },
    ),

  listCategories: () => apiRequest<DevChallengeCategory[]>('/challenge-playbook/categories'),

  createCategory: (data: { name: string }) =>
    apiRequest<DevChallengeCategory>('/challenge-playbook/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCategory: (id: string, data: { name: string }) =>
    apiRequest<DevChallengeCategory>(`/challenge-playbook/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteCategory: (id: string) =>
    apiRequest<void>(`/challenge-playbook/categories/${id}`, { method: 'DELETE' }),

  reorderCategories: (categoryIds: string[]) =>
    apiRequest<{ success: boolean }>('/challenge-playbook/categories/reorder', {
      method: 'POST',
      body: JSON.stringify({ categoryIds }),
    }),

  listSections: (categoryId: string) =>
    apiRequest<DevChallengeSection[]>(`/challenge-playbook/categories/${categoryId}/sections`),

  createSection: (data: { categoryId: string; title: string }) =>
    apiRequest<DevChallengeSection>('/challenge-playbook/sections', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSection: (id: string, data: { title: string }) =>
    apiRequest<DevChallengeSection>(`/challenge-playbook/sections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteSection: (id: string) =>
    apiRequest<void>(`/challenge-playbook/sections/${id}`, { method: 'DELETE' }),

  reorderSections: (categoryId: string, sectionIds: string[]) =>
    apiRequest<{ success: boolean }>('/challenge-playbook/sections/reorder', {
      method: 'POST',
      body: JSON.stringify({ categoryId, sectionIds }),
    }),

  listAssignments: (sectionId: string) =>
    apiRequest<DevChallengeAssignment[]>(`/challenge-playbook/sections/${sectionId}/assignments`),

  getAssignment: (assignmentId: string) =>
    apiRequest<DevChallengeAssignmentDetail>(`/challenge-playbook/assignments/${assignmentId}`),

  createAssignment: (data: {
    sectionId: string
    title: string
    summary?: string
    difficulty: string
    status: DevChallengeAssignmentStatus
    noteContent?: string
    checklistItems: DevChallengeChecklistItem[]
  }) =>
    apiRequest<DevChallengeAssignmentDetail>('/challenge-playbook/assignments', {
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
    apiRequest<DevChallengeAssignmentDetail>(`/challenge-playbook/assignments/${assignmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  createAssignmentBlock: (
    assignmentId: string,
    data: { blockType: string; title?: string; content: string },
  ) =>
    apiRequest<DevChallengeAssignmentBlock>(`/challenge-playbook/assignments/${assignmentId}/blocks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAssignmentBlock: (
    blockId: string,
    data: Partial<{ title: string; content: string }>,
  ) =>
    apiRequest<DevChallengeAssignmentBlock>(`/challenge-playbook/blocks/${blockId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteAssignment: (assignmentId: string) =>
    apiRequest<void>(`/challenge-playbook/assignments/${assignmentId}`, { method: 'DELETE' }),

  reorderAssignments: (sectionId: string, assignmentIds: string[]) =>
    apiRequest<{ success: boolean }>('/challenge-playbook/assignments/reorder', {
      method: 'POST',
      body: JSON.stringify({ sectionId, assignmentIds }),
    }),

  getMySubmission: (assignmentId: string) =>
    apiRequest<DevChallengeSubmission | null>(`/challenge-playbook/assignments/${assignmentId}/submissions/my`),

  getSubmissionsByAssignment: (assignmentId: string) =>
    apiRequest<DevChallengeSubmissionWithAuthor[]>(`/challenge-playbook/assignments/${assignmentId}/submissions`),

  createSubmission: (data: {
    assignmentId: string
    comment: string
    githubUrl?: string
    checkedItems: string[]
  }) =>
    apiRequest<DevChallengeSubmission>('/challenge-playbook/submissions', {
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
    apiRequest<DevChallengeSubmission>(`/challenge-playbook/submissions/${submissionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteSubmission: (submissionId: string) =>
    apiRequest<{ success: boolean; id: string; assignmentId: string }>(
      `/challenge-playbook/submissions/${submissionId}`,
      { method: 'DELETE' },
    ),

  getSubmissionComments: (submissionId: string) =>
    apiRequest<DevChallengeSubmissionComment[]>(
      `/challenge-playbook/submissions/${submissionId}/comments`,
    ),

  createSubmissionComment: (submissionId: string, content: string) =>
    apiRequest<DevChallengeSubmissionComment>(
      `/challenge-playbook/submissions/${submissionId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      },
    ),

  updateSubmissionComment: (commentId: string, content: string) =>
    apiRequest<DevChallengeSubmissionComment>(
      `/challenge-playbook/submission-comments/${commentId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      },
    ),

  deleteSubmissionComment: (commentId: string) =>
    apiRequest<{ success: boolean; id: string; submissionId: string }>(
      `/challenge-playbook/submission-comments/${commentId}`,
      { method: 'DELETE' },
    ),
}
