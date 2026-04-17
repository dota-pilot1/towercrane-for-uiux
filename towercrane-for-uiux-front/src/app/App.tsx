import { ArrowRight, Bot, BookOpenText, GitBranch, LogOut, Plus, FileText as FileTextIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useCurrentUser, useLogout } from '../shared/api/auth'
import { useUsersList } from '../shared/api/users'
import { InlineAuthBar } from '../features/auth/ui/inline-auth-bar'
import { WorkbenchPage } from '../pages/workbench/ui/workbench-page'
import { DocuPage } from '../pages/docu/ui/docu-page'
import { adminItems, navigationItems } from '../shared/config/navigation'
import { useSessionStore } from '../shared/store/session-store'
import { Button } from '../shared/ui/button'
import { Card } from '../shared/ui/card'
import { AddCategoryDialog } from '../features/category-management/ui/add-category-dialog'
import { ChevronDown, ShieldCheck, UserCog, FileText } from 'lucide-react'
import { useUiStore } from '../shared/store/ui-store'
import { ThemeSwitcher } from '../shared/ui/theme-switcher'

type AppSection = (typeof navigationItems)[number]['id'] | (typeof adminItems)[number]['id'] | 'docu'

export function AppRoot() {
  const activeSection = useUiStore((state) => state.activeSection)
  const setActiveSection = useUiStore((state) => state.setActiveSection)
  const activePrototypeId = useUiStore((state) => state.activePrototypeId)
  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const hasHydrated = useSessionStore((state) => state.hasHydrated)
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const token = useSessionStore((state) => state.token)
  const userEmail = useSessionStore((state) => state.userEmail)
  const userName = useSessionStore((state) => state.userName)
  const userRole = useSessionStore((state) => state.userRole)
  const themeColor = useUiStore((state) => state.themeColor)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeColor)
  }, [themeColor])

  if (!hasHydrated) {
    return null
  }
  const syncUser = useSessionStore((state) => state.syncUser)
  const clearSession = useSessionStore((state) => state.clearSession)
  const logoutMutation = useLogout()
  const currentUserQuery = useCurrentUser(hasHydrated && token.length > 0)

  useEffect(() => {
    if (currentUserQuery.data) {
      syncUser(currentUserQuery.data)
    }
  }, [currentUserQuery.data, syncUser])

  useEffect(() => {
    if (currentUserQuery.error) {
      clearSession()
    }
  }, [clearSession, currentUserQuery.error])

  const handleNavigation = (id: string) => {
    setActiveSection(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
    } finally {
      clearSession()
    }
    setActiveSection('prototype')
  }

  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(0)

  const mockCategories = [
    {
      id: 'fsd',
      title: 'FSD 아키텍처',
      summary: 'Feature-Sliced Design 아키텍처를 적용하여 복잡한 프런트엔드 애플리케이션의 유지보수성과 확장성을 극대화합니다.',
      tags: ['Layered', 'Sliced', 'Segments'],
      prototypes: [
        { id: 1, title: 'Shared UI 패턴 최적화', date: '2026-04-10', comment: '공통 컴포넌트의 추상화 수준을 조절하여 재사용성을 높인 실무 패턴입니다.', repo: 'https://github.com/towercrane/fsd-ui' },
        { id: 2, title: 'Feature 단위 데이터 흐름', date: '2026-04-12', comment: '데이터 페칭과 상태 관리를 특정 도메인 기능 내에 응집시키는 전략입니다.', repo: 'https://github.com/towercrane/fsd-features' },
      ]
    },
    {
      id: 'layout',
      title: '레이아웃 시스템',
      summary: '일관성 있는 레이아웃과 반응형 디자인을 위한 그리드, 플렉스 박스 시스템을 구축합니다.',
      tags: ['Grid', 'Responsive', 'Container'],
      prototypes: [
        { id: 3, title: '글라스모피즘 대시보드', date: '2026-04-15', comment: '현대적인 유리 질감의 패널과 조명을 활용한 프리미엄 대시보드 시안입니다.', repo: 'https://github.com/towercrane/glass-layout' },
      ]
    },
    {
      id: 'search',
      title: '검색 패턴',
      summary: '효율적인 데이터 탐색을 위한 자동 완성, 필터링, 그리고 검색 결과 시각화 패턴을 다룹니다.',
      tags: ['Search', 'Filter', 'Autocomplete'],
      prototypes: [
        { id: 4, title: '실시간 하이라이팅 필터', date: '2026-04-16', comment: '많은 양의 데이터 속에서 키워드를 실시간으로 찾아 강조해주는 효율적인 패턴입니다.', repo: 'https://github.com/towercrane/search-pattern' },
      ]
    }
  ]

  const currentCategory = mockCategories[selectedCategoryIdx]
  const usersListQuery = useUsersList()

  const renderContent = () => {
    if (activeSection === 'prototype') {
      if (isAuthenticated) {
        return <WorkbenchPage />
      }

      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <Card className="rounded-[28px] p-0 overflow-hidden">
            <div className="grid md:grid-cols-[240px_minmax(0,1fr)]">
              {/* Sidebar */}
              <div className="border-r border-white/5 bg-slate-950/20 p-5">
                <div className="flex items-center justify-between gap-3 text-emerald-200 mb-6 font-medium">
                  <div className="flex items-center gap-3">
                    <GitBranch className="size-4" />
                    <span className="text-sm tracking-wide">Categories</span>
                  </div>
                  <AddCategoryDialog>
                    <button className="size-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all">
                      <Plus className="size-4" />
                    </button>
                  </AddCategoryDialog>
                </div>
                <div className="space-y-1.5 font-medium">
                  {mockCategories.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedCategoryIdx(index)}
                      className={`w-full text-left rounded-[16px] border px-4 py-2.5 text-[13px] transition ${
                        selectedCategoryIdx === index
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-white'
                          : 'border-transparent bg-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Content */}
              <div className="p-6">
                <div className="flex items-center gap-3 text-slate-300 mb-6 font-medium">
                  <ArrowRight className="size-4 text-emerald-300" />
                  <span className="text-sm tracking-wide">Category Detail Information</span>
                </div>

                {/* Detail Card */}
                <div className="rounded-[24px] border border-white/5 bg-white/4 p-6 mb-8">
                  <h2 className="text-2xl font-bold text-white mb-3">{currentCategory.title}</h2>
                  <p className="text-sm leading-relaxed text-slate-400 mb-4">{currentCategory.summary}</p>
                  <div className="flex flex-wrap gap-2">
                    {currentCategory.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-slate-900 border border-white/5 text-[11px] text-slate-300 font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Prototypes List (Comment Format) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-emerald-300/80 uppercase tracking-widest">Prototypes</span>
                    <div className="h-px flex-1 bg-white/5"></div>
                  </div>
                  
                  {currentCategory.prototypes.map((proto) => (
                    <div key={proto.id} className="relative pl-6 border-l border-white/10 py-1 transition-all hover:border-emerald-500/30">
                      <div className="absolute left-[-5px] top-3 size-2 rounded-full bg-white/20 border border-slate-950"></div>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-white tracking-tight">{proto.title}</h3>
                            <span className="text-[10px] text-slate-500 uppercase">{proto.date}</span>
                          </div>
                          <p className="text-[13px] leading-relaxed text-slate-400">{proto.comment}</p>
                        </div>
                        <a 
                          href={proto.repo} 
                          target="_blank" 
                          rel="noreferrer"
                          className="shrink-0 p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all group"
                          title="View on GitHub"
                        >
                          <svg className="size-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/></svg>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )
    }

    if (activeSection === 'docu') {
      return <DocuPage />
    }

    if (activeSection === 'chatbot') {
      return (
        <Card className="rounded-[28px] p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-sky-200/10 bg-sky-300/10 p-3 text-sky-200">
              <Bot className="size-5" />
            </div>
        <Card className="rounded-[28px] p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-sky-200/10 bg-sky-300/10 p-3 text-sky-200 shrink-0">
              <Bot className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm leading-6 text-slate-300">
                프로토타입 정리 흐름이 안정화되면 카테고리 추천, 태그 정리, 비교 질문을 붙이는 보조 기능으로 확장합니다.
              </p>
            </div>
          </div>
        </Card>
          </div>
        </Card>
      )
    }

    if (activeSection === 'readme') {
      return (
        <Card className="rounded-[28px] p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-amber-200/10 bg-amber-300/10 p-3 text-amber-100">
              <BookOpenText className="size-5" />
            </div>
        <Card className="rounded-[28px] p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-amber-200/10 bg-amber-300/10 p-3 text-amber-100 shrink-0">
              <BookOpenText className="size-5" />
            </div>
            <div className="flex-1">
              <div className="grid gap-3 md:grid-cols-3">
                {['프로젝트 개요', '데이터 구조', '작업 규칙'].map((item) => (
                  <div
                    key={item}
                    className="rounded-[20px] border border-white/10 bg-white/4 p-4 text-sm text-slate-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
          </div>
        </Card>
      )
    }

    if (activeSection === 'users') {
      const users = usersListQuery.data || []
      
      return (
        <Card className="rounded-[28px] p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-emerald-200/10 bg-emerald-300/10 p-3 text-emerald-200">
                <UserCog className="size-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">유저 관리</h2>
                <p className="text-sm text-slate-400">시스템 사용자 권한 및 계정을 관리합니다.</p>
              </div>
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-widest font-medium">
              Total {users.length} Users
            </div>
          </div>
          
          <div className="overflow-hidden rounded-3xl border border-white/5 bg-white/2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/4">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Email</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Role</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {usersListQuery.isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center text-slate-500">Loading users...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center text-slate-500">No users found.</td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/4 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-white">{u.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">{u.email}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === 'admin' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-slate-500/10 text-slate-400 border border-white/5'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )
    }

    if (activeSection === 'readme_admin') {
      return (
        <Card className="rounded-[28px] p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="rounded-2xl border border-amber-200/10 bg-amber-300/10 p-3 text-amber-100">
              <FileText className="size-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">README 관리</h2>
              <p className="text-sm text-slate-400">프로젝트 문서 및 가이드를 관리합니다.</p>
            </div>
          </div>
          <div className="rounded-3xl border border-dashed border-white/5 bg-white/2 py-20 text-center">
            <p className="text-slate-500">README 편집 기능이 곧 구현될 예정입니다.</p>
          </div>
        </Card>
      )
    }

    return (
      <Card className="rounded-[36px] p-7">
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white">
          UI/UX Prototype Hub
        </h1>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={() => handleNavigation('prototype')}>
            <GitBranch className="mr-2 size-4" />
            Prototype 열기
          </Button>
          {!isAuthenticated ? (
            <span className="inline-flex items-center text-sm text-slate-400">
              로그인을 통해 원격 저장소와 연동할 수 있습니다.
            </span>
          ) : null}
        </div>
      </Card>
    )
  }

  return (
    <div className="min-h-screen px-4 py-3 sm:px-5 lg:px-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="glass-panel sticky top-3 z-30 mb-3 rounded-full px-5 py-2">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              className="text-left shrink-0"
              onClick={() => handleNavigation('prototype')}
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/60 font-medium">
                towercrane
              </p>
              <p className="text-base font-bold text-white leading-none">Front</p>
            </button>

            <nav className="flex items-center justify-center gap-1.5 flex-1 min-w-0">
              {navigationItems.map((item) => {
                const Icon = item.icon

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigation(item.id)}
                    className={`inline-flex h-[34px] items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition shrink-0 ${
                      activeSection === item.id
                        ? 'border-brand-border bg-brand-glass text-white'
                        : 'border-white/5 bg-white/4 text-slate-300 hover:bg-white/8'
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                )
              })}

              <div className="relative">
                {userRole === 'admin' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsAdminOpen(!isAdminOpen)}
                      onBlur={() => setTimeout(() => setIsAdminOpen(false), 200)}
                      className={`inline-flex h-[34px] items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition shrink-0 ${
                        activeSection === 'users' || activeSection === 'readme_admin'
                          ? 'border-brand-border bg-brand-glass text-white'
                          : 'border-white/5 bg-white/4 text-slate-300 hover:bg-white/8'
                      }`}
                    >
                      <ShieldCheck className="size-3.5" />
                      <span className="hidden sm:inline">Admin</span>
                      <ChevronDown className={`size-3 transition-transform duration-200 ${isAdminOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isAdminOpen && (
                      <div className="absolute left-0 top-full mt-2 w-44 origin-top-left rounded-2xl border border-white/10 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200 z-50">
                        {adminItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              handleNavigation(item.id)
                              setIsAdminOpen(false)
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-left"
                          >
                            {item.id === 'users' ? <UserCog className="size-3.5" /> : <FileText className="size-3.5" />}
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </nav>

            <div className="flex items-center justify-end gap-3 shrink-0">
              <ThemeSwitcher />
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2">
                    {userRole === 'admin' && (
                      <div className="flex size-[34px] items-center justify-center rounded-full border border-brand-border bg-brand-glass text-brand-primary" title="시스템 관리자">
                        <ShieldCheck className="size-4" />
                      </div>
                    )}
                    <span className="rounded-full border border-white/5 bg-slate-950/35 h-[34px] flex items-center px-3.5 text-xs text-slate-200">
                      {userName || userEmail}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="size-[34px] rounded-full border border-white/5 bg-white/4 flex items-center justify-center text-slate-300 hover:bg-white/10"
                    aria-label="로그아웃"
                    title="로그아웃"
                  >
                    <LogOut className="size-4" />
                  </button>
                </>
              ) : (
                <InlineAuthBar />
              )}
            </div>
          </div>
        </header>

        <main>
          {!hasHydrated ? null : renderContent()}
        </main>
      </div>
    </div>
  )
}
