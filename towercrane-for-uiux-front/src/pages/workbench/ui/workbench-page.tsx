import { useParams, useSearch } from '@tanstack/react-router'
import { AdminShell } from '../../../widgets/admin-shell/ui/admin-shell'

export function WorkbenchPage() {
  const params = useParams({ strict: false }) as {
    workspaceId?: string
    categoryId?: string
  }
  const search = useSearch({ strict: false }) as { prototypeId?: string }

  return (
    <AdminShell
      workspaceId={params.workspaceId}
      categoryId={params.categoryId ?? ''}
      prototypeId={search.prototypeId}
    />
  )
}
