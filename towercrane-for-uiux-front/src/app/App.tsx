import { Bot, BookOpenText, GitBranch, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useCurrentUser, useLogout } from '../shared/api/auth'
import { useUsersList } from '../shared/api/users'
import { InlineAuthBar } from '../features/auth/ui/inline-auth-bar'
import { WorkbenchPage } from '../pages/workbench/ui/workbench-page'
import { DocuPage } from '../pages/docu/ui/docu-page'
import { IntroView } from '../pages/intro/ui/intro-view'
import { adminItems, navigationItems } from '../shared/config/navigation'
import { useSessionStore } from '../shared/store/session-store'
import { Button } from '../shared/ui/button'
import { Card } from '../shared/ui/card'
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

  const usersListQuery = useUsersList()
  const projectPurposeCards = [
    {
      title: '프로토타입 공유',
      description: '실험 중인 UI와 패턴을 빠르게 모아 팀 단위로 공유합니다.',
    },
    {
      title: '개발 문서 공유',
      description: '의도, 구조, 구현 메모를 문서로 정리해 맥락을 남깁니다.',
    },
    {
      title: '개발 챌린지 개최',
      description: '시도와 해결 과정을 축적해 다음 작업의 기준점으로 씁니다.',
    },
    {
      title: '챗봇 응답 지원',
      description: '쌓인 문서와 패턴을 바탕으로 필요한 답을 더 빨리 찾습니다.',
    },
  ]

  const renderContent = () => {
    if (activeSection === 'prototype') {
      if (isAuthenticated) {
        return <WorkbenchPage />
      }

      return <IntroView projectPurposeCards={projectPurposeCards} />
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
              <p className="text-[10px] uppercase tracking-[0.2em] text-brand-primary/60 font-medium">
                towercrane
              </p>
              <p className="text-base font-bold ui-text-primary leading-none">FullStack</p>
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
                        ? 'border-brand-border bg-brand-glass ui-text-primary'
                        : 'border-[var(--surface-border)] bg-[var(--surface-muted)] ui-text-secondary hover:bg-[var(--surface-strong)]'
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
                          ? 'border-brand-border bg-brand-glass ui-text-primary'
                          : 'border-[var(--surface-border)] bg-[var(--surface-muted)] ui-text-secondary hover:bg-[var(--surface-strong)]'
                      }`}
                    >
                      <ShieldCheck className="size-3.5" />
                      <span className="hidden sm:inline">Admin</span>
                      <ChevronDown className={`size-3 transition-transform duration-200 ${isAdminOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isAdminOpen && (
                      <div className="absolute left-0 top-full mt-2 w-44 origin-top-left rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-strong)] p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200 z-50">
                        {adminItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              handleNavigation(item.id)
                              setIsAdminOpen(false)
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] ui-text-secondary hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] transition-colors text-left"
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
                    <span className="h-[34px] flex items-center rounded-full border border-[var(--surface-border)] bg-[var(--input-bg)] px-3.5 text-xs ui-text-primary">
                      {userName || userEmail}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex size-[34px] items-center justify-center rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] ui-text-secondary hover:bg-[var(--surface-strong)]"
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
