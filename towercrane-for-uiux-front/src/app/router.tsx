import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useNavigate,
  useRouterState,
  useSearch,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import { FileText, UserCog } from 'lucide-react'
import { Toaster } from 'sonner'

import { AppHeader } from '../widgets/app-header/ui/app-header'
import { TaskChatbotButton } from '../widgets/task-chatbot/ui/task-chatbot-button'
import { LoginPage } from '../pages/auth/ui/login-page'
import { WorkbenchPage } from '../pages/workbench/ui/workbench-page'
import { PrototypeEditPage } from '../pages/prototype-edit/ui/prototype-edit-page'
import { PrototypeWorkspaceHomePage } from '../pages/prototype-workspace/ui/prototype-workspace-home-page'
import { ChatbotBasicPage } from '../pages/chatbot/ui/chatbot-basic-page'
import { ChatbotStreamingPage } from '../pages/chatbot/ui/chatbot-streaming-page'
import { ChatbotHistoryPage } from '../pages/chatbot/ui/chatbot-history-page'
import { ChatbotFlowPage } from '../pages/chatbot/ui/chatbot-flow-page'
import { ChatbotFilesPage } from '../pages/chatbot/ui/chatbot-files-page'
import { ChatbotKnowledgePage } from '../pages/chatbot/ui/chatbot-knowledge-page'
import { ChatbotKnowledgeNoticePage } from '../pages/chatbot/ui/chatbot-knowledge-notice-page'
import { ChatbotKnowledgeFaqPage } from '../pages/chatbot/ui/chatbot-knowledge-faq-page'
import { ChatbotKnowledgeAiPage } from '../pages/chatbot/ui/chatbot-knowledge-ai-page'
import { ChatbotKnowledgeDevPage } from '../pages/chatbot/ui/chatbot-knowledge-dev-page'
import { ChatbotBasicGuidePage } from '../pages/chatbot/ui/chatbot-basic-guide-page'
import { ChatbotStreamingGuidePage } from '../pages/chatbot/ui/chatbot-streaming-guide-page'
import { ChatbotHistoryGuidePage } from '../pages/chatbot/ui/chatbot-history-guide-page'
import { ChatbotFilesGuidePage } from '../pages/chatbot/ui/chatbot-files-guide-page'
import { ChatbotKnowledgeGuidePage } from '../pages/chatbot/ui/chatbot-knowledge-guide-page'
import { ChatbotToolsPage } from '../pages/chatbot/ui/chatbot-tools-page'
import { ChatbotToolsGuidePage } from '../pages/chatbot/ui/chatbot-tools-guide-page'
import { ChatbotRealtimePage } from '../pages/chatbot/ui/chatbot-realtime-page'
import { ChatbotRealtimeGuidePage } from '../pages/chatbot/ui/chatbot-realtime-guide-page'
import { DocuPage } from '../pages/docu/ui/docu-page'
import { ReadmePage } from '../pages/readme/ui/readme-page'
import { MeetingPage } from '../pages/meeting/ui/meeting-page'
import { MeetingWorkspaceHomePage } from '../pages/meeting-workspace/ui/meeting-workspace-home-page'
import { DevManagementPage } from '../pages/dev-management/ui/dev-management-page'
import { DevMeetingMinutesPage } from '../pages/dev-meeting-minutes/ui/dev-meeting-minutes-page'
import { CodeReviewsPage } from '../pages/code-reviews/ui/code-reviews-page'
import { FeaturePlansPage } from '../pages/feature-plans/ui/feature-plans-page'
import { HomePage } from '../pages/home/ui/home-page'
import { AiMethodologyPage } from '../pages/ai-methodology/ui/ai-methodology-page'
import { AiEvaluationPage } from '../pages/ai-evaluation/ui/ai-evaluation-page'
import {
  MarketLecturesPage,
  MarketNotesPage,
  MarketPrototypesPage,
  MarketRecommendPage,
} from '../pages/dev-market/ui/dev-market-pages'
import {
  AnalysisConceptsPage,
  AnalysisDomainPage,
  AnalysisHiringPage,
  AnalysisTechDebtPage,
  AnalysisTrendsPage,
} from '../pages/dev-analysis/ui/dev-analysis-pages'
import { UsageStatsPage } from '../pages/usage-stats/ui/usage-stats-page'
import { AiUsageStatsPage } from '../pages/usage-stats/ui/ai-usage-stats-page'
import {
  EnglishDiaryPage,
  EnglishNewsPage,
  EnglishListeningPage,
  EnglishCharacterPage,
} from '../pages/english/ui/english-pages'
import { EnglishChatPage } from '../pages/english/ui/english-chat-page'
import { ApiDocPage } from '../pages/api-doc/ui/api-doc-page'
import { TaskPage } from '../pages/task/ui/task-page'
import { TaskDetailPage } from '../pages/task/ui/task-detail-page'
import { TaskWorkspaceHomePage } from '../pages/task-workspace/ui/task-workspace-home-page'
import { TaskFavoritesPage } from '../pages/task-favorites/ui/task-favorites-page'
import { PrototypeIssuesPage } from '../pages/prototype-issues/ui/prototype-issues-page'
import { ProjectIssuesPage } from '../pages/project-issues/ui/project-issues-page'
import { ProfilePage } from '../pages/profile/ui/profile-page'
import { MenuAdminPage } from '../pages/menu-admin/ui/menu-admin-page'
import { StudyDiaryPage } from '../pages/study-diary/ui/study-diary-page'
import { StudyDiaryPublicPage } from '../pages/study-diary/ui/study-diary-public-page'
import { StudyDiaryWorkspaceHomePage } from '../pages/study-diary/ui/study-diary-workspace-home-page'
import { DevChallengePage } from '../pages/dev-challenge/ui/dev-challenge-page'
import { DevChallengeWorkspaceHomePage } from '../pages/dev-challenge-workspace/ui/dev-challenge-workspace-home-page'
import { SqlPracticePage } from '../pages/sql-practice/ui/sql-practice-page'
import { SqlPracticeExamplesPage } from '../pages/sql-practice/ui/sql-practice-examples-page'
import { SqlNotesPage } from '../pages/sql-practice/ui/sql-notes-page'
import { SqlNoteDetailPage } from '../pages/sql-practice/ui/sql-note-detail-page'
import { SqlPublicNotePage } from '../pages/sql-practice/ui/sql-public-note-page'
import { SqlPublicPersonalPracticePage } from '../pages/sql-practice/ui/sql-public-personal-practice-page'
import { SqlUserPracticePage } from '../pages/sql-practice/ui/sql-user-practice-page'
import { SqlTeamPracticePage } from '../pages/sql-practice/ui/sql-team-practice-page'
import { SqlTeamWorkspacePage } from '../pages/sql-practice/ui/sql-team-workspace-page'
import { BoardHomePage } from '../pages/board/ui/board-home-page'
import { BoardListPage } from '../pages/board/ui/board-list-page'
import { BoardDetailPage } from '../pages/board/ui/board-detail-page'
import { AdminBoardConfigPage } from '../pages/board-admin/ui/admin-board-config-page'
import { AdminBoardManagementPage } from '../pages/board-admin/ui/admin-board-management-page'
import { ChatbotMonitoringPage } from '../pages/chatbot-monitoring/ui/chatbot-monitoring-page'
import { useSessionStore } from '../shared/store/session-store'
import { useCurrentUser } from '../shared/api/auth'
import { useUsersList } from '../shared/api/users'
import { useUiStore } from '../shared/store/ui-store'
import { Card } from '../shared/ui/card'

