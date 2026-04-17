import { Bot, FileText, GitBranch, UserCog } from 'lucide-react'
import { useEffect } from 'react'
import { useCurrentUser } from '../shared/api/auth'
import { useUsersList } from '../shared/api/users'
import { WorkbenchPage } from '../pages/workbench/ui/workbench-page'
import { DocuPage } from '../pages/docu/ui/docu-page'
import { IntroView } from '../pages/intro/ui/intro-view'
import { ReadmePage } from '../pages/readme/ui/readme-page'
import { useSessionStore } from '../shared/store/session-store'
import { Button } from '../shared/ui/button'
import { Card } from '../shared/ui/card'
import { useUiStore } from '../shared/store/ui-store'
import { AppHeader } from '../widgets/app-header/ui/app-header'

export function AppRoot() {
  const activeSection = useUiStore((state) => state.activeSection)
  const setActiveSection = useUiStore((state) => state.setActiveSection)
  const themeColor = useUiStore((state) => state.themeColor)
  const hasHydrated = useSessionStore((state) => state.hasHydrated)
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const token = useSessionStore((state) => state.token)
  const syncUser = useSessionStore((state) => state.syncUser)
  const clearSession = useSessionStore((state) => state.clearSession)
  const currentUserQuery = useCurrentUser(hasHydrated && token.length > 0)
  const usersListQuery = useUsersList()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeColor)
  }, [themeColor])

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

  if (!hasHydrated) {
    return null
  }

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
      return isAuthenticated ? (
        <WorkbenchPage />
      ) : (
        <IntroView projectPurposeCards={projectPurposeCards} />
      )
    }

    if (activeSection === 'docu') {
      return <DocuPage />
    }

    if (activeSection === 'chatbot') {
      return (
        <Card className="rounded-[28px] p-6">
          <div className="flex items-start gap-4">
            <div className="ui-icon-button-brand rounded-2xl p-3 shrink-0">
              <Bot className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm leading-6 ui-text-secondary">
                프로토타입 정리 흐름이 안정화되면 카테고리 추천, 태그 정리, 비교 질문을 붙이는 보조 기능으로 확장합니다.
              </p>
            </div>
          </div>
        </Card>
      )
    }

    if (activeSection === 'readme') {
      return <ReadmePage />
    }

    if (activeSection === 'users') {
      const users = usersListQuery.data || []

      return (
        <Card className="rounded-[28px] p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="ui-icon-button-brand rounded-2xl p-3">
                <UserCog className="size-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold ui-text-primary">유저 관리</h2>
                <p className="text-sm ui-text-secondary">시스템 사용자 권한 및 계정을 관리합니다.</p>
              </div>
            </div>
            <div className="text-xs ui-text-muted uppercase tracking-widest font-medium">
              Total {users.length} Users
            </div>
          </div>

          <div className="ui-panel-soft overflow-hidden rounded-3xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="ui-panel-soft border-b">
                  <th className="px-6 py-4 text-[11px] font-bold ui-text-secondary uppercase tracking-widest">Name</th>
                  <th className="px-6 py-4 text-[11px] font-bold ui-text-secondary uppercase tracking-widest">Email</th>
                  <th className="px-6 py-4 text-[11px] font-bold ui-text-secondary uppercase tracking-widest">Role</th>
                  <th className="px-6 py-4 text-[11px] font-bold ui-text-secondary uppercase tracking-widest">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-border-soft)]">
                {usersListQuery.isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center ui-text-muted">Loading users...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center ui-text-muted">No users found.</td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-[var(--surface-muted)]">
                      <td className="px-6 py-4 text-sm font-medium ui-text-primary">{u.name}</td>
                      <td className="px-6 py-4 text-sm ui-text-secondary">{u.email}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            u.role === 'admin'
                              ? 'border-brand-border bg-brand-glass text-brand-primary'
                              : 'border-[var(--surface-border-soft)] bg-[var(--surface-muted)] ui-text-secondary'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm ui-text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
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
            <div className="ui-icon-button-brand rounded-2xl p-3">
              <FileText className="size-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold ui-text-primary">README 관리</h2>
              <p className="text-sm ui-text-secondary">프로젝트 문서 및 가이드를 관리합니다.</p>
            </div>
          </div>
          <div className="rounded-3xl border border-dashed border-[var(--surface-border-soft)] bg-[var(--surface-muted)] py-20 text-center">
            <p className="ui-text-muted">README 편집 기능이 곧 구현될 예정입니다.</p>
          </div>
        </Card>
      )
    }

    return (
      <Card className="rounded-[36px] p-7">
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight ui-text-primary">
          UI/UX Prototype Hub
        </h1>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={() => setActiveSection('prototype')}>
            <GitBranch className="mr-2 size-4" />
            Prototype 열기
          </Button>
          {!isAuthenticated ? (
            <span className="inline-flex items-center text-sm ui-text-secondary">
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
        <AppHeader />
        <main>{renderContent()}</main>
      </div>
    </div>
  )
}
