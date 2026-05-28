import { type ElementType, useMemo, useRef, useState } from 'react'
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
    dev_study: '/dev-challenge',
    challenge: '/study-diary',
    study_diary: '/study-diary',
    dev_challenge: '/dev-challenge',
    meeting: '/meeting',
    dev_management: '/dev-management',
    dev_management_chat: '/dev-management',
    dev_meeting_minutes: '/dev-meeting-minutes',
    code_reviews: '/code-reviews',
    feature_plans: '/feature-plans',
    docu: '/docu',
    knowledge_channel: '/chatbot/knowledge',
    knowledge_notice: '/chatbot/knowledge/notice',
    knowledge_faq: '/chatbot/knowledge/faq',
    knowledge_ai: '/chatbot/knowledge/ai',
    knowledge_dev: '/chatbot/knowledge/dev',
    ai_service_group: '/ai-service-request',
    ai_service_request: '/ai-service-request',
    ai_service_my: '/ai-service-request/my',
    ai_service_admin: '/admin/ai-service-requests',
    ai_service_monitor: '/admin/ai-monitoring',
    ai_evaluation: '/ai-evaluation',
    api_doc: '/api-doc',
    sql: '/sql',
    sql_user: '/sql/team',
    sql_personal: '/sql/personal',
    sql_team: '/sql/team',
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
    chatbot_monitoring: '/admin/chatbot-monitoring',
    chatbot_pilot: '/chatbot',
    chatbot_basic: '/chatbot',
    chatbot_streaming: '/chatbot/streaming',
    chatbot_history: '/chatbot/history',
    chatbot_flow: '/chatbot/flow',
    chatbot_files: '/chatbot/files',
    chatbot_knowledge: '/chatbot/knowledge',
    chatbot_tools: '/chatbot/tools',
    chatbot_realtime: '/chatbot/realtime',
    chatbot_basic_guide: '/chatbot/guide',
    chatbot_streaming_guide: '/chatbot/streaming/guide',
    chatbot_history_guide: '/chatbot/history/guide',
    chatbot_files_guide: '/chatbot/files/guide',
    chatbot_knowledge_guide: '/chatbot/knowledge/guide',
    chatbot_tools_guide: '/chatbot/tools/guide',
    chatbot_realtime_guide: '/chatbot/realtime/guide',
  }
  return map[sectionId] ?? '/prototype'
}

function getSectionIdFromPath(pathname: string): string {
  if (pathname.startsWith('/prototype')) return 'prototype'
  if (pathname.startsWith('/dev-challenge')) return 'dev_challenge'
  if (pathname.startsWith('/study-diary')) return 'study_diary'
  if (pathname.startsWith('/challenge')) return 'study_diary'
  if (pathname.startsWith('/meeting')) return 'meeting'
  if (pathname.startsWith('/dev-meeting-minutes')) return 'dev_meeting_minutes'
  if (pathname.startsWith('/code-reviews')) return 'code_reviews'
  if (pathname.startsWith('/feature-plans')) return 'feature_plans'
  if (pathname.startsWith('/dev-management')) return 'dev_management_chat'
  if (pathname.startsWith('/docu')) return 'docu'
  if (pathname.startsWith('/ai-service-request/my')) return 'ai_service_my'
  if (pathname.startsWith('/ai-service-request')) return 'ai_service_request'
  if (pathname.startsWith('/admin/ai-service-requests')) return 'ai_service_admin'
  if (pathname.startsWith('/admin/ai-monitoring')) return 'ai_service_monitor'
  if (pathname.startsWith('/ai-evaluation')) return 'ai_evaluation'
  if (pathname.startsWith('/api-doc')) return 'api_doc'
  if (pathname.startsWith('/sql/examples')) return 'sql_examples'
  if (pathname.startsWith('/sql/team')) return 'sql_team'
  if (pathname.startsWith('/sql/personal')) return 'sql_personal'
  if (pathname.startsWith('/sql/user')) return 'sql_team'
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
  if (pathname.startsWith('/admin/chatbot-monitoring')) return 'chatbot_monitoring'
  if (pathname.startsWith('/admin/users')) return 'users'
  if (pathname.startsWith('/admin/menu')) return 'menu_admin'
  if (pathname.startsWith('/admin/readme')) return 'readme_admin'
  if (pathname.startsWith('/admin/board-configs')) return 'admin_board_configs'
  if (pathname.startsWith('/admin/boards')) return 'admin_boards'
  if (pathname.startsWith('/chatbot/streaming')) return 'chatbot_streaming'
  if (pathname.startsWith('/chatbot/history')) return 'chatbot_history'
  if (pathname.startsWith('/chatbot/flow')) return 'chatbot_flow'
  if (pathname.startsWith('/chatbot/files')) return 'chatbot_files'
  if (pathname.startsWith('/chatbot/knowledge/notice')) return 'knowledge_notice'
  if (pathname.startsWith('/chatbot/knowledge/faq')) return 'knowledge_faq'
  if (pathname.startsWith('/chatbot/knowledge/ai')) return 'knowledge_ai'
  if (pathname.startsWith('/chatbot/knowledge/dev')) return 'knowledge_dev'
  if (pathname.startsWith('/chatbot/knowledge')) return 'chatbot_knowledge'
  if (pathname.startsWith('/chatbot/tools')) return 'chatbot_tools'
  if (pathname.startsWith('/chatbot/realtime/guide')) return 'chatbot_realtime_guide'
  if (pathname.startsWith('/chatbot/realtime')) return 'chatbot_realtime'
  if (pathname.startsWith('/chatbot')) return 'chatbot_basic'
  return 'prototype'
}

