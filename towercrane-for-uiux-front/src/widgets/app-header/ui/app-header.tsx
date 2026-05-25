import { type ElementType, useMemo, useRef, useState } from 'react'
import { MiniFlow } from './chatbot-mini-flows'
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
    chatbot_basic_guide: '/chatbot/guide',
    chatbot_streaming_guide: '/chatbot/streaming/guide',
    chatbot_history_guide: '/chatbot/history/guide',
    chatbot_files_guide: '/chatbot/files/guide',
    chatbot_knowledge_guide: '/chatbot/knowledge/guide',
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
  if (pathname.startsWith('/chatbot/knowledge')) return 'knowledge_channel'
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

function getIcon(iconName: string | null): ElementType {
  if (!iconName) return LucideIcons.FileText
  const icons = LucideIcons as unknown as Record<string, ElementType>
  const Icon = icons[iconName]
  return Icon || LucideIcons.FileText
}

const SECTION_META: Record<string, { description: string; badge?: string }> = {
  chatbot_basic: {
    description: 'GPT 기반 기본 채팅 인터페이스입니다. 간단한 질문·답변을 테스트해볼 수 있습니다.',
    badge: 'GPT-4o',
  },
  chatbot_streaming: {
    description: '토큰이 생성되는 즉시 화면에 출력되는 스트리밍 응답을 체험할 수 있습니다.',
    badge: 'SSE',
  },
  chatbot_history: {
    description: '세션별 대화 기록을 저장하고 불러옵니다. 히스토리 관리 흐름을 확인하세요.',
    badge: 'History',
  },
  chatbot_files: {
    description: '이미지·문서 파일을 첨부해 GPT-4o Vision으로 분석하는 멀티모달 채팅입니다.',
    badge: 'Vision',
  },
  chatbot_flow: {
    description: 'React Flow로 대화 흐름과 분기 로직을 노드·엣지로 시각화합니다.',
    badge: 'Flow',
  },
  chatbot_basic_guide: {
    description: 'GPT-4o-mini 호출부터 Markdown 렌더링까지 기본 채팅의 내부 프로세스를 React Flow로 설명합니다.',
    badge: 'Guide',
  },
  chatbot_streaming_guide: {
    description: 'SSE 연결 수립 → 토큰 청크 수신 → 실시간 렌더링까지 스트리밍 흐름을 시각화합니다.',
    badge: 'Guide',
  },
  chatbot_history_guide: {
    description: '세션 생성 · 메시지 DB 저장 · 히스토리 복원 전체 흐름을 React Flow로 설명합니다.',
    badge: 'Guide',
  },
  chatbot_files_guide: {
    description: 'S3 업로드 → GPT-4o Vision 멀티모달 분석 파이프라인을 시각화합니다.',
    badge: 'Guide',
  },
  chatbot_knowledge_guide: {
    description: '임베딩 → 벡터 검색 → RAG 기반 GPT 답변 생성 전체 흐름을 React Flow로 설명합니다.',
    badge: 'Guide',
  },
  chatbot_knowledge: {
    description: '사내 공지·FAQ 문서를 벡터 검색해 RAG 방식으로 답변을 생성합니다.',
    badge: 'RAG',
  },
  knowledge_channel: {
    description: '사내 공지·FAQ 문서를 벡터 검색해 RAG 방식으로 답변을 생성합니다.',
    badge: 'RAG',
  },
  knowledge_notice: {
    description: '공지사항 문서만을 범위로 지정해 질문할 수 있습니다.',
  },
  knowledge_faq: {
    description: 'FAQ 문서만을 범위로 지정해 자주 묻는 질문에 답변합니다.',
  },
  knowledge_ai: {
    description: 'AI 관련 사내 자료를 검색해 답변합니다.',
  },
  knowledge_dev: {
    description: '개발 관련 사내 자료를 검색해 답변합니다.',
  },
  ai_service_group: {
    description: 'AI Chatbot, LLM API 등 AI 서비스 사용 권한을 신청하고 승인 흐름을 확인합니다.',
    badge: 'NEW',
  },
  ai_service_request: {
    description: 'AI 서비스 사용 신청서를 작성하고 4단계 승인 흐름을 진행합니다.',
  },
  ai_service_my: {
    description: '내가 신청한 AI 서비스 목록과 현재 승인 진행 상태를 확인합니다.',
  },
  ai_service_admin: {
    description: '관리자용: 전체 신청 목록을 조회하고 승인·반려 처리합니다.',
  },
  ai_service_monitor: {
    description: '관리자용: API 사용량·비용·에러율을 실시간으로 모니터링합니다.',
  },
  sql: {
    description: 'SQL 학습 문제를 풀고 실력을 점검할 수 있습니다.',
  },
  sql_personal: {
    description: '개인 SQL 문제 풀이 현황을 확인합니다.',
  },
  sql_team: {
    description: '팀 전체의 SQL 학습 현황을 비교·분석합니다.',
  },
  sql_examples: {
    description: '예제 쿼리를 보며 SQL 패턴을 학습합니다.',
  },
  boards: {
    description: '공지·문의·QnA·자유 게시판을 통해 소통합니다.',
  },
  board_notice: { description: '팀 공지사항을 확인합니다.' },
  board_inquiry: { description: '관리자에게 문의를 남깁니다.' },
  board_qna: { description: 'Q&A를 통해 궁금한 점을 해결합니다.' },
  board_free: { description: '자유롭게 글을 남기는 게시판입니다.' },
  task_all: { description: '전체 태스크 목록을 조회하고 관리합니다.' },
  task_my: { description: '나에게 할당된 태스크만 필터링해 확인합니다.' },
  task_issues: { description: '이슈 트래커에서 버그·개선사항을 관리합니다.' },
  project_issues: { description: '프로젝트별 이슈를 모아 볼 수 있습니다.' },
  users: { description: '사용자 계정과 권한을 관리합니다.' },
  menu_admin: { description: '헤더 메뉴 구조를 수정합니다.' },
  readme_admin: { description: '온보딩 문서를 편집합니다.' },
  admin_board_configs: { description: '게시판 설정을 관리합니다.' },
  admin_boards: { description: '게시판 목록을 관리합니다.' },
  chatbot_monitoring: { description: '챗봇 질문 횟수와 사용자별 사용 현황을 확인합니다.' },
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
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const Icon = getIcon(item.icon)

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setIsOpen(false), 120)
  }

  const isActive =
    item.children.some((child) => normalizeSectionId(child.sectionId) === activeSection) ||
    normalizeSectionId(item.sectionId) === activeSection

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
                    const isChildActive = normalizeSectionId(child.sectionId) === activeSection
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
                  const isChildActive = normalizeSectionId(child.sectionId) === activeSection
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
