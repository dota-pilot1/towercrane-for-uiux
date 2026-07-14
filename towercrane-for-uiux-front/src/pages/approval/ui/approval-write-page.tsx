import { useNavigate } from '@tanstack/react-router'
import { ApprovalSubmitForm } from '../../../features/create-approval/ui/approval-submit-form'
import { ApprovalPageLayout } from './approval-page-layout'

export function ApprovalWritePage() {
  const navigate = useNavigate()

  return (
    <ApprovalPageLayout>
      <ApprovalSubmitForm onSuccess={() => navigate({ to: '/approval/sent' })} />
    </ApprovalPageLayout>
  )
}
