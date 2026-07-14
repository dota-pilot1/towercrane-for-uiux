import type { ApprovalRequest } from '../../../shared/api/approval'

/** 로그인 사용자가 현재 활성 결재 단계를 처리할 수 있는지 판정한다. */
export function canActOnApproval(
  request: ApprovalRequest,
  currentUserId: string,
): boolean {
  if (!currentUserId || request.status !== 'PENDING') return false

  const orderedSteps = [...request.steps].sort((a, b) => a.order - b.order)
  const currentStep = orderedSteps.find((step) => step.status === 'PENDING')

  if (!currentStep || currentStep.approverId !== currentUserId) return false

  return orderedSteps
    .filter((step) => step.order < currentStep.order)
    .every((step) => step.status === 'APPROVED')
}
