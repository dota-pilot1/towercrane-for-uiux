import { useParams } from '@tanstack/react-router'
import { SqlUserPracticePage } from './sql-user-practice-page'

export function SqlPersonalWorkspacePage() {
  const { workspaceId } = useParams({ strict: false }) as { workspaceId?: string }
  return <SqlUserPracticePage mode="personal" workspaceId={workspaceId} />
}
