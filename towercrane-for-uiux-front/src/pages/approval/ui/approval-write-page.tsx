import { useNavigate } from '@tanstack/react-router'
import { SubmitForm } from './approval-page-content'
import { ApprovalPageLayout } from './approval-page-layout'

export function ApprovalWritePage() {
  const navigate = useNavigate()

  return (
    <ApprovalPageLayout>
      <SubmitForm onSuccess={() => navigate({ to: '/approval/sent' })} />
    </ApprovalPageLayout>
  )
}
