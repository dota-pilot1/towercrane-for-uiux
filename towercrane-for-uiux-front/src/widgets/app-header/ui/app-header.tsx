import { useMemo, useState } from 'react'
import * as LucideIcons from 'lucide-react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { HeaderAuthButtons } from '../../../features/auth/ui/inline-auth-bar'
import { useLogout } from '../../../shared/api/auth'
import { useSessionStore } from '../../../shared/store/session-store'
import { HeaderPill } from '../../../shared/ui/header-pill'
import { ThemeSwitcher } from '../../../shared/ui/theme-switcher'
import { AppHeaderMobileNav } from './app-header-mobile-nav'
import { useMenus } from '../../../entities/menu/api/menu-api'
import { buildTree } from '../../../entities/menu/lib/build-tree'
import type { MenuItem } from '../../../entities/menu/model/types'

function sectionIdToPath(sectionId: string): string {
  const map: Record<string, string> = {
    prototype: '/prototype',
    challenge: '/study-diary',
    study_diary: '/study-diary',
    dev_challenge: '/dev-challenge',
    meeting: '/meeting',
    docu: '/docu',
    ai_methodology: '/ai-methodology',
    api_doc: '/api-doc',
    sql: '/sql',
    sql_user: '/sql/user',
    sql_personal: '/sql/personal',
    sql_examples: '/sql/examples',
    boards: '/boards',
    board_notice: '/boards/notice',
    board_inquiry: '/boards/inquiry',
    board_qna: '/boards/qna',
    board_free: '/boards/free',
    task: '/task',
    task_group: '/task',
    task_all: '/task',
    task_my: '/task/my',
    task_issues: '/issues',
    project_issues: '/project-issues',
    profile: '/profile',
    users: '/admin/users',
    menu_admin: '/admin/menu',
    readme_admin: '/admin/readme',
    admin_board_configs: '/admin/board-configs',
    admin_boards: '/admin/boards',
  }
  return map[sectionId] ?? '/prototype'
}

function getSectionIdFromPath(pathname: string): string {
  if (pathname.startsWith('/prototype')) return 'prototype'
  if (pathname.startsWith('/dev-challenge')) return 'dev_challenge'
  if (pathname.startsWith('/study-diary')) return 'study_diary'
  if (pathname.startsWith('/challenge')) return 'study_diary'
  if (pathname.startsWith('/meeting')) return 'meeting'
  if (pathname.startsWith('/docu')) return 'docu'
  if (pathname.startsWith('/ai-methodology')) return 'ai_methodology'
  if (pathname.startsWith('/api-doc')) return 'api_doc'
  if (pathname.startsWith('/sql/examples')) return 'sql_examples'
  if (pathname.startsWith('/sql/personal')) return 'sql_personal'
  if (pathname.startsWith('/sql/user')) return 'sql_user'
  if (pathname.startsWith('/sql')) return 'sql'
  if (pathname.startsWith('/boards/notice')) return 'board_notice'
  if (pathname.startsWith('/boards/inquiry')) return 'board_inquiry'
  if (pathname.startsWith('/boards/qna')) return 'board_qna'
  if (pathname.startsWith('/boards/free')) return 'board_free'
  if (pathname.startsWith('/boards')) return 'boards'
  if (pathname.startsWith('/task/my')) return 'task_my'
  if (pathname.startsWith('/task/users')) return 'task_all'
  if (pathname.startsWith('/project-issues')) return 'project_issues'
  if (pathname.startsWith('/task')) return 'task_all'
  if (pathname.startsWith('/issues')) return 'task_issues'
  if (pathname.startsWith('/profile')) return 'profile'
  if (pathname.startsWith('/admin/users')) return 'users'
  if (pathname.startsWith('/admin/menu')) return 'menu_admin'
  if (pathname.startsWith('/admin/readme')) return 'readme_admin'
  if (pathname.startsWith('/admin/board-configs')) return 'admin_board_configs'
  if (pathname.startsWith('/admin/boards')) return 'admin_boards'
  return 'prototype'
}

function normalizeSectionId(sectionId: string | null | undefined): string {
  if (sectionId === 'challenge' || sectionId === 'study_diary') return 'study_diary'
  if (sectionId === 'task') return 'task_all'
  return sectionId ?? ''
}

function getIcon(iconName: string | null): React.ElementType {
  if (!iconName) return LucideIcons.FileText
  const icons = LucideIcons as unknown as Record<string, React.ElementType>
  const Icon = icons[iconName]
  return Icon || LucideIcons.FileText
}

