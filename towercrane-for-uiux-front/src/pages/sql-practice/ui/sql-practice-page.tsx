import { useMediaQuery } from '../model/use-media-query'
import { useSqlPracticeOfficialWorkbench } from '../model/use-sql-practice-official-workbench'
import { SqlPracticeDesktopView } from './sql-practice-desktop-view'
import { SqlPracticeMobileView } from './sql-practice-mobile-view'

export function SqlPracticePage() {
  const workbench = useSqlPracticeOfficialWorkbench()
  const isMobile = useMediaQuery('(max-width: 767px)')

  if (isMobile) {
    return <SqlPracticeMobileView workbench={workbench} />
  }

  return <SqlPracticeDesktopView workbench={workbench} />
}
