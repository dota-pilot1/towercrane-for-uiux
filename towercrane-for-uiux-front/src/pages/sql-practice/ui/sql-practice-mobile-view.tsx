import { SqlPracticeDesktopView } from './sql-practice-desktop-view'
import type { SqlPracticeOfficialWorkbench } from '../model/use-sql-practice-official-workbench'

type SqlPracticeMobileViewProps = {
  workbench: SqlPracticeOfficialWorkbench
}

export function SqlPracticeMobileView({ workbench }: SqlPracticeMobileViewProps) {
  return <SqlPracticeDesktopView workbench={workbench} />
}
