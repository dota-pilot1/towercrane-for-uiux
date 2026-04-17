import { useState } from 'react'
import { ChevronDown, FileText, LogOut, ShieldCheck, UserCog } from 'lucide-react'
import { InlineAuthBar } from '../../../features/auth/ui/inline-auth-bar'
import { useLogout } from '../../../shared/api/auth'
import { adminItems, navigationItems } from '../../../shared/config/navigation'
import { useSessionStore } from '../../../shared/store/session-store'
import { useUiStore } from '../../../shared/store/ui-store'
import { ThemeSwitcher } from '../../../shared/ui/theme-switcher'

export function AppHeader() {
  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const activeSection = useUiStore((state) => state.activeSection)
  const setActiveSection = useUiStore((state) => state.setActiveSection)
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const userEmail = useSessionStore((state) => state.userEmail)
  const userName = useSessionStore((state) => state.userName)
  const userRole = useSessionStore((state) => state.userRole)
  const clearSession = useSessionStore((state) => state.clearSession)
  const logoutMutation = useLogout()

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

  return (
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

          {userRole === 'admin' && (
            <div className="relative">
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
                <ChevronDown
                  className={`size-3 transition-transform duration-200 ${isAdminOpen ? 'rotate-180' : ''}`}
                />
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
                      {item.id === 'users' ? (
                        <UserCog className="size-3.5" />
                      ) : (
                        <FileText className="size-3.5" />
                      )}
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="flex items-center justify-end gap-3 shrink-0">
          <ThemeSwitcher />
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-2">
                {userRole === 'admin' && (
                  <div
                    className="flex size-[34px] items-center justify-center rounded-full border border-brand-border bg-brand-glass text-brand-primary"
                    title="시스템 관리자"
                  >
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
  )
}