// ─── Root ───────────────────────────────────────────────────────────────────

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster position="top-center" richColors />
    </>
  ),
})

// ─── /login ─────────────────────────────────────────────────────────────────

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginRoute,
})

function LoginRoute() {
  const hasHydrated = useSessionStore((s) => s.hasHydrated)
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)
  const navigate = useNavigate()

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      navigate({ to: '/prototype', replace: true })
    }
  }, [hasHydrated, isAuthenticated, navigate])

  return (
    <div className="min-h-screen bg-[color:color-mix(in_srgb,var(--status-online)_5%,var(--background))] ui-text-primary">
      <LoginPage />
    </div>
  )
}

const publicSqlNoteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/share/sql-notes/$token',
  component: SqlPublicNotePage,
})

const publicSqlPersonalPracticeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/share/sql/personal/$token',
  component: SqlPublicPersonalPracticePage,
})

// ─── Semi-public layout (no auth redirect, shows header when logged in) ─────

const semiPublicLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_semi-public',
  component: SemiPublicLayout,
})

function SemiPublicLayout() {
  const hasHydrated = useSessionStore((s) => s.hasHydrated)
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)
  const token = useSessionStore((s) => s.token)
  const syncUser = useSessionStore((s) => s.syncUser)
  const clearSession = useSessionStore((s) => s.clearSession)
  const themeColor = useUiStore((s) => s.themeColor)
  const currentUserQuery = useCurrentUser(hasHydrated && token.length > 0)

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      themeColor === 'light' ? 'default' : themeColor,
    )
  }, [themeColor])

  useEffect(() => {
    if (currentUserQuery.data) syncUser(currentUserQuery.data)
  }, [currentUserQuery.data, syncUser])

  useEffect(() => {
    if (currentUserQuery.error) clearSession()
  }, [currentUserQuery.error, clearSession])

  if (!hasHydrated) return null

  return (
    <div className="min-h-screen bg-background">
      {isAuthenticated && <AppHeader />}
      <main className="w-full min-w-0 px-4 pb-10 pt-5 sm:px-5 lg:px-6">
        <Outlet />
      </main>
    </div>
  )
}

