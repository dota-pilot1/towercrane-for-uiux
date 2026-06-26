import { useEffect, useRef } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { trackPageView } from '../../entities/analytics/api/analytics-api'
import { getSessionId, getVisitorId } from '../../shared/lib/visitor-id'

// 라우트(pathname)가 바뀔 때마다 page_view 1건 기록.
// 앱 어딘가에서 한 번만 호출하면 됨 (예: AppHeader).
export function usePageViewTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    void trackPageView({
      path: pathname,
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      referrer: document.referrer || undefined,
    })
  }, [pathname])
}
