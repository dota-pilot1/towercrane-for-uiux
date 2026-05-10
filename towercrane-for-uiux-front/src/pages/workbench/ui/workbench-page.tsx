import { useParams, useSearch } from '@tanstack/react-router'
import { AdminShell } from '../../../widgets/admin-shell/ui/admin-shell'

export function WorkbenchPage() {
  const params = useParams({ strict: false }) as { categoryId?: string }
  const search = useSearch({ strict: false }) as { prototypeId?: string }

  return <AdminShell categoryId={params.categoryId ?? ''} prototypeId={search.prototypeId} />
}