// ─── App layout (auth guard) ─────────────────────────────────────────────────

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_app',
  component: AppLayout,
})

function AppLayout() {
  const hasHydrated = useSessionStore((s) => s.hasHydrated)
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)
  const token = useSessionStore((s) => s.token)
  const syncUser = useSessionStore((s) => s.syncUser)
  const clearSession = useSessionStore((s) => s.clearSession)
  const themeColor = useUiStore((s) => s.themeColor)
  const navigate = useNavigate()
  const currentUserQuery = useCurrentUser(hasHydrated && token.length > 0)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      themeColor === 'light' ? 'default' : themeColor,
    )
  }, [themeColor])

  useEffect(() => {
    if (!hasHydrated) return
    if (!isAuthenticated) {
      navigate({ to: '/login', replace: true })
    }
  }, [hasHydrated, isAuthenticated, navigate])

  useEffect(() => {
    if (currentUserQuery.data) syncUser(currentUserQuery.data)
  }, [currentUserQuery.data, syncUser])

  useEffect(() => {
    if (currentUserQuery.error) clearSession()
  }, [currentUserQuery.error, clearSession])

  if (!hasHydrated || !isAuthenticated) return null

  const isTaskArea = pathname === '/task' || pathname.startsWith('/task/')

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="w-full min-w-0 px-4 pb-10 pt-5 sm:px-5 lg:px-6">
        <Outlet />
      </main>
      {isTaskArea && <TaskChatbotButton />}
    </div>
  )
}

// ─── / → WorkbenchPage (useAdminShell handles redirect to first category) ────

const indexRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/',
  component: HomePage,
})

// ─── /prototype → WorkbenchPage (useAdminShell handles redirect to first category) ──

const prototypeIndexRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/prototype',
  component: PrototypeWorkspaceHomePage,
})

const prototypeWorkspaceRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/prototype/workspaces/$workspaceId',
  component: WorkbenchPage,
})

const prototypeWorkspaceCategoryRoute = createRoute({
  getParentRoute: () => semiPublicLayoutRoute,
  path: '/prototype/workspaces/$workspaceId/categories/$categoryId',
  validateSearch: (search: Record<string, unknown>) => ({
    prototypeId:
      typeof search.prototypeId === 'string' ? search.prototypeId : undefined,
  }),
  component: WorkbenchPage,
})