function NavDropdown({
  item,
  activeSection,
  handleNavigation,
}: {
  item: MenuItem
  activeSection: string
  handleNavigation: (id: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const Icon = getIcon(item.icon)

  const isActive =
    item.children.some((child) => normalizeSectionId(child.sectionId) === activeSection) ||
    normalizeSectionId(item.sectionId) === activeSection

  return (
    <div className="relative">
      <HeaderPill
        icon={Icon}
        variant={isActive ? 'active' : 'default'}
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        labelClassName="hidden sm:inline"
        trailingIcon={
          <LucideIcons.ChevronDown
            className={`size-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        }
      >
        {item.name}
      </HeaderPill>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-44 origin-top-left animate-in zoom-in rounded-md border border-surface-border bg-surface-raised p-1.5 shadow-2xl duration-200 fade-in">
          {item.children.map((child) => {
            const ChildIcon = getIcon(child.icon)
            return (
              <button
                key={child.id}
                onClick={() => {
                  if (child.sectionId) handleNavigation(child.sectionId)
                  setIsOpen(false)
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-[13px] transition-all ui-text-secondary hover:bg-surface-muted hover:ui-text-primary hover:scale-[1.02] active:scale-[0.98]"
              >
                <ChildIcon className="size-3.5" />
                {child.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AppHeader() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const activeSection = getSectionIdFromPath(pathname)

  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const userEmail = useSessionStore((state) => state.userEmail)
  const userName = useSessionStore((state) => state.userName)
  const userRole = useSessionStore((state) => state.userRole)
  const clearSession = useSessionStore((state) => state.clearSession)
  const logoutMutation = useLogout()

  const { data: flatMenus = [] } = useMenus()

  const menuTree = useMemo(() => {
    return buildTree(flatMenus, userRole).filter((item) => {
      if (item.sectionId === 'readme') return false
      if (!item.sectionId && item.children.length === 0) return false
      return true
    })
  }, [flatMenus, userRole])

  const handleNavigation = (sectionId: string) => {
    navigate({ to: sectionIdToPath(sectionId) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
    } finally {
      clearSession()
    }
    navigate({ to: '/login' })
  }

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-surface-border bg-surface-muted/95 px-2 py-2 shadow-sm backdrop-blur-md sm:px-4 sm:py-3">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <button
          type="button"
          className="shrink-0 text-left transition-transform hover:scale-[1.02] active:scale-[0.98]"
          onClick={() => handleNavigation('prototype')}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-sm bg-primary text-primary-foreground shadow-md shadow-primary/10">
              <span className="text-[13px] font-black tracking-tighter">TC</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-0.5">
                Towercrane
              </p>
              <p className="text-[14px] font-black leading-none text-foreground">
                Prototype Console
              </p>
            </div>
          </div>
        </button>

        <nav className="hidden min-w-0 flex-1 flex-wrap items-center justify-center gap-1.5 lg:flex">
          {menuTree.map((item) => {
            if (item.children && item.children.length > 0) {
              return (
                <NavDropdown
                  key={item.id}
                  item={item}
                  activeSection={activeSection}
                  handleNavigation={handleNavigation}
                />
              )
            }

            const Icon = getIcon(item.icon)
            return (
              <HeaderPill
                key={item.id}
                icon={Icon}
                variant={activeSection === normalizeSectionId(item.sectionId) ? 'active' : 'default'}
                onClick={() => item.sectionId && handleNavigation(item.sectionId)}
                labelClassName="hidden sm:inline"
              >
                {item.name}
              </HeaderPill>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
          <AppHeaderMobileNav
            menuTree={menuTree}
            activeSection={activeSection}
            pathname={pathname}
            onNavigate={handleNavigation}
          />
          <ThemeSwitcher />
          {isAuthenticated ? (
            <>
              <HeaderPill
                icon={LucideIcons.UserRound}
                variant={activeSection === 'profile' ? 'active' : 'static'}
                onClick={() => handleNavigation('profile')}
                labelClassName="hidden sm:inline"
                title="프로필"
              >
                {userName || userEmail}
              </HeaderPill>
              <button
                onClick={handleLogout}
                className="flex size-8 items-center justify-center rounded-sm border border-surface-border bg-surface-muted ui-text-secondary shadow-[0_1px_0_color-mix(in_srgb,var(--surface-border)_45%,transparent)] transition-all hover:bg-surface-strong hover:shadow-sm hover:scale-[1.05] active:scale-[0.95]"
                aria-label="로그아웃"
                title="로그아웃"
              >
                <LucideIcons.LogOut className="size-3.5" />
              </button>
            </>
          ) : (
            <HeaderAuthButtons />
          )}
        </div>
      </div>
    </header>
  )
}