function normalizeSectionId(sectionId: string | null | undefined): string {
  if (sectionId === 'challenge' || sectionId === 'study_diary') return 'study_diary'
  if (sectionId === 'task') return 'task_all'
  if (
    sectionId === 'knowledge_notice' ||
    sectionId === 'knowledge_faq' ||
    sectionId === 'knowledge_ai' ||
    sectionId === 'knowledge_dev'
  )
    return sectionId
  return sectionId ?? ''
}

function hasActiveSection(item: MenuItem, activeSection: string): boolean {
  return (
    normalizeSectionId(item.sectionId) === activeSection ||
    item.children.some((child) => hasActiveSection(child, activeSection))
  )
}

function getIcon(iconName: string | null): ElementType {
  if (!iconName) return LucideIcons.FileText
  const icons = LucideIcons as unknown as Record<string, ElementType>
  const Icon = icons[iconName]
  return Icon || LucideIcons.FileText
}

function MegaNavDropdown({
  item,
  activeSection,
  handleNavigation,
}: {
  item: MenuItem
  activeSection: string
  handleNavigation: (id: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const Icon = getIcon(item.icon)

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setIsOpen(false), 120)
  }

  const isActive = hasActiveSection(item, activeSection)

  // 가이드 항목(_guide suffix)과 메인 항목 분리
  const mainItems = item.children.filter((c) => !c.sectionId?.endsWith('_guide'))
  const guideItems = item.children.filter((c) => c.sectionId?.endsWith('_guide'))
  const isPaired = guideItems.length > 0

  return (
    <div className="relative" onMouseLeave={scheduleClose} onMouseEnter={cancelClose}>
      <HeaderPill
        icon={Icon}
        variant={isActive ? 'active' : 'default'}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => { cancelClose(); setIsOpen(true) }}
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
        <>
          {/* 투명 브릿지 */}
          <div className="absolute left-0 top-full z-50 h-2 w-full" />
          <div
            className="absolute left-0 top-full z-50 mt-2 origin-top-left animate-in zoom-in-95 rounded-xl border border-surface-border bg-surface-raised shadow-2xl duration-150 fade-in overflow-hidden"
          >
            {isPaired ? (
              /* 좌우 페어링 레이아웃 (챗봇) */
              <div className="grid p-2" style={{ gridTemplateColumns: '1fr 1px 1fr', minWidth: 360 }}>
                {/* 왼쪽: 메인 채팅 메뉴 */}
                <div className="flex flex-col gap-0.5 pr-2">
                  {mainItems.map((child) => {
                    const ChildIcon = getIcon(child.icon)
                    const isChildActive = hasActiveSection(child, activeSection)
                    return (
                      <button
                        key={child.id}
                        onClick={() => { if (child.sectionId) handleNavigation(child.sectionId); setIsOpen(false) }}
                        style={!isChildActive ? { color: 'var(--foreground)' } : undefined}
                        onMouseEnter={e => { if (!isChildActive) { (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--foreground) 7%, transparent)' } }}
                        onMouseLeave={e => { if (!isChildActive) { (e.currentTarget as HTMLButtonElement).style.background = '' } }}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                          isChildActive ? 'bg-brand-glass text-brand-primary' : ''
                        }`}
                      >
                        <ChildIcon className={`size-3.5 shrink-0 ${isChildActive ? 'text-brand-primary' : ''}`} />
                        <span className="truncate">{child.name}</span>
                        {isChildActive && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-brand-primary" />}
                      </button>
                    )
                  })}
                </div>

                {/* 구분선 */}
                <div className="bg-surface-border mx-1" />

                {/* 오른쪽: 가이드 메뉴 */}
                <div className="flex flex-col gap-0.5 pl-2">
                  {guideItems.map((guide) => {
                    const GuideIcon = getIcon(guide.icon)
                    const isGuideActive = normalizeSectionId(guide.sectionId) === activeSection
                    return (
                      <button
                        key={guide.id}
                        onClick={() => { if (guide.sectionId) handleNavigation(guide.sectionId); setIsOpen(false) }}
                        style={!isGuideActive ? { color: 'var(--foreground)' } : undefined}
                        onMouseEnter={e => { if (!isGuideActive) { (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--primary) 10%, transparent)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)' } }}
                        onMouseLeave={e => { if (!isGuideActive) { (e.currentTarget as HTMLButtonElement).style.background = ''; (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)' } }}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                          isGuideActive ? 'bg-brand-glass text-brand-primary' : ''
                        }`}
                      >
                        <GuideIcon className="size-3.5 shrink-0 text-brand-primary opacity-70" />
                        <span className="truncate">{guide.name}</span>
                        <LucideIcons.ArrowUpRight className="ml-auto size-3 shrink-0 opacity-40" />
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* 일반 단일 컬럼 */
              <div className="flex flex-col gap-0.5 p-2" style={{ minWidth: 160 }}>
                {item.children.map((child) => {
                  const ChildIcon = getIcon(child.icon)
                  const isChildActive = hasActiveSection(child, activeSection)
                  return (
                    <button
                      key={child.id}
                      onClick={() => { if (child.sectionId) handleNavigation(child.sectionId); setIsOpen(false) }}
                      style={!isChildActive ? { color: 'var(--foreground)' } : undefined}
                      onMouseEnter={e => { if (!isChildActive) { (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--foreground) 7%, transparent)' } }}
                      onMouseLeave={e => { if (!isChildActive) { (e.currentTarget as HTMLButtonElement).style.background = '' } }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                        isChildActive ? 'bg-brand-glass text-brand-primary' : ''
                      }`}
                    >
                      <ChildIcon className={`size-3.5 shrink-0 ${isChildActive ? 'text-brand-primary' : ''}`} />
                      <span className="truncate">{child.name}</span>
                      {isChildActive && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-brand-primary" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
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
    <header className="sticky top-0 z-[100] w-full border-b border-surface-border bg-surface-muted px-2 py-2 shadow-md backdrop-blur-md sm:px-4 sm:py-3">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <button
          type="button"
          className="shrink-0 text-left transition-transform hover:scale-[1.02] active:scale-[0.98]"
          onClick={() => navigate({ to: '/' })}
          aria-label="홈으로 이동"
          title="Towercrane Prototype Console"
        >
          <div className="flex items-center">
            <div className="flex size-8 items-center justify-center rounded-sm bg-primary text-primary-foreground shadow-md shadow-primary/10">
              <span className="text-[13px] font-black tracking-tighter">TC</span>
            </div>
          </div>
        </button>

        <nav className="hidden min-w-0 flex-1 flex-wrap items-center justify-center gap-1.5 lg:flex">
          {menuTree.map((item) => {
            if (item.children && item.children.length > 0) {
              return (
                <MegaNavDropdown
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
                labelClassName="max-w-12 truncate text-[12px] sm:max-w-none sm:text-[13px]"
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