const prototypeWorkspaceEditRoute = createRoute({
  getParentRoute: () => semiPublicLayoutRoute,
  path: '/prototype/workspaces/$workspaceId/categories/$categoryId/prototypes/$prototypeId/edit',
  component: PrototypeEditPage,
})

// ─── /prototype/$categoryId ──────────────────────────────────────────────────

export const prototypeCategoryRoute = createRoute({
  getParentRoute: () => semiPublicLayoutRoute,
  path: '/prototype/$categoryId',
  validateSearch: (search: Record<string, unknown>) => ({
    prototypeId:
      typeof search.prototypeId === 'string' ? search.prototypeId : undefined,
  }),
  component: WorkbenchPage,
})

const prototypeEditRoute = createRoute({
  getParentRoute: () => semiPublicLayoutRoute,
  path: '/prototype/$categoryId/prototypes/$prototypeId/edit',
  component: PrototypeEditPage,
})

// ─── /study-diary ────────────────────────────────────────────────────────────

const studyDiaryRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/study-diary',
  component: StudyDiaryWorkspaceHomePage,
})

const studyDiaryWorkspaceRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/study-diary/workspaces/$workspaceId',
  validateSearch: (search: Record<string, unknown>) => ({
    cat: typeof search.cat === 'string' ? search.cat : undefined,
    sec: typeof search.sec === 'string' ? search.sec : undefined,
  }),
  component: StudyDiaryPage,
})

const studyDiaryPublicRoute = createRoute({
  getParentRoute: () => semiPublicLayoutRoute,
  path: '/study-diary/$userId',
  component: StudyDiaryPublicPage,
})

const studyDiaryPublicWorkspaceRoute = createRoute({
  getParentRoute: () => semiPublicLayoutRoute,
  path: '/study-diary/public/$workspaceId',
  component: StudyDiaryPublicPage,
})

// ─── /dev-challenge ──────────────────────────────────────────────────────────

const devChallengeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dev-challenge',
  validateSearch: (search: Record<string, unknown>) => ({
    cat: typeof search.cat === 'string' ? search.cat : undefined,
    sec: typeof search.sec === 'string' ? search.sec : undefined,
    asgn: typeof search.asgn === 'string' ? search.asgn : undefined,
  }),
  component: DevChallengeIndexRoute,
})

function DevChallengeIndexRoute() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as {
    cat?: string
    sec?: string
    asgn?: string
  }

  useEffect(() => {
    if (!search.cat && !search.sec && !search.asgn) return
    navigate({
      to: '/dev-challenge/workspaces/$workspaceId',
      params: { workspaceId: 'dev-challenge-workspace-default' },
      search,
      replace: true,
    })
  }, [navigate, search])

  if (search.cat || search.sec || search.asgn) return null
  return <DevChallengeWorkspaceHomePage />
}

const devChallengeWorkspaceRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dev-challenge/workspaces/$workspaceId',
  validateSearch: (search: Record<string, unknown>) => ({
    cat: typeof search.cat === 'string' ? search.cat : undefined,
    sec: typeof search.sec === 'string' ? search.sec : undefined,
    asgn: typeof search.asgn === 'string' ? search.asgn : undefined,
  }),
  component: DevChallengeWorkspaceRoute,
})

function DevChallengeWorkspaceRoute() {
  const { workspaceId } = devChallengeWorkspaceRoute.useParams()
  return <DevChallengePage workspaceId={workspaceId} />
}

// ─── Legacy redirects → /study-diary ─────────────────────────────────────────

const legacyChallengeRedirectRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/challenge',
  component: StudyDiaryRedirect,
})

// ─── /chatbot/* ──────────────────────────────────────────────────────────────

const chatbotRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chatbot',
  component: ChatbotBasicPage,
})

const chatbotStreamingRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chatbot/streaming',
  component: ChatbotStreamingPage,
})

const chatbotHistoryRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chatbot/history',
  component: ChatbotHistoryPage,
})

const chatbotFlowRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chatbot/flow',
  component: ChatbotFlowPage,
})

const chatbotFilesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chatbot/files',
  component: ChatbotFilesPage,
})

const chatbotKnowledgeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chatbot/knowledge',
  component: ChatbotKnowledgePage,
})

const chatbotBasicGuideRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chatbot/guide',
  component: ChatbotBasicGuidePage,
})

const chatbotStreamingGuideRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chatbot/streaming/guide',
  component: ChatbotStreamingGuidePage,
})

const chatbotHistoryGuideRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chatbot/history/guide',
  component: ChatbotHistoryGuidePage,
})

const chatbotFilesGuideRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chatbot/files/guide',
  component: ChatbotFilesGuidePage,
})

const chatbotKnowledgeGuideRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chatbot/knowledge/guide',
  component: ChatbotKnowledgeGuidePage,
})

const chatbotToolsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chatbot/tools',
  component: ChatbotToolsPage,
})

const chatbotToolsGuideRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chatbot/tools/guide',
  component: ChatbotToolsGuidePage,
})

const chatbotRealtimeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chatbot/realtime',
  component: ChatbotRealtimePage,
})

const chatbotRealtimeGuideRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chatbot/realtime/guide',
  component: ChatbotRealtimeGuidePage,
})

const chatbotKnowledgeNoticeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chatbot/knowledge/notice',
  component: ChatbotKnowledgeNoticePage,
})

const chatbotKnowledgeFaqRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chatbot/knowledge/faq',
  component: ChatbotKnowledgeFaqPage,
})

const chatbotKnowledgeAiRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chatbot/knowledge/ai',
  component: ChatbotKnowledgeAiPage,
})

const chatbotKnowledgeDevRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chatbot/knowledge/dev',
  component: ChatbotKnowledgeDevPage,
})

function StudyDiaryRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate({ to: '/study-diary', replace: true })
  }, [navigate])

  return null
}

// ─── /meeting ────────────────────────────────────────────────────────────────

const meetingRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/meeting',
  component: MeetingWorkspaceHomePage,
})

const meetingWorkspaceRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/meeting/workspaces/$workspaceId',
  component: MeetingWorkspaceRoute,
})

function MeetingWorkspaceRoute() {
  const { workspaceId } = meetingWorkspaceRoute.useParams()
  return <MeetingPage workspaceId={workspaceId} />
}

// ─── /dev-management ───────────────────────────────────────────────────────

const devManagementRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dev-management',
  component: DevManagementPage,
})

const devMeetingMinutesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dev-meeting-minutes',
  component: DevMeetingMinutesPage,
})

const devMeetingMinutesDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dev-meeting-minutes/$minutesId',
  component: DevMeetingMinutesDetailRoute,
})

function DevMeetingMinutesDetailRoute() {
  const { minutesId } = devMeetingMinutesDetailRoute.useParams()
  return <DevMeetingMinutesPage minutesId={minutesId} />
}

const codeReviewsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/code-reviews',
  component: CodeReviewsPage,
})

const codeReviewDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/code-reviews/$reviewId',
  component: CodeReviewDetailRoute,
})

function CodeReviewDetailRoute() {
  const { reviewId } = codeReviewDetailRoute.useParams()
  return <CodeReviewsPage reviewId={reviewId} />
}

const featurePlansRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/feature-plans',
  component: FeaturePlansPage,
})

const featurePlanDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/feature-plans/$planId',
  component: FeaturePlanDetailRoute,
})

function FeaturePlanDetailRoute() {
  const { planId } = featurePlanDetailRoute.useParams()
  return <FeaturePlansPage planId={planId} />
}

// ─── /docu ───────────────────────────────────────────────────────────────────

export const docuRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/docu',
  validateSearch: (search: Record<string, unknown>) => ({
    prototypeId:
      typeof search.prototypeId === 'string' ? search.prototypeId : undefined,
  }),
  component: DocuPage,
})

// ─── /readme ──────────────────────────────────────────────────────────────────

const readmeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/readme',
  component: ReadmePage,
})

// ─── /ai-methodology ─────────────────────────────────────────────────────────

const aiMethodologyRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/ai-methodology',
  component: AiMethodologyPage,
})

// ─── /ai-evaluation ──────────────────────────────────────────────────────────

const aiEvaluationRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/ai-evaluation',
  component: AiEvaluationPage,
})

// ─── /usage-stats (이용 통계) ──────────────────────────────────────────────────

const usageStatsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/usage-stats',
  component: UsageStatsPage,
})

const aiUsageStatsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/usage-stats/ai',
  component: AiUsageStatsPage,
})

// ─── /english (영어 학습 코너) ─────────────────────────────────────────────────

const marketLecturesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dev-market/lectures',
  component: MarketLecturesPage,
})

const marketRecommendRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dev-market/recommend',
  component: MarketRecommendPage,
})

const marketNotesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dev-market/notes',
  component: MarketNotesPage,
})

const marketPrototypesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dev-market/prototypes',
  component: MarketPrototypesPage,
})

const analysisTechDebtRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dev-analysis/tech-debt',
  component: AnalysisTechDebtPage,
})

const analysisTrendsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dev-analysis/trends',
  component: AnalysisTrendsPage,
})

const analysisHiringRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dev-analysis/hiring',
  component: AnalysisHiringPage,
})

const analysisDomainRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dev-analysis/domain',
  component: AnalysisDomainPage,
})

const analysisConceptsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dev-analysis/concepts',
  component: AnalysisConceptsPage,
})

const englishChatRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/english/chat',
  component: EnglishChatPage,
})

const englishDiaryRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/english/diary',
  component: EnglishDiaryPage,
})

const englishNewsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/english/news',
  component: EnglishNewsPage,
})

const englishListeningRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/english/listening',
  component: EnglishListeningPage,
})

const englishCharacterRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/english/character',
  component: EnglishCharacterPage,
})

// ─── /api-doc ────────────────────────────────────────────────────────────────

const apiDocRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/api-doc',
  component: ApiDocPage,
})

// ─── /sql ───────────────────────────────────────────────────────────────────

const sqlPracticeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/sql',
  validateSearch: (search: Record<string, unknown>) => ({
    example: typeof search.example === 'string' ? search.example : undefined,
  }),
  component: SqlPracticePage,
})

const sqlUserPracticeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/sql/user',
  component: SqlUserPracticeRedirect,
})

function SqlUserPracticeRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate({ to: '/sql/team', replace: true })
  }, [navigate])

  return null
}

const sqlPersonalPracticeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/sql/personal',
  component: () => <SqlUserPracticePage mode="personal" />,
})

const sqlTeamPracticeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/sql/team',
  component: SqlTeamPracticePage,
})

const sqlTeamWorkspaceRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/sql/team/workspaces/$workspaceId',
  component: SqlTeamWorkspacePage,
})

const sqlPracticeExamplesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/sql/examples',
  component: SqlPracticeExamplesPage,
})

const sqlNotesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/sql/notes',
  component: SqlNotesPage,
})

const sqlNoteDetailRoute = createRoute({
  getParentRoute: () => semiPublicLayoutRoute,
  path: '/sql/notes/$noteId',
  component: SqlNoteDetailPage,
})

// ─── /boards ────────────────────────────────────────────────────────────────

const boardsHomeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/boards',
  component: BoardHomePage,
})

const boardListRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/boards/$code',
  component: BoardListPage,
})

const boardDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/boards/$code/$boardId',
  component: BoardDetailPage,
})

// ─── /task ───────────────────────────────────────────────────────────────────

const taskRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/task',
  component: TaskWorkspaceHomePage,
})

const taskWorkspaceRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/task/workspaces/$workspaceId',
  component: TaskWorkspaceRoute,
})

function TaskWorkspaceRoute() {
  const { workspaceId } = taskWorkspaceRoute.useParams()
  return <TaskPage scopeMode="all" workspaceId={workspaceId} />
}

const myTaskRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/task/my',
  component: () => <TaskWorkspaceHomePage scopeMode="my" />,
})

const myTaskWorkspaceRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/task/my/workspaces/$workspaceId',
  component: MyTaskWorkspaceRoute,
})

const taskFavoritesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/task/favorites',
  component: TaskFavoritesPage,
})

const taskDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/task/$taskId',
  component: TaskDetailPage,
})

const userTaskRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/task/users/$userId',
  component: UserTaskRoute,
})

function UserTaskRoute() {
  const { userId } = userTaskRoute.useParams()
  return <TaskPage scopeMode="user" targetUserId={userId} />
}

function MyTaskWorkspaceRoute() {
  const { workspaceId } = myTaskWorkspaceRoute.useParams()
  return <TaskPage scopeMode="my" workspaceId={workspaceId} />
}

// ─── /issues ─────────────────────────────────────────────────────────────────

const prototypeIssuesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/issues',
  validateSearch: (search: Record<string, unknown>) => ({
    prototypeId:
      typeof search.prototypeId === 'string' ? search.prototypeId : undefined,
  }),
  component: PrototypeIssuesPage,
})

// ─── /project-issues ───────────────────────────────────────────────────────

const projectIssuesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/project-issues',
  validateSearch: (search: Record<string, unknown>) => ({
    workspaceId:
      typeof search.workspaceId === 'string' ? search.workspaceId : undefined,
    projectId:
      typeof search.projectId === 'string' ? search.projectId : undefined,
  }),
  component: ProjectIssuesPage,
})

// ─── /profile ────────────────────────────────────────────────────────────────

const profileRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/profile',
  component: ProfileRoute,
})

function ProfileRoute() {
  const token = useSessionStore((s) => s.token)
  const hasHydrated = useSessionStore((s) => s.hasHydrated)
  const currentUserQuery = useCurrentUser(hasHydrated && token.length > 0)
  return <ProfilePage user={currentUserQuery.data} />
}

// ─── /admin/users ────────────────────────────────────────────────────────────

const adminUsersRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/admin/users',
  component: AdminUsersRoute,
})

function AdminUsersRoute() {
  const usersListQuery = useUsersList()
  const users = usersListQuery.data || []

  return (
    <Card className="rounded-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="ui-icon-button-brand rounded-md p-2.5">
            <UserCog className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold ui-text-primary">유저 관리</h2>
            <p className="text-xs ui-text-secondary">
              시스템 사용자 권한 및 계정을 관리합니다.
            </p>
          </div>
        </div>
        <div className="text-[10px] ui-text-muted uppercase tracking-widest font-bold">
          Total {users.length} Users
        </div>
      </div>

      <div className="ui-panel-soft overflow-hidden rounded-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="ui-panel-soft border-b">
              <th className="px-6 py-4 text-[11px] font-bold ui-text-secondary uppercase tracking-widest">
                Name
              </th>
              <th className="px-6 py-4 text-[11px] font-bold ui-text-secondary uppercase tracking-widest">
                Email
              </th>
              <th className="px-6 py-4 text-[11px] font-bold ui-text-secondary uppercase tracking-widest">
                Role
              </th>
              <th className="px-6 py-4 text-[11px] font-bold ui-text-secondary uppercase tracking-widest">
                Joined
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-border-soft)]">
            {usersListQuery.isLoading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-20 text-center ui-text-muted"
                >
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-20 text-center ui-text-muted"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  className="transition-colors hover:bg-(--surface-muted)"
                >
                  <td className="px-6 py-4 text-sm font-medium ui-text-primary">
                    {u.name}
                  </td>
                  <td className="px-6 py-4 text-sm ui-text-secondary">
                    {u.email}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border ${
                        u.role === 'admin'
                          ? 'border-brand-border bg-brand-glass text-brand-primary'
                          : 'border-[var(--surface-border-soft)] bg-[var(--surface-muted)] ui-text-secondary'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm ui-text-muted">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ─── /admin/menu ─────────────────────────────────────────────────────────────

const adminMenuRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/admin/menu',
  component: MenuAdminPage,
})

// ─── /admin/readme ───────────────────────────────────────────────────────────

const adminReadmeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/admin/readme',
  component: () => (
    <Card className="rounded-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="ui-icon-button-brand rounded-md p-2.5">
          <FileText className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold ui-text-primary">README 관리</h2>
          <p className="text-xs ui-text-secondary">
            프로젝트 문서 및 가이드를 관리합니다.
          </p>
        </div>
      </div>
      <div className="rounded-md border border-dashed border-[var(--surface-border-soft)] bg-[var(--surface-muted)] py-16 text-center">
        <p className="ui-text-muted text-sm">
          README 편집 기능이 곧 구현될 예정입니다.
        </p>
      </div>
    </Card>
  ),
})

const adminBoardConfigsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/admin/board-configs',
  component: AdminBoardConfigPage,
})

const adminBoardsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/admin/boards',
  component: AdminBoardManagementPage,
})

const chatbotMonitoringRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/admin/chatbot-monitoring',
  component: ChatbotMonitoringPage,
})

// ─── Router ──────────────────────────────────────────────────────────────────

export const router = createRouter({
  routeTree: rootRoute.addChildren([
    loginRoute,
    publicSqlNoteRoute,
    publicSqlPersonalPracticeRoute,
    semiPublicLayoutRoute.addChildren([
      prototypeWorkspaceEditRoute,
      prototypeWorkspaceCategoryRoute,
      prototypeEditRoute,
      prototypeCategoryRoute,
      sqlNoteDetailRoute,
      studyDiaryPublicWorkspaceRoute,
      studyDiaryPublicRoute,
    ]),
    appLayoutRoute.addChildren([
      indexRoute,
      prototypeIndexRoute,
      prototypeWorkspaceRoute,
      studyDiaryRoute,
      studyDiaryWorkspaceRoute,
      devChallengeRoute,
      devChallengeWorkspaceRoute,
      legacyChallengeRedirectRoute,
      chatbotRoute,
      chatbotStreamingRoute,
      chatbotHistoryRoute,
      chatbotFlowRoute,
      chatbotFilesRoute,
      chatbotKnowledgeRoute,
      chatbotKnowledgeNoticeRoute,
      chatbotKnowledgeFaqRoute,
      chatbotKnowledgeAiRoute,
      chatbotKnowledgeDevRoute,
      chatbotBasicGuideRoute,
      chatbotStreamingGuideRoute,
      chatbotHistoryGuideRoute,
      chatbotFilesGuideRoute,
      chatbotKnowledgeGuideRoute,
      chatbotToolsRoute,
      chatbotToolsGuideRoute,
      chatbotRealtimeRoute,
      chatbotRealtimeGuideRoute,
      meetingRoute,
      meetingWorkspaceRoute,
      devManagementRoute,
      devMeetingMinutesRoute,
      devMeetingMinutesDetailRoute,
      codeReviewsRoute,
      codeReviewDetailRoute,
      featurePlansRoute,
      featurePlanDetailRoute,
      docuRoute,
      readmeRoute,
      aiMethodologyRoute,
      aiEvaluationRoute,
      usageStatsRoute,
      aiUsageStatsRoute,
      marketLecturesRoute,
      marketRecommendRoute,
      marketNotesRoute,
      marketPrototypesRoute,
      analysisTechDebtRoute,
      analysisTrendsRoute,
      analysisHiringRoute,
      analysisDomainRoute,
      analysisConceptsRoute,
      englishChatRoute,
      englishDiaryRoute,
      englishNewsRoute,
      englishListeningRoute,
      englishCharacterRoute,
      apiDocRoute,
      sqlPracticeRoute,
      sqlUserPracticeRoute,
      sqlPersonalPracticeRoute,
      sqlTeamPracticeRoute,
      sqlTeamWorkspaceRoute,
      sqlPracticeExamplesRoute,
      sqlNotesRoute,
      boardsHomeRoute,
      boardListRoute,
      boardDetailRoute,
      taskRoute,
      taskWorkspaceRoute,
      myTaskRoute,
      myTaskWorkspaceRoute,
      taskFavoritesRoute,
      taskDetailRoute,
      userTaskRoute,
      prototypeIssuesRoute,
      projectIssuesRoute,
      profileRoute,
      adminUsersRoute,
      adminMenuRoute,
      adminReadmeRoute,
      adminBoardConfigsRoute,
      adminBoardsRoute,
      chatbotMonitoringRoute,
    ]),
  ]),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
