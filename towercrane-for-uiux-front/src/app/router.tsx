import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useNavigate,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import { FileText, UserCog } from 'lucide-react'
import { Toaster } from 'sonner'

import { AppHeader } from '../widgets/app-header/ui/app-header'
import { LoginPage } from '../pages/auth/ui/login-page'
import { WorkbenchPage } from '../pages/workbench/ui/workbench-page'
import { DocuPage } from '../pages/docu/ui/docu-page'
import { MeetingPage } from '../pages/meeting/ui/meeting-page'
import { AiMethodologyPage } from '../pages/ai-methodology/ui/ai-methodology-page'
import { AiEvaluationPage } from '../pages/ai-evaluation/ui/ai-evaluation-page'
import { ApiDocPage } from '../pages/api-doc/ui/api-doc-page'
import { TaskPage } from '../pages/task/ui/task-page'
import { PrototypeIssuesPage } from '../pages/prototype-issues/ui/prototype-issues-page'
import { ProjectIssuesPage } from '../pages/project-issues/ui/project-issues-page'
import { ProfilePage } from '../pages/profile/ui/profile-page'
import { MenuAdminPage } from '../pages/menu-admin/ui/menu-admin-page'
import { StudyDiaryPage } from '../pages/study-diary/ui/study-diary-page'
import { StudyDiaryPublicPage } from '../pages/study-diary/ui/study-diary-public-page'
import { DevChallengePage } from '../pages/dev-challenge/ui/dev-challenge-page'
import { SqlPracticePage } from '../pages/sql-practice/ui/sql-practice-page'
import { SqlPracticeExamplesPage } from '../pages/sql-practice/ui/sql-practice-examples-page'
import { SqlNotesPage } from '../pages/sql-practice/ui/sql-notes-page'
import { SqlNoteDetailPage } from '../pages/sql-practice/ui/sql-note-detail-page'
import { SqlPublicNotePage } from '../pages/sql-practice/ui/sql-public-note-page'
import { SqlPublicPersonalPracticePage } from '../pages/sql-practice/ui/sql-public-personal-practice-page'
import { SqlUserPracticePage } from '../pages/sql-practice/ui/sql-user-practice-page'
import { BoardHomePage } from '../pages/board/ui/board-home-page'
import { BoardListPage } from '../pages/board/ui/board-list-page'
import { BoardDetailPage } from '../pages/board/ui/board-detail-page'
import { AdminBoardConfigPage } from '../pages/board-admin/ui/admin-board-config-page'
import { AdminBoardManagementPage } from '../pages/board-admin/ui/admin-board-management-page'
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
    <div className="min-h-screen bg-background ui-text-primary">
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="w-full min-w-0 px-4 pb-10 pt-5 sm:px-5 lg:px-6">
        <Outlet />
      </main>
    </div>
  )
}

// ─── / → WorkbenchPage (useAdminShell handles redirect to first category) ────

const indexRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/',
  component: WorkbenchPage,
})

// ─── /prototype → WorkbenchPage (useAdminShell handles redirect to first category) ──

const prototypeIndexRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/prototype',
  component: WorkbenchPage,
})

// ─── /prototype/$categoryId ──────────────────────────────────────────────────

export const prototypeCategoryRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/prototype/$categoryId',
  validateSearch: (search: Record<string, unknown>) => ({
    prototypeId:
      typeof search.prototypeId === 'string' ? search.prototypeId : undefined,
  }),
  component: WorkbenchPage,
})

// ─── /study-diary ────────────────────────────────────────────────────────────

const studyDiaryRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/study-diary',
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

// ─── /dev-challenge ──────────────────────────────────────────────────────────

const devChallengeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dev-challenge',
  validateSearch: (search: Record<string, unknown>) => ({
    cat: typeof search.cat === 'string' ? search.cat : undefined,
    sec: typeof search.sec === 'string' ? search.sec : undefined,
    asgn: typeof search.asgn === 'string' ? search.asgn : undefined,
  }),
  component: DevChallengePage,
})

// ─── Legacy redirects → /study-diary ─────────────────────────────────────────

const legacyChallengeRedirectRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/challenge',
  component: StudyDiaryRedirect,
})

const chatbotRedirectRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chatbot',
  component: StudyDiaryRedirect,
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
  component: MeetingPage,
})

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
  component: SqlPracticePage,
})

const sqlUserPracticeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/sql/user',
  component: () => <SqlUserPracticePage mode="user" />,
})

const sqlPersonalPracticeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/sql/personal',
  component: () => <SqlUserPracticePage mode="personal" />,
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
  component: () => <TaskPage scopeMode="all" />,
})

const myTaskRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/task/my',
  component: () => <TaskPage scopeMode="my" />,
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
                  className="transition-colors hover:bg-[var(--surface-muted)]"
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

// ─── Router ──────────────────────────────────────────────────────────────────

export const router = createRouter({
  routeTree: rootRoute.addChildren([
    loginRoute,
    publicSqlNoteRoute,
    publicSqlPersonalPracticeRoute,
    semiPublicLayoutRoute.addChildren([
      sqlNoteDetailRoute,
      studyDiaryPublicRoute,
    ]),
    appLayoutRoute.addChildren([
      indexRoute,
      prototypeIndexRoute,
      prototypeCategoryRoute,
      studyDiaryRoute,
      devChallengeRoute,
      legacyChallengeRedirectRoute,
      chatbotRedirectRoute,
      meetingRoute,
      docuRoute,
      aiMethodologyRoute,
      aiEvaluationRoute,
      apiDocRoute,
      sqlPracticeRoute,
      sqlUserPracticeRoute,
      sqlPersonalPracticeRoute,
      sqlPracticeExamplesRoute,
      sqlNotesRoute,
      boardsHomeRoute,
      boardListRoute,
      boardDetailRoute,
      taskRoute,
      myTaskRoute,
      userTaskRoute,
      prototypeIssuesRoute,
      projectIssuesRoute,
      profileRoute,
      adminUsersRoute,
      adminMenuRoute,
      adminReadmeRoute,
      adminBoardConfigsRoute,
      adminBoardsRoute,
    ]),
  ]),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
